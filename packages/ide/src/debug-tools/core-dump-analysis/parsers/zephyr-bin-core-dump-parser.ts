/**
 *
 * Copyright (c) 2025 Analog Devices, Inc.
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
 */

import { CoreDumpParser } from "./core-dump-parser";
import { CoreDumpInfo } from "../types";
import * as fs from "fs";

/**
 * Zephyr core dumps in flash are prefixed with a magic header and length.
 * This parser locates the magic header, extracts the valid core dump region,
 * and ignores any extra trailing or leading data in the bin file.
 * The parsed core dump replaces the original bin file on disk if a path is provided.
 */
export class ZephyrCoreDumpParser extends CoreDumpParser {
  private static readonly MAGIC = Buffer.from([0x43, 0x44, 0x01, 0x00]);
  private static readonly HEADER_SIZE = 8; // 4 bytes magic + 4 bytes length
  private static readonly ZE_MARKER = Buffer.from([0x5a, 0x45]); // ASCII 'ZE'

  /**
   * Parse the raw bin file buffer and optionally overwrite the bin file with the parsed core dump.
   * @param buffer The raw bin file buffer
   * @param binFilePath The path to the bin file to overwrite with the parsed content
   */
  parse(buffer: Buffer, binFilePath?: string): CoreDumpInfo {
    const magicOffset = buffer.indexOf(ZephyrCoreDumpParser.MAGIC);
    if (magicOffset === -1) {
      const zeOffset = buffer.indexOf(ZephyrCoreDumpParser.ZE_MARKER);
      if (zeOffset !== -1) {
        return {
          summary:
            "Bin file appears to already be parsed (no Zephyr magic header, found 'ZE' marker).",
          details: {
            originalBinSize: buffer.length,
            zeOffset,
            savedTo: binFilePath ?? "not saved (no path provided)",
          },
        };
      }
      throw new Error(
        "Neither Zephyr core dump magic header nor 'ZE' marker found in bin file.",
      );
    }

    const lengthOffset = magicOffset + ZephyrCoreDumpParser.MAGIC.length;
    if (lengthOffset + 4 > buffer.length)
      throw new Error("Core dump header is truncated.");
    const dumpLength = buffer.readUInt32LE(lengthOffset);

    const dumpStart = magicOffset;
    const dumpEnd = dumpStart + ZephyrCoreDumpParser.HEADER_SIZE + dumpLength;
    if (dumpEnd > buffer.length)
      throw new Error("Core dump data is truncated.");

    const zeOffset = buffer.indexOf(
      ZephyrCoreDumpParser.ZE_MARKER,
      dumpStart + ZephyrCoreDumpParser.HEADER_SIZE,
    );
    const startOffset =
      zeOffset !== -1 ? zeOffset : dumpStart + ZephyrCoreDumpParser.HEADER_SIZE;
    const coreDumpContent = buffer.subarray(startOffset, dumpEnd);
    if (binFilePath) fs.writeFileSync(binFilePath, coreDumpContent);

    return {
      summary: "Zephyr core dump isolated and saved.",
      details: {
        originalBinSize: buffer.length,
        magicOffset,
        dumpLength,
        dumpStart,
        dumpEnd,
        coreDumpSize: coreDumpContent.length,
        trailingBytes: buffer.length - dumpEnd,
        savedTo: binFilePath ?? "not saved (no path provided)",
      },
    };
  }
}
