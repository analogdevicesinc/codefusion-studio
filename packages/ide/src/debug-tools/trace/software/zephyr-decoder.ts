/**
 *
 * Copyright (c) 2026 Analog Devices, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Software event decoder component that implements SoCTraceComponent.
 *
 * Exposes software decoders (e.g., Zephyr STMESP) as first-class trace
 * components in the SoC trace routing network. All decoder inputs and
 * outputs are declared dynamically based on the decoders' signal topology.
 *
 * Input signals follow the pattern: "SWStimulusInput.<decoder-kind>"
 * Output signals are declared by each decoder: "TracePoints", "LOG", etc.
 *
 * Decoder inputs can be enabled independently and are exposed through
 * SoCTraceComponent connection metadata for routing.
 */

import * as fs from "fs";
import * as path from "path";

import { SocTraceEventSourceGroup } from "cfs-types";
import { logger } from "../../../utils/logger";
import { type TraceEvent } from "../trace-manager";
import { StpItem, StpItemType } from "../parsers/stp-parser";
import { ElfFileParser } from "cfs-lib";
import { DataResult } from "cfs-lib";
import {
  StmEspDemux,
  StmEspPacket,
} from "../parsers/zephyr/stmesp-demux";
import {
  decodeStmEspPacket,
  resolvePtrData,
  StringSource,
  formatPrintf,
} from "../parsers/zephyr/cbprintf-decoder";

export interface ZephyrTurboLogRecord {
  /** 16-bit source ID encoded in the packet. */
  sourceId: number;
  /** Optional argument passed to the log call (log1 only). */
  arg?: number;
  /** Timestamp from the STMESP packet. */
  timestamp: bigint;
  /** STPv2 major source that carried this packet. */
  majorSource: number;
  /** STPv2 channel that carried this packet. */
  channel: number;
}

export interface ZephyrDecoderInputPort {
  enabled: boolean;
  originSignal: string;
}
export interface ZephyrTraceArtifactFile {
  path?: string;
}
export interface ZephyrTraceArtifacts {
  elf: ZephyrTraceArtifactFile;
  kconfig: ZephyrTraceArtifactFile;
}

const SWEVENT = "Software Event";
export const SWEVENTS = `${SWEVENT}s`;
const ZEPHYR = "Zephyr";
const ZEPHYR_TP = "TracePoints";
const ZEPHYR_LOG = "LOG";
const INPUT_PORT = "InputPort";
const INPUT_PORT_TP = `${INPUT_PORT}.${ZEPHYR_TP}`;
const INPUT_PORT_LOG = `${INPUT_PORT}.${ZEPHYR_LOG}`;
const EVENT_SOURCE_SW_TP = `*.${SWEVENTS}.${ZEPHYR}.${ZEPHYR_TP}`;
const EVENT_SOURCE_SW_LOG = `*.${SWEVENTS}.${ZEPHYR}.${ZEPHYR_LOG}`;

const LOG_FRONTEND_STMESP_TP_CHAN_BASE = 0xff;
const LOG_FRONTEND_STMESP_TURBO_LOG_BASE = 0x8000;

const LOG_LEVEL: Record<number, string> = {
  0: "printk",
  1: "LOG_ERR",
  2: "LOG_WRN",
  3: "LOG_INF",
  4: "LOG_DBG",
};

/**
 * ZephyrDecoder implements the SoCTraceComponent interface for decoding Zephyr STMESP packets.
 * It supports decoding Zephyr TracePoints and LOG messages, including Turbo LOG and Non-Turbo LOG formats.
 * The decoder dynamically manages input ports and output signals based on the provided configuration files (ELF, KCONFIG).
 * It reconstructs STMESP packets during each decode call and then applies
 * Zephyr TP/LOG-specific interpretation.
 * The decoder also provides methods to obtain updated configuration values and source files, ensuring that the decoding process reflects the latest state of the system.
 * The ZephyrDecoder class is designed to be used in a SoC trace routing network, allowing for flexible integration with other components and decoders.
 * It exposes its event sources in a structured format, enabling easy identification and routing of decoded events.
 * The decoder handles various edge cases, such as missing or malformed configuration files, and provides informative warnings to assist in troubleshooting.
 * Overall, the ZephyrDecoder class serves as a robust and extensible solution for decoding Zephyr STMESP packets in a SoC trace environment.
 */
