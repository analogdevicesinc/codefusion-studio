/**
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
 * Zephyr STMESP packet demultiplexer (STPv2 layer).
 *
 * This module implements the packet reconstruction logic of Zephyr's
 * for the STMESP (STM ESP) framing protocol. STMESP is Zephyr's specific
 * use of STPv2 to package embedded logging data.
 *
 * It reconstructs raw STMESP packets from STPv2 items (marked DATA +
 * payload words + FLAG closure) or (marked DATA with TS) or marked DATA without TS +
 * marked DATA with TS) but never interprets the payload content.
 *
 * Design rationale:
 *
 *   Separation of concerns: framing vs. interpretation
 *
 *   STMESP is strictly tied to Zephyr's logging infrastructure. This module
 *   handles only the transport layer (marked → payload → flag)
 *
 *   - Zephyr logging uses STMESP framing (this file handles it)
 *
 * Architecture:
 *
 *   ATB stream
 *    ↓
 *   STPv2 Decoder (parseSTP in stp-parser.ts)
 *    ↓
 *   Zephyr-specific STMESP frame reassembly (this file)
 *
 */

import { StpItem, StpItemType } from "../stp-parser";
import { logger } from "../../../../utils/logger";

/**
 * Concatenate an array of Uint8Array chunks into a single Uint8Array.
 * @param chunks - Array of Uint8Array chunks to concatenate
 * @returns A single Uint8Array containing all the bytes from the input chunks
 */
