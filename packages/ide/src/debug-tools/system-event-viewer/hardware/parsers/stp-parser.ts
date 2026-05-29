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
 */

namespace stp {
  export const enum OpCode {
    NULL = 0x0,
    M8 = 0x1,
    MERR = 0x2,
    C8 = 0x3,
    D8 = 0x4,
    D16 = 0x5,
    D32 = 0x6,
    D64 = 0x7,
    D8MTS = 0x8,
    D16MTS = 0x9,
    D32MTS = 0xa,
    D64MTS = 0xb,
    D4 = 0xc,
    D4MTS = 0xd,
    FLAG_TS = 0xe,
    EXTENSION = 0xf,
  }

  export const enum ExtensionOpCode {
    EXTENSION0 = 0x0,
    M16 = 0x1,
    GERR = 0x2,
    C16 = 0x3,
    D8TS = 0x4,
    D16TS = 0x5,
    D32TS = 0x6,
    D64TS = 0x7,
    D8M = 0x8,
    D16M = 0x9,
    D32M = 0xa,
    D64M = 0xb,
    D4TS = 0xc,
    D4M = 0xd,
    FLAG = 0xe,
    EXTENSIONF = 0xf,
  }

  export const enum Extension0Opcode {
    VERSION = 0x0,
    NULL_TS = 0x1,
    USER = 0x2,
    USER_TS = 0x3,
    TIME = 0x4,
    TIME_TS = 0x5,
    TRIG = 0x6,
    TRIG_TS = 0x7,
    FREQ = 0x8,
    FREQ_TS = 0x9,
    XSYNC = 0xa,
    XSYNC_TS = 0xb,
    EXTENSION0F = 0xf,
  }

  export const enum ExtensionF0Opcode {
    FREQ_40 = 0x0,
    FREQ_40_TS = 0x1,
    DIP = 0x2,
    CERR = 0x3,
  }

  export const enum ExtensionFOpcode {
    PDID_DATA = 0x1,
    PDID_TYPE_TS = 0x2,
    MAYBE_ASYNC = 0xf,
  }
  export const enum TimestampFormat {
    STPv1 = 1,
    STPv2NATDELTA = 2,
    STPv2NAT = 3,
    STPv2GRAY = 4,
  }

  export const enum Version {
    v1 = "1.0",
    v2_1 = "2.1",
    v2_2 = "2.2",
    v2_3 = "2.3",
    v2_4 = "2.4",
  }
}

export enum StpItemType {
  Data,
  Flag,
  Trigger,
  Error,
}

export class StpDataItem {
  readonly type = StpItemType.Data;

  constructor(
    public majorSource: number,
    public channel: number,
    public data: bigint | number,
    public marked: boolean = false,
    public timestamp?: bigint,
  ) {}
}

export class StpFlag {
  readonly type = StpItemType.Flag;
  constructor(
    public majorSource: number,
    public channel: number,
    public timestamp?: bigint,
  ) {}
}

export class StpError {
  readonly type = StpItemType.Error;
  constructor(
    public info: number,
    public majorSource?: number,
    public channel?: number,
  ) {}
}

export class StpTrigger {
  readonly type = StpItemType.Trigger;
  constructor(
    public info: number,
    public timestamp?: bigint,
  ) {}
}

export type StpItem = StpDataItem | StpFlag | StpError | StpTrigger;

/**
 * Interface representing a parsed STPv2 data stream.
 */
export interface StpStream {
  /**
   * STP version used when formatting the stream.
   * This is mostly used internally during parsing but exposed
   * in the output for information purposes.
   */
  version: string;

  /**
   * Frequency of the timestamps in the stream, in Hz.
   * This can be used to properly interpret the timestamp values
   * of the items in the stream.
   *
   * It may be undefined if it was not present on the trace stream.
   */
  tsFrequency?: number;

  /**
   * Array containing trace events, these can indicate data, trigger, flags or errors.
   */
  items: StpItem[];
}