export class ZephyrDecoder {
  swComponentName: string;
  sourcesForStringDecoder: Map<string, StringSource> = new Map();
  // LOAD THIS ELEMENTS FROM KCONFIG.
  channelTPBase: number = LOG_FRONTEND_STMESP_TP_CHAN_BASE;
  channelTurboBase: number = LOG_FRONTEND_STMESP_TURBO_LOG_BASE;
  isFSC: boolean | undefined; // Full Self Contained Logging (FSC)

  /**
   * Input metadata indexed by local InputPort.* signal name.
   * `originSignal` terminates upstream topology traversal, while `enabled`
   * tracks whether decoding for that input is currently active.
   */
  public readonly inputPorts: Record<string, ZephyrDecoderInputPort> = {
    [INPUT_PORT_TP]: {
      enabled: false,
      originSignal: EVENT_SOURCE_SW_TP,
    },
    [INPUT_PORT_LOG]: {
      enabled: false,
      originSignal: EVENT_SOURCE_SW_LOG,
    },
  };

  constructor(swComponentName: string) {
    this.swComponentName = swComponentName;
  }

  /**
   * Decodes a turbo log packet into a ZephyrTurboLogRecord.
   * @param packet The STMESP packet to decode.
   * @returns A ZephyrTurboLogRecord containing the decoded information, or null if the packet is missing a timestamp.
   */
  private decodeTurboFormat(packet: StmEspPacket): ZephyrTurboLogRecord | null {
    // Extract source_id from startWord (lower 16 bits).
    // StmEspDemux normalizes turbo log0/log1 into a consistent packet shape
    // where startWord always carries source_id.
    // eslint-disable-next-line no-bitwise
    const sourceId = packet.startWord & 0xffff;

    // Determine the variant (log0 vs log1) based on payload size.
    // log0: no arguments → 0 payload bytes
    // log1: one argument → 4 payload bytes (uint32_t, little-endian)
    let arg: number | undefined;

    if (packet.payloadBytes.length === 0) {
      // log0: no argument
      arg = undefined;
    } else {
      // log1: one argument (little-endian uint32, zero-padded if fewer than 4 bytes
      // are present — STM data-width truncation can produce 1–3 byte payloads)
      const padded = new Uint8Array(4);
      padded.set(
        packet.payloadBytes.subarray(
          0,
          Math.min(4, packet.payloadBytes.length),
        ),
      );
      arg = new DataView(padded.buffer).getUint32(0, true);
    }

    if (packet.timestamp === undefined) {
      logger.error(
        "Turbo log packet is missing timestamp — skipping. This should not happen, as turbo log packets are expected to always have a timestamp.",
      );
      return null;
    }

    const record: ZephyrTurboLogRecord = {
      sourceId,
      arg,
      timestamp: packet.timestamp,
      majorSource: packet.majorSource,
      channel: packet.channel,
    };

    return record;
  }