function concatChunks(chunks: Uint8Array[]): Uint8Array {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Public interfaces
// ---------------------------------------------------------------------------

/**
 * A fully reassembled STMESP packet.
 *
 * The demux makes no assumptions about the semantics of startWord or
 * payloadWords.  Higher-level decoders are responsible for
 * interpreting those fields.
 *
 *   - startWord    ← first word written with STPv2 Marked flag set
 *                    (STM_D32 with marked=true)
 *   - payloadBytes ← all bytes from subsequent DATA items until FLAG,
 *                    each item unpacked LE according to its STPv2 byte width
 *   - timestamp    ← from the DMTS (Data with Marked and TimeStamp) opcode
 *                    or a following FLAGTS opcode in the STPv2 stream
 */
export interface StmEspPacket {
  /** STPv2 master (major) source that carried this packet. */
  majorSource: number;
  /** STPv2 channel that carried this packet. */
  channel: number;
  /**
   * Timestamp associated with the packet.  Taken from the STPv2
   * timestamp field of the marked DATA item (DMTS) that opened the
   * packet, updated by any subsequent timestamped item on the same
   * channel.
   */
  timestamp: bigint | undefined;
  /**
   * First data word of the packet — written with the STPv2 Marked flag
   * set (D32M / DxM opcode).
   */
  startWord: number;
  /**
   * Flat byte stream of all DATA items received after the marked word
   * and before the FLAG opcode.
   *
   * Each STPv2 DATA item is unpacked little-endian according to its
   * opcode byte width (4, 8, 16, 32 or 64 bits) so that higher-level
   * decoders can read the payload via a DataView without needing to
   * re-derive per-item widths.
   */
  payloadBytes: Uint8Array;
}

/** Optional behavior knobs for STMESP framing differences per producer. */
export interface StmEspDemuxOptions {
  /**
   * Channels matching this predicate are emitted immediately on marked DATA,
   * without waiting for FLAG closure. TURBO logX is an example of this behavior.
   */
  immediatePacketStartChannel?: (
    majorSource: number,
    channel: number,
  ) => boolean;
}

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

/** Per-(majorSource, channel) in-flight packet assembly state. */
interface InflightState {
  startWord: number;
  payloadChunks: Uint8Array[];
  /** Timestamp of the DMTS (marked) opcode, updated on later timestamps. */
  timestamp?: bigint;
}

/** Cached turbo source ID keyed by (majorSource, channel). */
interface TurboSourceState {
  sourceId: number;
}

// ---------------------------------------------------------------------------
// StmEspDemux
// ---------------------------------------------------------------------------

/**
 * Zephyr STMESP packet demultiplexer.
 *
 * Reconstructs STMESP packets from an STPv2 item stream.  Feed STPv2 items
 * one by one via {@link feed}; completed packets are returned as
 * `{ kind: "packet" }` results.
 *
 * This class implements Zephyr's STMESP framing protocol (marked DATA →
 * accumulate payload → FLAG close).  It does not know about Zephyr's
 * logging content format (cbprintf, turbo, etc.);
 * *
 */
export class StmEspDemux {
  /**
   * In-flight packet state, keyed by `${majorSource}:${channel}`.
   */
  private readonly inflight = new Map<string, InflightState>();
  private readonly turboSourceIds = new Map<string, TurboSourceState>();

  constructor(private readonly options: StmEspDemuxOptions = {}) {}

  /**
   * Discard all in-flight packet state.
   *
   * Call this at trace-session boundaries or whenever LOG decoding is
   * disabled so that stale per-channel state cannot contaminate the next
   * stream.  Without a reset, an interrupted packet whose DATA words were
   * already buffered would be silently prepended to the first new marked
   * DATA of the next session, producing a packet with the wrong header.
   */
  reset(): void {
    this.inflight.clear();
    this.turboSourceIds.clear();
  }

  /**
   * Feed one STPv2 item into the demultiplexer.
   *
   * Only DATA and FLAG items are meaningful for packet reconstruction.
   * All other item types (Error, Trigger) are consumed silently.
   *
   * @returns A completed packet, an error description, or null.
   */
  feed(item: StpItem): StmEspPacket | null {
    if (item.type === StpItemType.Data) {
      return this.handleData(item);
    }
    if (item.type === StpItemType.Flag) {
      return this.handleFlag(item);
    }
    return null;
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  /**
   * Handle a DATA item (marked or non-marked).
   *
   * Marked DATA → packet_start: opens a new packet for (major, channel).
   * Non-marked DATA → demux_data: appends a word to the open packet.
   *
   */
  private handleData(
    item: Extract<StpItem, { type: StpItemType.Data }>,
  ): StmEspPacket | null {
    const key = `${item.majorSource}:${item.channel}`;
    const dataWord = Number(BigInt.asUintN(32, BigInt(item.data)));

    if (item.marked) {
      const isImmediatePacketStart =
        this.options.immediatePacketStartChannel?.(
          item.majorSource,
          item.channel,
        ) ?? false;

      // Zephyr channels are emitted as complete packets on packet_start
      // and do not require FLAG closure.
      if (isImmediatePacketStart) {
        if (this.inflight.has(key)) {
          this.inflight.delete(key);
        }

        // Zephyr turbo log1 sends source_id first as a marked without
        // timestamp, then emits the argument as a marked with timestamp.
        // Cache the first word as sideband metadata instead of emitting it as
        // a standalone packet.
        if (item.timestamp === undefined) {
          this.turboSourceIds.set(key, {
            // eslint-disable-next-line no-bitwise
            sourceId: dataWord & 0xffff,
          });
          return null;
        }

        // Only consume cached source state for a 32-bits (D32) item — that is
        // the argument word of a log1 pair.  A 16-bits (D16) item is a complete
        // log0 packet and must not inherit a stale first-half source ID.
        const turboSourceState =
          item.bitWidth === 32 ? this.turboSourceIds.get(key) : undefined;
        const startWord = turboSourceState?.sourceId ?? dataWord;
        const payloadBytes =
          turboSourceState === undefined
            ? new Uint8Array(0)
            : new Uint8Array(item.toBuffer());
        if (item.bitWidth === 32) {
          this.turboSourceIds.delete(key);
        }

        // Completed Turbo package
        return {
          majorSource: item.majorSource,
          channel: item.channel,
          timestamp: item.timestamp,
          startWord,
          payloadBytes,
        };
      }

      // ── MSG_END_TIMESTAMP end-marker ────────────────────────────────────
      // When CONFIG_LOG_FRONTEND_STMESP_MSG_END_TIMESTAMP is enabled, packets
      // start with an unmarked DATA and end with a marked, timestamped D8
      // carrying value 0.  Detect that pattern and complete the in-flight
      // packet instead of discarding it.
      const state = this.inflight.get(key);
      if (
        state !== undefined &&
        dataWord === 0 &&
        item.bitWidth === 8 &&
        item.timestamp !== undefined
      ) {
        this.inflight.delete(key);
        return {
          majorSource: item.majorSource,
          channel: item.channel,
          timestamp: item.timestamp,
          startWord: state.startWord,
          payloadBytes: concatChunks(state.payloadChunks),
        };
      }

      // ── Packet start ─────────────────────────────────────────────────────
      if (state !== undefined) {
        // Discard the stale in-flight state (e.g. firmware restart mid-capture)
        // and start a fresh packet rather than throwing.
        logger.warn(
          `Marked DATA overwrote open packet: majorSource=${item.majorSource}, channel=${item.channel}`,
        );
        this.inflight.delete(key);
      }
      this.inflight.set(key, {
        startWord: dataWord,
        payloadChunks: [],
        timestamp: item.timestamp,
      });
      return null;
    }

    // ── Payload word ────────────────────
    const state = this.inflight.get(key);
    if (state === undefined) {
      const isImmediatePacketStart =
        this.options.immediatePacketStartChannel?.(
          item.majorSource,
          item.channel,
        ) ?? false;

      if (isImmediatePacketStart) {
        return null;
      }

      // Graceful-degradation path for mid-stream captures: a non-marked DATA
      // arrived with no prior marked DATA on this (major, channel).  This
      // happens when capture starts after the packet's marked opener was
      // already emitted (e.g. attaching mid-session or a firmware restart
      // without a trace sink reset).  We treat the first unmarked word as the
      // startWord so the stream can re-synchronize.  The resulting packet will
      // have an incorrect startWord, but that is preferable to silently
      // discarding all subsequent words on this channel.
      this.inflight.set(key, {
        startWord: dataWord,
        payloadChunks: [],
        timestamp: item.timestamp,
      });
      return null;
    }

    state.payloadChunks.push(new Uint8Array(item.toBuffer()));

    // Update the stored timestamp if this item carries one.
    // Corresponds to log_frontend_stmesp_demux_timestamp() in the C code,
    // which is called separately when the STP decoder separates the
    // timestamp from the data word.  Here both arrive together on the
    // StpDataItem.
    if (item.timestamp !== undefined) {
      state.timestamp = item.timestamp;
    }

    return null;
  }

  /**
   * Handle a FLAG item.
   *
   * Closes the in-flight packet for (major, channel) and returns it.
   *
   */
  private handleFlag(
    item: Extract<StpItem, { type: StpItemType.Flag }>,
  ): StmEspPacket | null {
    const key = `${item.majorSource}:${item.channel}`;
    const state = this.inflight.get(key);

    if (state === undefined) {
      // No inflight packet — either a stray FLAG (captured mid-stream) or the
      // expected trailing FLAG after a MSG_END_TIMESTAMP end-marker already
      // completed the packet.  Either way, nothing to emit.
      return null;
    }

    this.inflight.delete(key);
    const timestamp = item.timestamp ?? state.timestamp ?? undefined;

    const packet: StmEspPacket = {
      majorSource: item.majorSource,
      channel: item.channel,
      timestamp,
      startWord: state.startWord,
      payloadBytes: concatChunks(state.payloadChunks),
    };

    return packet;
  }
}