/**
 * This methods parses an STPv2 data stream according to
 * MIPI System Trace Protocol version 2 (STPv2)
 *
 * More information can be found on MIPI System Trace Protocol version 2
 * https://www.mipi.org/mipi-stp-download
 *
 * @param buffer Buffer object containing the STPv2 trace data stream.
 * @returns StpStream object containing the parsed STPv2 data.
 */
export function parseSTP(buffer: Buffer): StpStream | undefined {
  function* nibbleGenerator(): Generator<number> {
    for (const byte of buffer) {
      /* eslint-disable no-bitwise */
      yield byte & 0x0f;
      yield (byte & 0xf0) >>> 4;
      /* eslint-enable no-bitwise */
    }
  }

  const nibbleIterator = nibbleGenerator();
  let version: stp.Version | undefined = undefined;
  let tsFormat = stp.TimestampFormat.STPv1;
  let isLittleEndian = false;
  let tsFrequency: number | undefined = undefined;
  let lastTsRaw: bigint | undefined = undefined;
  let currentMajorSource = 0;
  let currentChannel = 0;
  const items: StpItem[] = [];

  function readWord8BE(): number {
    const msNible = nibbleIterator.next().value;
    const lsNible = nibbleIterator.next().value;
    if (lsNible === undefined || msNible === undefined) {
      throw new Error(
        "Unexpected end of STP data while reading a 8bit BE word.",
      );
    }
    // eslint-disable-next-line no-bitwise
    return (msNible << 4) | lsNible;
  }

  function readWord(nNibbles: number): bigint {
    let value = 0n;
    for (let i = 0; i < nNibbles; i++) {
      const nibble = nibbleIterator.next().value;
      if (nibble === undefined) {
        throw new Error(
          `Unexpected end of STP data. Reading ${nNibbles} nibbles, found ${i}.`,
        );
      }
      if (isLittleEndian) {
        // eslint-disable-next-line no-bitwise
        value |= BigInt(nibble) << BigInt(i * 4);
      } else {
        // eslint-disable-next-line no-bitwise
        value = (value << 4n) | BigInt(nibble);
      }
    }
    return value;
  }

  function readWord4(): number {
    return Number(readWord(1));
  }
  function readWord8(): number {
    return Number(readWord(2));
  }
  function readWord16(): number {
    return Number(readWord(4));
  }
  function readWord32(): number {
    return Number(readWord(8));
  }
  function readWord64(): bigint {
    return readWord(16);
  }

  function readTimestamp(): bigint {
    if (tsFormat === stp.TimestampFormat.STPv1) {
      // STPv1 timestamps are just 8-bit counters
      return BigInt(readWord8());
    }

    let tsLength = readWord4();
    if (tsLength === 13) {
      tsLength = 14;
    } else if (tsLength === 14) {
      tsLength = 16;
    }

    if (lastTsRaw === undefined) {
      // First TS is received using the full range of timestmap counter.
      // In the future we can detect the number of bits of the timestamp
      // here to identify overflows.
      lastTsRaw = 0n;
    }

    /* eslint-disable no-bitwise */
    const updateMask = (1n << (BigInt(tsLength) * 4n)) - 1n;
    const newTsRaw = (lastTsRaw & ~updateMask) | readWord(tsLength);
    /* eslint-enable no-bitwise */

    const outTs =
      tsFormat == stp.TimestampFormat.STPv2NAT
        ? newTsRaw
        : tsFormat == stp.TimestampFormat.STPv2NATDELTA
          ? lastTsRaw + newTsRaw
          : grayToBin(newTsRaw);

    lastTsRaw = newTsRaw;

    return outTs;
  }

  function readUntilAsync() {
    let consecutive0xF = 0;
    let nextNibble = nibbleIterator.next().value;
    while (nextNibble != undefined) {
      consecutive0xF = nextNibble === 0xf ? consecutive0xF + 1 : 0;
      nextNibble = nibbleIterator.next().value;
      if (consecutive0xF >= 21 && nextNibble === 0x0) {
        return true;
      }
    }
    return false;
  }

  if (!readUntilAsync()) {
    return undefined;
  }

  for (const nibble1 of nibbleIterator) {
    if (
      version === undefined &&
      [stp.OpCode.EXTENSION, stp.OpCode.NULL].includes(nibble1) === false
    ) {
      throw new Error(
        "Only VERSION and NULL packages are allowed after an ASYNC packet",
      );
    }
    switch (nibble1) {
      case stp.OpCode.NULL: {
        // Discard byte silently
        break;
      }
      case stp.OpCode.M8: {
        /* eslint-disable no-bitwise */
        currentMajorSource &= ~0xff;
        currentMajorSource |= readWord8();
        /* eslint-enable no-bitwise */
        currentChannel = 0;
        break;
      }
      case stp.OpCode.MERR: {
        const info = readWord8();
        items.push(new StpError(info, currentMajorSource));
        currentChannel = 0;
        break;
      }
      case stp.OpCode.C8: {
        /* eslint-disable no-bitwise */
        currentChannel &= ~0xff;
        currentChannel |= readWord8();
        /* eslint-enable no-bitwise */
        break;
      }
      case stp.OpCode.D8: {
        const data = readWord8();
        items.push(new StpDataItem(currentMajorSource, currentChannel, data));
        break;
      }
      case stp.OpCode.D16: {
        const data = readWord16();
        items.push(new StpDataItem(currentMajorSource, currentChannel, data));
        break;
      }
      case stp.OpCode.D32: {
        const data = readWord32();
        items.push(new StpDataItem(currentMajorSource, currentChannel, data));
        break;
      }
      case stp.OpCode.D64: {
        const data = readWord64();
        items.push(new StpDataItem(currentMajorSource, currentChannel, data));
        break;
      }
      case stp.OpCode.D8MTS: {
        const data = readWord8();
        const ts = readTimestamp();
        items.push(
          new StpDataItem(currentMajorSource, currentChannel, data, true, ts),
        );
        break;
      }
      case stp.OpCode.D16MTS: {
        const data = readWord16();
        const ts = readTimestamp();
        items.push(
          new StpDataItem(currentMajorSource, currentChannel, data, true, ts),
        );
        break;
      }
      case stp.OpCode.D32MTS: {
        const data = readWord32();
        const ts = readTimestamp();
        items.push(
          new StpDataItem(currentMajorSource, currentChannel, data, true, ts),
        );
        break;
      }
      case stp.OpCode.D64MTS: {
        const data = readWord64();
        const ts = readTimestamp();
        items.push(
          new StpDataItem(currentMajorSource, currentChannel, data, true, ts),
        );
        break;
      }
      case stp.OpCode.D4: {
        const data = readWord4();
        items.push(new StpDataItem(currentMajorSource, currentChannel, data));
        break;
      }
      case stp.OpCode.D4MTS: {
        const data = readWord4();
        const ts = readTimestamp();
        items.push(
          new StpDataItem(currentMajorSource, currentChannel, data, true, ts),
        );
        break;
      }
      case stp.OpCode.FLAG_TS: {
        const ts = readTimestamp();
        items.push(new StpFlag(currentMajorSource, currentChannel, ts));
        break;
      }
      case stp.OpCode.EXTENSION: {
        const nibble2 = readWord4();
        if (
          version === undefined &&
          nibble2 !== stp.ExtensionOpCode.EXTENSION0
        ) {
          throw new Error(
            "Only VERSION and NULL packages are allowed after an ASYNC packet",
          );
        }
        switch (nibble2) {
          case stp.ExtensionOpCode.EXTENSION0: {
            const nibble3 = readWord4();
            if (
              version === undefined &&
              nibble3 !== stp.Extension0Opcode.VERSION
            ) {
              throw new Error(
                "Only VERSION and NULL packages are allowed after an ASYNC packet",
              );
            }
            switch (nibble3) {
              case stp.Extension0Opcode.VERSION: {
                const versionFirstNibble = readWord4();

                /* eslint-disable no-bitwise */
                const ttt = versionFirstNibble & 0x7;
                const payloadPresent = (versionFirstNibble & 0x8) !== 0;
                /* eslint-enable no-bitwise */

                switch (ttt) {
                  case 0:
                  case 1:
                    tsFormat = stp.TimestampFormat.STPv1;
                    break;
                  case 2:
                    tsFormat = stp.TimestampFormat.STPv2NATDELTA;
                    break;
                  case 3:
                    tsFormat = stp.TimestampFormat.STPv2NAT;
                    break;
                  case 4:
                    tsFormat = stp.TimestampFormat.STPv2GRAY;
                    break;
                  default:
                    throw new Error(`Unknown STP timestamp format: ${ttt}`);
                }

                if (versionFirstNibble === 0) {
                  version = stp.Version.v1;
                } else if (payloadPresent) {
                  const versionPayload = readWord8BE();

                  /* eslint-disable no-bitwise */
                  isLittleEndian = (versionPayload & 0x80) !== 0;
                  const vv = versionPayload & 0x7;
                  /* eslint-enable no-bitwise */
                  switch (vv) {
                    case 1:
                      version = stp.Version.v2_2;
                      break;
                    case 2:
                      version = stp.Version.v2_3;
                      break;
                    case 3:
                      version = stp.Version.v2_4;
                      break;
                    case 0:
                    default:
                      throw new Error(`Unknown STP version: ${vv}`);
                  }
                } else {
                  version = stp.Version.v2_1;
                }
                break;
              }
              case stp.Extension0Opcode.NULL_TS: {
                const ts = readTimestamp();
                console.warn(`Read NULL_TS with timestamp ${ts}`);
                break;
              }
              case stp.Extension0Opcode.USER: {
                console.warn("USER extension encountered but not implemented");
                break;
              }
              case stp.Extension0Opcode.USER_TS: {
                console.warn(
                  "USER_TS extension encountered but not implemented",
                );
                break;
              }
              case stp.Extension0Opcode.TIME: {
                console.warn("TIME extension encountered but not implemented");
                break;
              }
              case stp.Extension0Opcode.TIME_TS: {
                console.warn(
                  "TIME_TS extension encountered but not implemented",
                );
                break;
              }
              case stp.Extension0Opcode.TRIG: {
                const info = readWord8();
                items.push(new StpTrigger(info));
                break;
              }
              case stp.Extension0Opcode.TRIG_TS: {
                const info = readWord8();
                const ts = readTimestamp();
                items.push(new StpTrigger(info, ts));
                break;
              }
              case stp.Extension0Opcode.FREQ: {
                tsFrequency = readWord32();
                break;
              }
              case stp.Extension0Opcode.FREQ_TS: {
                tsFrequency = readWord32();
                break;
              }
              case stp.Extension0Opcode.XSYNC: {
                console.warn("XSYNC extension encountered but not implemented");
                break;
              }
              case stp.Extension0Opcode.XSYNC_TS: {
                console.warn(
                  "XSYNC_TS extension encountered but not implemented",
                );
                break;
              }
              case stp.Extension0Opcode.EXTENSION0F: {
                const nibble4 = readWord4();
                switch (nibble4) {
                  case stp.ExtensionF0Opcode.FREQ_40: {
                    tsFrequency = Number(readWord(10));
                    break;
                  }
                  case stp.ExtensionF0Opcode.FREQ_40_TS: {
                    tsFrequency = Number(readWord(10));
                    readTimestamp();
                    break;
                  }
                  case stp.ExtensionF0Opcode.DIP: {
                    console.warn(
                      "DIP extension encountered but not implemented",
                    );
                    break;
                  }
                  case stp.ExtensionF0Opcode.CERR: {
                    const info = readWord8();
                    items.push(
                      new StpError(info, currentMajorSource, currentChannel),
                    );
                    break;
                  }
                }
              }
            }
            break;
          }
          case stp.ExtensionOpCode.M16: {
            currentMajorSource = readWord16();
            currentChannel = 0;
            break;
          }
          case stp.ExtensionOpCode.GERR: {
            const info = readWord8();
            items.push(new StpError(info));
            currentMajorSource = 0;
            currentChannel = 0;
            break;
          }
          case stp.ExtensionOpCode.C16: {
            currentChannel = readWord16();
            break;
          }
          case stp.ExtensionOpCode.D8TS: {
            const data = readWord8();
            const ts = readTimestamp();
            items.push(
              new StpDataItem(
                currentMajorSource,
                currentChannel,
                data,
                false,
                ts,
              ),
            );
            break;
          }
          case stp.ExtensionOpCode.D16TS: {
            const data = readWord16();
            const ts = readTimestamp();
            items.push(
              new StpDataItem(
                currentMajorSource,
                currentChannel,
                data,
                false,
                ts,
              ),
            );
            break;
          }
          case stp.ExtensionOpCode.D32TS: {
            const data = readWord32();
            const ts = readTimestamp();
            items.push(
              new StpDataItem(
                currentMajorSource,
                currentChannel,
                data,
                false,
                ts,
              ),
            );
            break;
          }
          case stp.ExtensionOpCode.D64TS: {
            const data = readWord64();
            const ts = readTimestamp();
            items.push(
              new StpDataItem(
                currentMajorSource,
                currentChannel,
                data,
                false,
                ts,
              ),
            );
            break;
          }
          case stp.ExtensionOpCode.D8M: {
            const data = readWord8();
            items.push(
              new StpDataItem(currentMajorSource, currentChannel, data, true),
            );
            break;
          }
          case stp.ExtensionOpCode.D16M: {
            const data = readWord16();
            items.push(
              new StpDataItem(currentMajorSource, currentChannel, data, true),
            );
            break;
          }
          case stp.ExtensionOpCode.D32M: {
            const data = readWord32();
            items.push(
              new StpDataItem(currentMajorSource, currentChannel, data, true),
            );
            break;
          }
          case stp.ExtensionOpCode.D64M: {
            const data = readWord64();
            items.push(
              new StpDataItem(currentMajorSource, currentChannel, data, true),
            );
            break;
          }
          case stp.ExtensionOpCode.D4TS: {
            const data = readWord4();
            const ts = readTimestamp();
            items.push(
              new StpDataItem(
                currentMajorSource,
                currentChannel,
                data,
                false,
                ts,
              ),
            );
            break;
          }
          case stp.ExtensionOpCode.D4M: {
            const data = readWord4();
            items.push(
              new StpDataItem(currentMajorSource, currentChannel, data, true),
            );
            break;
          }
          case stp.ExtensionOpCode.FLAG: {
            items.push(new StpFlag(currentMajorSource, currentChannel));
            break;
          }
          case stp.ExtensionOpCode.EXTENSIONF: {
            const nibble3 = readWord4();
            switch (nibble3) {
              case stp.ExtensionFOpcode.PDID_DATA: {
                console.warn(
                  "PDID_DATA extension encountered but not implemented",
                );
                break;
              }
              case stp.ExtensionFOpcode.PDID_TYPE_TS: {
                console.warn(
                  "PDID_TYPE_TS extension encountered but not implemented",
                );
                break;
              }
              case stp.ExtensionFOpcode.MAYBE_ASYNC: {
                let consecutiveF = 3;
                let nextNibble = readWord4();
                while (nextNibble === 0xf) {
                  consecutiveF += 1;
                  nextNibble = readWord4();
                }
                if (consecutiveF === 21 && nextNibble == 0) {
                  // Async marker detected
                  // Set version to undefined to enforce next packet to be a VERSION one
                  version = undefined;
                }
                break;
              }
            }
            break;
          }
        }
      }
    }
  }

  if (version === undefined) {
    throw new Error("VERSION packet not found after an ASYNC one");
  }

  return { version: version, tsFrequency, items };
}

function grayToBin(gray: bigint): bigint {
  let bin = 0n;
  let mask = gray;
  while (mask !== 0n) {
    /* eslint-disable no-bitwise */
    bin ^= mask;
    mask >>= 1n;
    /* eslint-enable no-bitwise */
  }
  return bin;
}