  /**
   * Obtains updated KCONFIG values from the provided files map.
   * If a KCONFIG file is present, it reads the file and extracts the values for
   * CONFIG_LOG_FRONTEND_STMESP_TP_CHAN_BASE, CONFIG_LOG_FRONTEND_STMESP_TURBO_LOG_BASE,
   * and CONFIG_LOG_FRONTEND_STMESP_FSC. If the values are not found, it uses default values.
   * If no KCONFIG file is provided, it uses default values and logs a warning.
   * @param files Zephyr trace artifacts with optional file paths and fingerprints.
   * @returns A promise that resolves when the operation is complete.
   */
  private async obtainUpdatedKconfigValues(
    files: ZephyrTraceArtifacts,
  ): Promise<void> {
    const kconfigFilePath = files.kconfig.path;
    if (kconfigFilePath) {
      let data: string;
      try {
        data = await fs.promises.readFile(kconfigFilePath, "utf-8");
      } catch (err) {
        logger.warn(
          `Failed to read .config from ${kconfigFilePath}: ${err}. Using default channel base values.`,
        );
        this.channelTPBase = LOG_FRONTEND_STMESP_TP_CHAN_BASE;
        this.channelTurboBase = LOG_FRONTEND_STMESP_TURBO_LOG_BASE;
        this.isFSC = undefined;
        return;
      }

      if (data.includes("CONFIG_LOG_FRONTEND_STMESP_TP_CHAN_BASE")) {
        this.channelTPBase = parseInt(
          data.match(/CONFIG_LOG_FRONTEND_STMESP_TP_CHAN_BASE=(\d+)/)?.[1] ||
            `${LOG_FRONTEND_STMESP_TP_CHAN_BASE}`,
        );
      } else {
        logger.warn(
          "CONFIG_LOG_FRONTEND_STMESP_TP_CHAN_BASE not found in KCONFIG file. Using default value.",
        );
        this.channelTPBase = LOG_FRONTEND_STMESP_TP_CHAN_BASE;
      }

      if (data.includes("CONFIG_LOG_FRONTEND_STMESP_TURBO_LOG_BASE")) {
        this.channelTurboBase = parseInt(
          data.match(/CONFIG_LOG_FRONTEND_STMESP_TURBO_LOG_BASE=(\d+)/)?.[1] ||
            `${LOG_FRONTEND_STMESP_TURBO_LOG_BASE}`,
        );
      } else {
        logger.warn(
          "CONFIG_LOG_FRONTEND_STMESP_TURBO_LOG_BASE not found in KCONFIG file. Using default value.",
        );
        this.channelTurboBase = LOG_FRONTEND_STMESP_TURBO_LOG_BASE;
      }

      if (data.includes("CONFIG_LOG_FRONTEND_STMESP_FSC=y")) {
        this.isFSC = true;
      } else if (data.includes("CONFIG_LOG_FRONTEND_STMESP_FSC")) {
        this.isFSC = false;
      } else {
        logger.warn(
          "CONFIG_LOG_FRONTEND_STMESP_FSC not found in KCONFIG. Assuming non-FSC logging is used.",
        );
        this.isFSC = false;
      }
    } else {
      logger.warn(
        "No KCONFIG file provided. Using default channel base values. This may lead to incorrect decoding of Zephyr LOG and TracePoints.",
      );
      this.channelTPBase = LOG_FRONTEND_STMESP_TP_CHAN_BASE;
      this.channelTurboBase = LOG_FRONTEND_STMESP_TURBO_LOG_BASE;
      this.isFSC = undefined;
    }
  }

  /**
   * Decodes an array of STPv2 items into an array of TraceEvent objects.
   * Used for decoding Zephyr STMESP packets, including TracePoints and LOG messages.
   * LOG messages could be either Turbo LOG (log0/log1) or Non-Turbo LOG (full self-contained or non-FSC logging).
   * *  TracePoints are special channels that do not require FLAG closure and are handled separately from the demux/decoder
   *      logic and only returns an event with optional data.
   * *  Turbo LOG messages are handled by the decodeTurboFormat method. Usually are build with "String" + value. Besides the
   *      sourceId and the log level, the optional argument is also included in the event data.
   * *  Non-Turbo LOG messages are handled by the buildLOGMessage method. They could be full self-contained or non-FSC logging.
   *      these messages are build with the log level, source name and the decoded message. The source name is resolved from the
   *      sourceId using ELF symbols. If no source files are loaded, the source name will be displayed
   *      as "source id: <sourceId>". The message format is based on cbprintf format strings, which are decoded using the
   *      decodeStmEspPacket method. If no source files are loaded, the message will be displayed as "No ELF source loaded
   *      to resolve source name."
   *
   * @param stpItems
   * @returns An array of TraceEvent objects representing the decoded events.
   */
  async decode(
    stpItems: StpItem[],
    pathToExecutable: string | undefined,
  ): Promise<TraceEvent[]> {
    const events: TraceEvent[] = [];
    let skippedEventsWithoutTimestamp = 0;
    const demux = new StmEspDemux({
      immediatePacketStartChannel: (_majorSource: number, channel: number) =>
        channel >= this.channelTPBase,
    });

    if (!pathToExecutable) {
      logger.warn(
        `No path to executable provided. ELF-backed decode will be disabled for this call.`,
      );

      // Prevent stale decoder state from previous sessions when no executable
      // context is available for this decode pass.
      this.sourcesForStringDecoder.delete("ELF");
      this.channelTPBase = LOG_FRONTEND_STMESP_TP_CHAN_BASE;
      this.channelTurboBase = LOG_FRONTEND_STMESP_TURBO_LOG_BASE;
      this.isFSC = undefined;
    } else {
      // Refresh Zephyr KCONFIG-derived decode settings for this decode call.
      const files = await this.searchForKFile(pathToExecutable);
      await this.obtainUpdatedKconfigValues(files);

      // Best effort: initialize parser each decode call when an ELF path is available.
      const elfPath = files.elf.path;
      if (elfPath) {
        try {
          const parser: ElfFileParser = new ElfFileParser(elfPath);
          const res: DataResult = await parser.initialize();
          if (res !== DataResult.OK) {
            logger.warn(
              `Could not initialise elf parser. ${elfPath} does not contain valid ELF header. Disabling ELF-backed decode for this call.`,
            );
            this.sourcesForStringDecoder.delete("ELF");
          } else {
            this.sourcesForStringDecoder.set("ELF", parser.getDataModel());
          }
        } catch (e) {
          logger.warn(
            `ELF parser threw for ${elfPath}. Disabling ELF-backed decode for this call.`,
            e,
          );
          this.sourcesForStringDecoder.delete("ELF");
        }
      } else {
        this.sourcesForStringDecoder.delete("ELF");
      }
    }

    // Loop for each STPv2 item and process it based on its type and channel.
    for (const item of stpItems) {
      // Handle errors first to discard this type from the rest of the code
      if (item.type === StpItemType.Error) {
        // Error
        continue;
      }
      /* ++++++++++++++++++++++++++++++++++++++ ZEPHYR TRACEPOINTS ++++++++++++++++++++++++++++++++++++++*/
      // Process Zephyr TracePoints, if enabled.
      /* ++++++++++++++++++++++++++++++++++++++ Zephyr TP (TracePoints) ++++++++++++++++++++++++++++++++++++++*/
      // Process TP first, if enabled.
      // These are special channels that are not part of the STMESP packet stream and do not require FLAG closure.
      // They are handled separately from the demux/decoder logic.
      if (this.inputPorts[INPUT_PORT_TP]?.enabled) {
        if (
          (item.type === StpItemType.Data || item.type === StpItemType.Flag) &&
          item.channel >= this.channelTPBase &&
          item.channel < this.channelTurboBase
        ) {
          const tracePointIndex = item.channel - this.channelTPBase;
          const tracePointData =
            item.type === StpItemType.Data
              ? `Zephyr Tracepoint ${tracePointIndex} with value ${item.data}`
              : `Zephyr Tracepoint ${tracePointIndex}`;

          events.push({
            source: EVENT_SOURCE_SW_TP.slice(2),
            timestamp: Number(item.timestamp),
            data: tracePointData,
          });
          continue;
        }
      }

      /* ++++++++++++++++++++++++++++++++++++++ ZEPHYR LOG ++++++++++++++++++++++++++++++++++++++*/
      // Process Zephyr LOG, if enabled.
      if (this.inputPorts[INPUT_PORT_LOG]?.enabled) {
        const isDataOrFlag =
          item.type === StpItemType.Data || item.type === StpItemType.Flag;
        if (!isDataOrFlag) {
          // LOG decoding only consumes DATA and FLAG items.
          continue;
        }

        // Discard channels in [channelTPBase, channelTurboBase): they belong to
        // Zephyr TracePoints and are not decoded by the LOG path.
        if (
          item.channel >= this.channelTPBase &&
          item.channel < this.channelTurboBase
        ) {
          continue;
        }

        /* ++++++++++++++++++++++++++++++++++++++ ZEPHYR TURBO LOG ++++++++++++++++++++++++++++++++++++++*/
        // These are channels under LOG_FRONTEND_STMESP_TURBO_CHAN_BASE
        // that are part of the STMESP packet stream and do not require FLAG closure.
        if (
          item.type === StpItemType.Data &&
          item.channel >= this.channelTurboBase
        ) {
          // Turbo logs are (TURBO 0(no params)) DATA(marked + TS) or (TURBO 1(content of param <= INT_MAX)) DATA(Marked) + DATA(unmarked + TS)
          const demuxResult = demux.feed(item);
          if (demuxResult === null) continue;

          const decodedResult = this.decodeTurboFormat(demuxResult);
          if (decodedResult === null) {
            skippedEventsWithoutTimestamp++;
            continue;
          }
          // Turbo log: sourceId + optional argument(s), no format string
          events.push({
            source: EVENT_SOURCE_SW_LOG.slice(2),
            timestamp: Number(decodedResult.timestamp),
            data: this.buildTurboLogMessage(decodedResult),
          });
          continue;
        }

        /* ++++++++++++++++++++++++++++++++++++++ ZEPHYR NON TURBO LOG ++++++++++++++++++++++++++++++++++++++*/
        // ZEPHYR LOG: Full Self Contained or non-FSC logging. These are channels below LOG_FRONTEND_STMESP_TP_CHAN_BASE.
        // Those are part of the STMESP packet stream and require FLAG closure.
        if (item.channel < this.channelTPBase) {
          // Regular logs are (DATA(marked + TS) + DATA(unmarked + payload) + FLAG(marked))
          const demuxResult = demux.feed(item);
          if (demuxResult === null) continue;

          // Timestamps are in raw TS ticks; convert to number.
          // For a 50MHz TS clock we should be fine for about 5.7 years,
          // but log a warning just in case.
          const ts = demuxResult.timestamp;
          if (ts === undefined) {
            skippedEventsWithoutTimestamp++;
            continue;
          }
          if (ts > BigInt(Number.MAX_SAFE_INTEGER)) {
            logger.warn(
              "STP timestamp exceeds MAX_SAFE_INTEGER, precision may be lost:",
              ts,
            );
            skippedEventsWithoutTimestamp++;
            continue;
          }

          const message =
            this.isFSC === undefined
              ? "Event not decoded. No KCONFIG file provided"
              : this.isFSC
                ? this.buildFSCMessage(demuxResult)
                : this.buildLOGMessage(demuxResult);
          events.push({
            source: EVENT_SOURCE_SW_LOG.slice(2),
            timestamp: Number(ts),
            data: message,
          });
        }
      }
    }

    if (skippedEventsWithoutTimestamp > 0) {
      logger.warn(
        `Removed ${skippedEventsWithoutTimestamp} event(s) with missing/invalid timestamp (includes standard log and turbo log packets). If you are using CONFIG_LOG_FRONTEND_STMESP_FSC=y, enable CONFIG_LOG_FRONTEND_STMESP_MSG_END_TIMESTAMP to include timestamps in all log messages.`,
      );
    }

    return events;
  }

  /**
   * Searches for the ELF and its associated files( Kconfig) in the filesystem.
   * This Zephyr-specific lookup only probes known canonical locations.
   * @param executablePath The path to the ELF executable.
   * @returns A promise that resolves to Zephyr trace artifacts with best-effort file metadata.
   */
  private async searchForKFile(
    executablePath: string,
  ): Promise<ZephyrTraceArtifacts> {
    const files: ZephyrTraceArtifacts = {
      elf: {},
      kconfig: {},
    };

    files.elf = {
      path: executablePath,
    };

    const buildDir = path.dirname(executablePath);

    // Zephyr-specific best effort: probe only the known, canonical sidecar path.
    const kconfigPath = path.join(buildDir, ".config");
    try {
      files.kconfig = {
        path: kconfigPath,
      };
    } catch {
      // Missing sidecar is expected in best-effort mode.
    }

    return files;
  }
  /**
   * Resolves the source name from the given source ID using the provided string decoder.
   * @param sourceId
   * @param stringDecoder
   * @returns The resolved source name string, or a fallback string indicating the source ID if not found.
   */
  private getSourceNameFromSourceId(
    sourceId: number,
    stringDecoder: StringSource,
  ): string | null {
    const sourceName = resolvePtrData(
      sourceId,
      stringDecoder,
      "log_const_area",
      8, // bytes per entry in the log_const_area, struct log_source_const_data is 8 bytes on 32-bit systems.
    );
    if (!sourceName) {
      return `source id: ${sourceId}`;
    } else {
      return sourceName;
    }
  }

  /**
   * Formats a log line with the given log level, source name, and message body.
   * @param levelStr The log level string (e.g., "LOG_ERR", "LOG_INF").
   * @param sourceName The source name string, or null if not available.
   * @param body The message body string.
   * @returns The formatted log line string.
   */
  private formatLogLine(
    levelStr: string,
    sourceName: string | null,
    body: string,
  ): string {
    return sourceName !== null
      ? `[${levelStr}] ${sourceName}: ${body}`
      : `[${levelStr}] ${body}`;
  }

  /**
   * Builds a Turbo LOG message string from a decoded ZephyrTurboLogRecord.
   * @param decodedResult The decoded ZephyrTurboLogRecord containing the source ID,
   *         optional argument, timestamp, major source, and channel.
   * @returns The formatted Turbo LOG message string.
   */
  private buildTurboLogMessage(decodedResult: ZephyrTurboLogRecord): string {
    const stringDecoder = this.sourcesForStringDecoder.get("ELF");
    if (!stringDecoder) {
      return `source id: ${decodedResult.sourceId}: No ELF source loaded to resolve source name.`;
    }

    const arrayPosition = decodedResult.channel - this.channelTurboBase;
    const recoveredString = resolvePtrData(
      arrayPosition,
      stringDecoder,
      "log_stmesp_ptr_area",
      4, // bytes per entry in the log_stmesp_ptr_area, only pointer to the string.
    );

    if (!recoveredString) {
      return `source id: ${decodedResult.sourceId}: Turbo format string could not be resolved from ELF.`;
    }

    /* eslint-disable-next-line no-bitwise */
    const logLevelInt = recoveredString.charCodeAt(0) & 0x7;
    const levelStr = LOG_LEVEL[logLevelInt] ?? `UNKNOWN(${logLevelInt})`;

    // Remove the first character (log level) from the recovered string before formatting and
    // adding the argument if present.
    const args = decodedResult.arg !== undefined ? [decodedResult.arg] : [];
    const decodedString = formatPrintf(recoveredString.slice(1), args);

    const sourceName =
      logLevelInt !== 0
        ? this.getSourceNameFromSourceId(decodedResult.sourceId, stringDecoder)
        : null;
    return this.formatLogLine(levelStr, sourceName, decodedString);
  }

  /**
   * Builds a Full Self Contained (FSC) LOG message string from a demuxed STM ESP packet.
   * The FSC format is used in Zephyr 4.4 and later, where the log message is fully contained within the packet.
   * @param demuxResult The demuxed STM ESP packet containing the FSC log message.
   * @returns The formatted FSC LOG message string.
   */
  private buildFSCMessage(demuxResult: StmEspPacket): string {
    // FSC startWord bit layout (log_frontend_stmesp_demux_log_header):
    //  Current implementation of Zephyr 4.4
    //   [2:0]  major (3 bits)
    //   [5:3]  level (3 bits)
    //   [21:6] total_len (16 bits)
    //   [31:22] package_len (10 bits)
    //   Next zephyr implementation will use the total_len field. and total lenth will be reduce by 1.
    //   [20:6] total_len (15 bits)
    //   [30:21] package_len (10 bits)
    //   [31]   has_data (1 bit)

    // eslint-disable-next-line no-bitwise
    const logLevelInt = (demuxResult.startWord >>> 3) & 0x7;
    const levelStr = LOG_LEVEL[logLevelInt] ?? `UNKNOWN(${logLevelInt})`;

    let sourceName: string | null = null;
    if (logLevelInt !== 0) {
      // eslint-disable-next-line no-bitwise
      const packageLen = (demuxResult.startWord >>> 22) & 0x3ff;
      const nameBytes = demuxResult.payloadBytes.subarray(packageLen);
      const nulIdx = nameBytes.indexOf(0);
      const recoveredSourceName = Buffer.from(
        nulIdx === -1 ? nameBytes : nameBytes.subarray(0, nulIdx),
      ).toString("utf-8");
      sourceName = recoveredSourceName || `source id: ${demuxResult.startWord}`;
    }

    const message =
      decodeStmEspPacket(demuxResult, undefined) ??
      ` The decoded string is empty or could not be resolved.`;
    return this.formatLogLine(levelStr, sourceName, message);
  }

  /**
   * Builds a LOG message string from a demuxed STM ESP  packet.
   * @param demuxResult The demuxed STM ESP packet.
   * @returns The formatted LOG message string.
   */
  private buildLOGMessage(demuxResult: StmEspPacket): string {
    // Extract level and sourceId from startWord (stm_log_dict_msg_desc bitfields):
    //   [29:18] source_id (12 bits)
    /* eslint-disable no-bitwise */
    const logLevelInt = (demuxResult.startWord >>> 3) & 0x7;
    const sourceId = (demuxResult.startWord >>> 18) & 0xfff;
    /* eslint-enable no-bitwise */

    const stringDecoder = this.sourcesForStringDecoder.get("ELF");
    if (!stringDecoder) {
      return `Event not decoded. No source file(s)(ELF) loaded to resolve source name.`;
    }

    const levelStr = LOG_LEVEL[logLevelInt] ?? `UNKNOWN(${logLevelInt})`;
    const message =
      decodeStmEspPacket(demuxResult, stringDecoder) ??
      ` The decoded string is empty or could not be resolved.`;

    const sourceName =
      logLevelInt !== 0
        ? this.getSourceNameFromSourceId(sourceId, stringDecoder)
        : null;
    return this.formatLogLine(levelStr, sourceName, message);
  }

  /**
   * Returns the event sources for the ZephyrDecoder component.
   * The event sources are organized in a SocTraceEventSourceGroup object,
   * which maps the ZephyrDecoder's software component name to its input ports and their corresponding signal names.
   * @returns A SocTraceEventSourceGroup object containing the event sources for the ZephyrDecoder component.
   */
  getEventSources(): SocTraceEventSourceGroup {
    return {
      [ZEPHYR]: {
        [ZEPHYR_TP]: { Signal: `${this.swComponentName}.${INPUT_PORT_TP}` },
        [ZEPHYR_LOG]: {
          Signal: `${this.swComponentName}.${INPUT_PORT_LOG}`,
        },
      },
    };
  }
}
