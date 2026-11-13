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
 * Zephyr cbprintf packet decoder.
 *
 * Decodes a fully reassembled StmEspPacket (from StmEspDemux) to a
 * human-readable log string using either an ELF binary (reads strings
 * directly from .rodata).
 *
 * StmEspPacket payload layout for Zephyr cbprintf log messages:
 *
 *   startWord            stm_log_dict_hdr — level / sourceId / dataLen
 *   payloadBytes[0..3]   cbprintf_package_hdr (desc.len, desc.str_cnt, …)
 *   payloadBytes[4..7]   format-string pointer (target virtual address)
 *   payloadBytes[8..N*4-1]  argument words (N = desc.len from header)
 *   payloadBytes[N*4..]  appended-string bytes — individual D8 STP items
 *                        (1-byte arg-index + null-terminated string data)
 *
 * Architecture:
 *
 *   StmEspDemux  (stmesp-demux.ts)
 *    ↓ StmEspPacket
 *   decodeStmEspPacket  (this file)  ←  ElfDataModel
 *    ↓
 *   formatted string
 */

import type { ElfDataModel } from "cfs-lib";
import type { StmEspPacket } from "./stmesp-demux";

// ---------------------------------------------------------------------------
// String resolution
// ---------------------------------------------------------------------------

/** Discriminated union of all supported string-resolution sources. */
export type StringSource = ElfDataModel | undefined;

function isElfDataModel(source: StringSource): source is ElfDataModel {
  return (
    typeof source === "object" && source !== null && "elfFileAccess" in source
  );
}

/**
 * Read a null-terminated string from the ELF image at a target virtual address.
 *
 * Walks the section headers to translate the virtual address to a file
 * offset, then reads from the raw image bytes.
 */
function resolveStringFromElf(
  virtualAddress: number,
  model: ElfDataModel,
): string | null {
  for (const section of model.elfSectionHeaders) {
    const secStart = Number(section.address);
    const secEnd = secStart + Number(section.size);

    if (virtualAddress >= secStart && virtualAddress < secEnd) {
      const fileOffset = Number(section.offset) + (virtualAddress - secStart);
      const maxLen = secEnd - virtualAddress;
      try {
        return model.elfFileAccess.readNullTerminatedString(fileOffset, maxLen);
      } catch {
        return null;
      }
    }
  }
  return null;
}

/**
 * Resolve a target-side string pointer to its content.
 *
 * @param address  Target virtual address of the string.
 * @param source   ElfDataModel.
 * @returns The string at that address, or null if not found.
 */
function resolveString(address: number, source: StringSource): string | null {
  if (source === undefined) return null;
  if (isElfDataModel(source)) return resolveStringFromElf(address, source);
  throw new Error("Unsupported string source");
}

// ---------------------------------------------------------------------------
// Appended-string extraction
// ---------------------------------------------------------------------------

/**
 * Extract appended strings from the trailing bytes of a payloadBytes buffer.
 *
 * In the STMESP stream, appended-string bytes arrive as individual D8 STP
 * items after the argument frame.  The encoding is:
 *   <1 byte: arg-index> <N bytes: null-terminated string data> …
 *
 * The arg-index byte identifies which cbprintf argument owns the string:
 * index 0 is the format-string pointer itself (used in FSC mode when the
 * format string cannot be resolved from an ELF/dict), and indexes 1, 2, …
 * are the successive string-typed varargs in order of appearance.
 *
 * @param bytes         Full payloadBytes buffer from StmEspPacket.
 * @param frameEndByte  Byte offset of the first appended-string byte (= desc.len * 4).
 * @param count         Number of appended strings to read (desc.str_cnt).
 * @returns Map from arg-index to the null-terminated string at that index.
 */
function extractAppendedStrings(
  bytes: Uint8Array,
  frameEndByte: number,
  count: number,
): Map<number, string> {
  const strings = new Map<number, string>();
  const decoder = new TextDecoder();
  let idx = frameEndByte;

  for (let s = 0; s < count; s++) {
    if (idx >= bytes.length) break;
    const argIndex = bytes[idx++]; // preserved arg-index header
    const chars: number[] = [];
    while (idx < bytes.length) {
      const byte = bytes[idx++];
      if (byte === 0) break;
      chars.push(byte);
    }
    strings.set(argIndex, decoder.decode(new Uint8Array(chars)));
  }

  return strings;
}

/**
 * Width and interpretation of a single cbprintf argument as it appears in
 * the on-target (32-bit ARM Cortex-M) package frame.
 *
 *   's'    — string pointer (4 bytes)
 *   'n32'  — 32-bit numeric: int, uint, char, pointer, or '*' width/precision
 *   'f64'  — IEEE 754 double (8 bytes; plain %f promotes float→double via varargs)
 *   'i64s' — signed long long (8 bytes)
 *   'i64u' — unsigned long long (8 bytes)
 */
type FormatConversion =
  | { kind: "s" }
  | { kind: "n32" }
  | { kind: "f64" }
  | { kind: "i64s" }
  | { kind: "i64u" };

/**
 * Parse a C printf format string and return the width/type of each positional
 * argument consumed by the format, in order.
 *
 * On a 32-bit ARM Cortex-M target:
 *   - Plain `%f/%e/%g` (any case) — `float` is promoted to `double` through
 *     varargs, so the argument is 8 bytes (`f64`).
 *   - `%ll*` and `%q*` — 64-bit integer (`i64s` / `i64u`).
 *   - `*` width/precision — each consumes one 32-bit int argument.
 *   - Everything else — 32-bit (`n32`).
 * `%%` escapes produce no entry.
 */
function parseFormatConversions(fmt: string): FormatConversion[] {
  const conversions: FormatConversion[] = [];
  let i = 0;

  while (i < fmt.length) {
    if (fmt[i] !== "%") {
      i++;
      continue;
    }
    i++; // consume '%'
    if (i >= fmt.length) break;
    if (fmt[i] === "%") {
      i++;
      continue; // '%%' — no argument consumed
    }

    // Flags
    while (i < fmt.length && "-+ 0#".includes(fmt[i])) i++;

    // Width
    if (i < fmt.length && fmt[i] === "*") {
      conversions.push({ kind: "n32" }); // '*' width consumes one numeric arg
      i++;
    } else {
      while (i < fmt.length && fmt[i] >= "0" && fmt[i] <= "9") i++;
    }

    // Precision
    if (i < fmt.length && fmt[i] === ".") {
      i++;
      if (i < fmt.length && fmt[i] === "*") {
        conversions.push({ kind: "n32" }); // '*' precision consumes one numeric arg
        i++;
      } else {
        while (i < fmt.length && fmt[i] >= "0" && fmt[i] <= "9") i++;
      }
    }

    // Length modifier
    let lenMod = "";
    while (i < fmt.length && "hlLzqjt".includes(fmt[i])) {
      lenMod += fmt[i++];
    }

    if (i >= fmt.length) break;
    const spec = fmt[i++];

    switch (spec) {
      case "s":
        conversions.push({ kind: "s" });
        break;
      case "f":
      case "F":
      case "e":
      case "E":
      case "g":
      case "G":
        // float is always promoted to double through varargs on 32-bit ARM;
        // 'L' long double is also 8 bytes on Cortex-M.
        conversions.push({ kind: "f64" });
        break;
      case "d":
      case "i":
        conversions.push(
          lenMod === "ll" || lenMod === "q" || lenMod === "j"
            ? { kind: "i64s" }
            : { kind: "n32" },
        );
        break;
      case "u":
      case "o":
      case "x":
      case "X":
        conversions.push(
          lenMod === "ll" || lenMod === "q" || lenMod === "j"
            ? { kind: "i64u" }
            : { kind: "n32" },
        );
        break;
      default:
        conversions.push({ kind: "n32" });
        break;
    }
  }

  return conversions;
}

/**
 * Extract cbprintf argument values from the argument frame within a payload.
 *
 * On a 32-bit ARM Cortex-M target, cbprintf packs arguments at their natural
 * alignment relative to the start of the package (byte 0 = cbprintf_package_hdr):
 *   - 32-bit args (int, uint, pointer): 4-byte aligned, consume 4 bytes.
 *   - 64-bit args (double, long long):  8-byte aligned (up to 4 bytes of padding
 *     may be inserted to reach the next 8-byte boundary), consume 8 bytes.
 *
 * @param view       DataView over the full payloadBytes buffer.
 * @param startByte  Byte offset of the first argument (= 8: after the 4-byte
 *                   package header and 4-byte format-string pointer).
 * @param endByte    Exclusive end of the argument frame (= packageLenWords * 4,
 *                   clamped to the buffer length).
 * @param conversions Format conversions from parseFormatConversions.
 * @returns One entry per conversion with the decoded value and its package word
 *          index (`wordIndex = byteOffset / 4`).  The word index matches the
 *          arg-index byte stored before each appended string by cbprintf.
 *          Entries stop when the frame is exhausted before all conversions are
 *          consumed.
 */
function extractArgValues(
  view: DataView,
  startByte: number,
  endByte: number,
  conversions: FormatConversion[],
): { value: number | bigint; wordIndex: number }[] {
  const values: { value: number | bigint; wordIndex: number }[] = [];
  let off = startByte;

  for (const conv of conversions) {
    /* eslint-disable no-bitwise */
    if (conv.kind === "f64" || conv.kind === "i64s" || conv.kind === "i64u") {
      // Align to 8-byte boundary relative to the package start (byte 0 of the
      // DataView, which maps to cbprintf_package_hdr).
      off = (off + 7) & ~7;
      if (off + 8 > endByte) break;
      const wordIndex = off / 4;
      if (conv.kind === "f64") {
        values.push({ value: view.getFloat64(off, true), wordIndex });
      } else if (conv.kind === "i64s") {
        values.push({ value: view.getBigInt64(off, true), wordIndex });
      } else {
        values.push({ value: view.getBigUint64(off, true), wordIndex });
      }
      off += 8;
    } else {
      if (off + 4 > endByte) break;
      values.push({ value: view.getUint32(off, true), wordIndex: off / 4 });
      off += 4;
    }
    /* eslint-enable no-bitwise */
  }

  return values;
}

// ---------------------------------------------------------------------------
// printf-style formatter
// ---------------------------------------------------------------------------

/**
 * Format a C-style printf format string with the given argument list.
 *
 * Supported specifiers: %d %i %u %o %x %X %f %e %g %s %c %p %%
 * Width, precision, and flags (-, +, space, 0, #) are supported.
 * Length modifiers (l, ll, h, hh, z, q, j, t) are consumed but ignored for
 * display purposes — widths are already reflected in the arg types supplied
 * by extractArgValues (number for 32-bit/f64, bigint for i64s/i64u).
 */
export function formatPrintf(
  fmt: string,
  args: (number | bigint | string)[],
): string {
  let argIdx = 0;
  let result = "";
  let i = 0;

  while (i < fmt.length) {
    if (fmt[i] !== "%") {
      result += fmt[i++];
      continue;
    }

    i++; // consume '%'

    if (i >= fmt.length) {
      result += "%";
      break;
    }

    if (fmt[i] === "%") {
      result += "%";
      i++;
      continue;
    }

    // Flags
    let flags = "";
    while (i < fmt.length && "-+ 0#".includes(fmt[i])) {
      flags += fmt[i++];
    }

    // Width
    let width = 0;
    if (i < fmt.length && fmt[i] === "*") {
      /* eslint-disable-next-line no-bitwise */
      const rawWidth = (args[argIdx++] as number) | 0;
      if (rawWidth < 0) {
        flags += "-";
        width = -rawWidth;
      } else {
        width = rawWidth;
      }
      i++;
    } else {
      while (i < fmt.length && fmt[i] >= "0" && fmt[i] <= "9") {
        width = width * 10 + parseInt(fmt[i++], 10);
      }
    }

    // Precision
    let precision = -1;
    if (i < fmt.length && fmt[i] === ".") {
      i++;
      if (i < fmt.length && fmt[i] === "*") {
        /* eslint-disable-next-line no-bitwise */
        precision = (args[argIdx++] as number) | 0;
        i++;
      } else {
        precision = 0;
        while (i < fmt.length && fmt[i] >= "0" && fmt[i] <= "9") {
          precision = precision * 10 + parseInt(fmt[i++], 10);
        }
      }
    }

    // Length modifier
    let lenMod = "";
    while (i < fmt.length && "hlLzqjt".includes(fmt[i])) {
      lenMod += fmt[i++];
    }

    const spec = fmt[i++];
    const rawArg = args[argIdx++];
    let numArg =
      typeof rawArg === "number"
        ? rawArg
        : typeof rawArg === "bigint"
          ? Number(rawArg)
          : 0;

    // Narrow integer arguments to match h/hh semantics.  The on-target value
    // arrives as a full 32-bit word; mask to the effective width so that, e.g.,
    // %hhu with 0xffffffff prints 255 and %hhd with 255 prints -1.
    /* eslint-disable no-bitwise */
    if (lenMod === "hh") {
      numArg &= 0xff; // unsigned char width; d/i path sign-extends below
    } else if (lenMod === "h") {
      numArg &= 0xffff; // unsigned short width; d/i path sign-extends below
    }
    /* eslint-enable no-bitwise */

    let converted = "";

    // When precision is explicit, the '0' flag is suppressed for integers (C11 §7.21.6.1).
    const widthFlags = precision >= 0 ? flags.replace("0", "") : flags;

    /* eslint-disable no-bitwise */
    switch (spec) {
      case "d":
      case "i": {
        // Sign-extend from the effective width so %hhd/255 → -1, %hd/32768 → -32768.
        let signedArg = numArg | 0;
        if (lenMod === "hh") {
          signedArg = (numArg << 24) >> 24;
        } else if (lenMod === "h") {
          signedArg = (numArg << 16) >> 16;
        }
        const digits =
          typeof rawArg === "bigint"
            ? rawArg.toString(10)
            : signedArg.toString(10);
        const padded =
          precision >= 0
            ? digits.startsWith("-")
              ? `-${digits.slice(1).padStart(precision, "0")}`
              : digits.padStart(precision, "0")
            : digits;
        converted = applyWidth(padded, width, widthFlags, true);
        break;
      }
      case "u": {
        const digits =
          typeof rawArg === "bigint"
            ? (rawArg & 0xffffffffffffffffn).toString(10)
            : (numArg >>> 0).toString(10);
        converted = applyWidth(
          precision >= 0 ? digits.padStart(precision, "0") : digits,
          width,
          widthFlags,
          false,
        );
        break;
      }
      case "o": {
        const digits =
          typeof rawArg === "bigint"
            ? (rawArg & 0xffffffffffffffffn).toString(8)
            : (numArg >>> 0).toString(8);
        converted = applyWidth(
          precision >= 0 ? digits.padStart(precision, "0") : digits,
          width,
          widthFlags,
          false,
          flags.includes("#") ? "0" : "",
        );
        break;
      }
      case "x": {
        const digits =
          typeof rawArg === "bigint"
            ? (rawArg & 0xffffffffffffffffn).toString(16)
            : (numArg >>> 0).toString(16);
        converted = applyWidth(
          precision >= 0 ? digits.padStart(precision, "0") : digits,
          width,
          widthFlags,
          false,
          flags.includes("#") ? "0x" : "",
        );
        break;
      }
      case "X": {
        const digits =
          typeof rawArg === "bigint"
            ? (rawArg & 0xffffffffffffffffn).toString(16).toUpperCase()
            : (numArg >>> 0).toString(16).toUpperCase();
        converted = applyWidth(
          precision >= 0 ? digits.padStart(precision, "0") : digits,
          width,
          widthFlags,
          false,
          flags.includes("#") ? "0X" : "",
        );
        break;
      }
      case "p":
        converted = `0x${(numArg >>> 0).toString(16).padStart(8, "0")}`;
        break;
      case "f":
      case "F":
      case "e":
      case "E":
      case "g":
      case "G": {
        // extractArgValues supplies a JS number already decoded as float64.
        const floatVal = numArg;
        const prec = precision >= 0 ? precision : 6;
        if (spec === "f" || spec === "F") {
          converted = floatVal.toFixed(prec);
        } else if (spec === "e" || spec === "E") {
          converted =
            spec === "E"
              ? floatVal.toExponential(prec).toUpperCase()
              : floatVal.toExponential(prec);
        } else {
          converted =
            spec === "G"
              ? floatVal.toPrecision(prec > 0 ? prec : 1).toUpperCase()
              : floatVal.toPrecision(prec > 0 ? prec : 1);
        }
        converted = applyWidth(converted, width, flags, true);
        break;
      }
      case "c":
        converted = String.fromCharCode(numArg & 0xff);
        if (width > 1) {
          converted = flags.includes("-")
            ? converted.padEnd(width)
            : converted.padStart(width);
        }
        break;
      case "s": {
        const strVal =
          typeof rawArg === "string"
            ? rawArg
            : `<str@0x${(numArg >>> 0).toString(16)}>`;
        const truncated = precision >= 0 ? strVal.slice(0, precision) : strVal;
        converted = flags.includes("-")
          ? truncated.padEnd(width)
          : truncated.padStart(width);
        break;
      }
      default:
        converted = `%${spec}`;
        break;
    }
    /* eslint-enable no-bitwise */

    result += converted;
  }

  return result;
}

/** Apply width padding and sign prefix to an already-converted numeric string. */
function applyWidth(
  s: string,
  width: number,
  flags: string,
  isSigned: boolean,
  prefix = "",
): string {
  let sign = "";
  if (isSigned && s.startsWith("-")) {
    sign = "-";
    s = s.slice(1);
  } else if (isSigned && flags.includes("+")) {
    sign = "+";
  } else if (isSigned && flags.includes(" ")) {
    sign = " ";
  }

  const content = prefix + s;
  const totalLen = sign.length + content.length;

  if (totalLen >= width) return sign + content;

  const pad = width - totalLen;

  if (flags.includes("-")) {
    return sign + content + " ".repeat(pad);
  }
  if (flags.includes("0")) {
    return sign + prefix + s.padStart(s.length + pad, "0");
  }
  return " ".repeat(pad) + sign + content;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Decode a fully reassembled Zephyr STMESP packet to a formatted log string.
 *
 * The packet must follow Zephyr's cbprintf package layout as produced by
 * log_frontend_msg() / log_frontend_simple_0/1/2() in Zephyr's
 * log_frontend_stmesp.c.
 *
 * @param packet   Reassembled STMESP packet from StmEspDemux.
 * @param source   String-resolution source:
 *                 - ElfDataModel — reads strings from the static ELF image.
 * @returns The formatted log string, or null if the format string pointer
 *          could not be resolved in the provided source.
 *
 * @example
 * // ELF file:
 * const parser = new ElfFileParser("/path/to/zephyr.elf");
 * await parser.initialize();
 * const str = decodeStmEspPacket(packet, parser.getDataModel());
 *
 */
export function decodeStmEspPacket(
  packet: StmEspPacket,
  source: StringSource,
): string | null {
  const { payloadBytes } = packet;

  // Minimum valid payload: cbprintf_package_hdr (4 bytes) + fmt pointer (4 bytes).
  if (payloadBytes.length < 8) {
    return null;
  }

  const view = new DataView(
    payloadBytes.buffer,
    payloadBytes.byteOffset,
    payloadBytes.byteLength,
  );

  /* eslint-disable no-bitwise */
  const packageHeader = view.getUint32(0, true);
  const fmtAddress = view.getUint32(4, true);
  const packageLenWords = packageHeader & 0xff; // desc.len (in 4-byte words)
  const appendedStringCount = (packageHeader >>> 8) & 0xff; // desc.str_cnt
  /* eslint-enable no-bitwise */

  // Argument frame: bytes[8] through bytes[packageLenWords*4 - 1].
  // desc.len counts from the header word (word 0 = bytes 0..3).
  const argEndByte = Math.min(packageLenWords * 4, payloadBytes.length);

  // Appended strings follow at byte packageLenWords*4 as packed D8 bytes.
  // The map is keyed by the 1-byte arg-index embedded before each string:
  //   index 0 → format string (FSC mode only)
  //   index 1, 2, … → successive string-typed varargs
  const appendedStrings =
    appendedStringCount > 0
      ? extractAppendedStrings(
          payloadBytes,
          packageLenWords * 4,
          appendedStringCount,
        )
      : new Map<number, string>();

  // Resolve the format string.
  // Zephyr's appended-string arg-index is the cbprintf package word index of
  // the owning pointer: word 0 = cbprintf_package_hdr, word 1 = fmt pointer.
  // So the inline FSC copy of the format string is stored at index 1.
  // In FSC mode source is intentionally undefined, so resolveString always
  // returns null; fall back to the appended copy at index 1.
  let fmtStr: string | null = null;
  if (fmtAddress !== 0) {
    fmtStr = resolveString(fmtAddress, source);
    if (fmtStr === null) {
      // FSC: pointer unresolvable, use the appended inline copy at index 1.
      fmtStr = appendedStrings.get(1) ?? null;
    }
  } else {
    fmtStr = appendedStrings.get(1) ?? null;
  }

  if (fmtStr === null) {
    return null;
  }

  // Parse format conversions to know the width/type of each argument.
  // extractArgValues uses this to read each argument at the correct size and
  // natural alignment (8-byte for f64/i64, 4-byte for everything else).
  const conversions = parseFormatConversions(fmtStr);
  const argValues = extractArgValues(view, 8, argEndByte, conversions);

  // Build the printf arg list.  For each format conversion:
  //   - Numeric/float/int64: use the decoded value from extractArgValues.
  //   - String (%s): prefer ELF/dict resolution of the 32-bit pointer; on
  //     failure (null or unresolvable — FSC mode) use the appended-string copy
  //     keyed by the argument's package word index (wordIndex).
  //
  // The appended-string arg-index byte is the cbprintf package word index of
  // the owning pointer (word 0 = hdr, word 1 = fmt, word 2+ = args).  Using
  // wordIndex from extractArgValues gives the exact key regardless of how many
  // 32-bit or 64-bit arguments precede this %s in the format string.
  const printfArgs: (number | bigint | string)[] = [];
  for (let argIdx = 0; argIdx < conversions.length; argIdx++) {
    const conv = conversions[argIdx];
    const entry = argValues[argIdx];
    const rawVal = entry?.value ?? 0;

    if (conv.kind !== "s") {
      printfArgs.push(rawVal);
      continue;
    }

    // String conversion: rawVal is the 32-bit pointer.
    const ptrVal = typeof rawVal === "number" ? rawVal : Number(rawVal);
    const wordIndex = entry?.wordIndex ?? 0;

    if (ptrVal !== 0) {
      const resolved = resolveString(ptrVal, source);
      if (resolved !== null) {
        printfArgs.push(resolved);
        continue;
      }
    }

    // Pointer is null or unresolvable (FSC mode): use the appended copy keyed
    // by the argument's package word index.
    const appended = appendedStrings.get(wordIndex);
    printfArgs.push(appended !== undefined ? appended : ptrVal);
  }

  return formatPrintf(fmtStr, printfArgs);
}

// ---------------------------------------------------------------------------
// Log-source name resolution
// ---------------------------------------------------------------------------

/**
 * Read a pointer-sized entry from a named ELF section and resolve it to a
 * null-terminated string.
 *
 * This is a general helper used for two Zephyr-specific section lookups:
 *
 *   sectionName       entrySize  Description
 *   ────────────────  ─────────  ───────────────────────────────────────────
 *   log_const_area        8      struct log_source_const_data — layout:
 *                                  [0..3] const char *name (4-byte pointer)
 *                                  [4]    uint8_t level
 *                                  [5..7] padding
 *                                Used to resolve a 12-bit source_id to its
 *                                module name string.
 *
 *   log_stmesp_ptr_area   4      Array of const char * — each entry is a
 *                                4-byte pointer to a turbo-log format string.
 *                                Used by buildTurboLogMessage to resolve
 *                                channel → format string.
 *
 * For ELF: finds the named section in elfSectionHeaders (shName must match
 * exactly), reads the 4-byte pointer at `strPosition * entrySize`, then
 * resolves the pointed-to null-terminated string via resolveStringFromElf.
 *
 * @param strPosition  Zero-based index of the entry within the section.
 * @param source       ElfDataModel.
 * @param sectionName  ELF section name as it appears in shName (no leading dot
 *                     for these Zephyr sections, e.g. "log_const_area").
 * @param entrySize    Size of one entry in bytes (4 or 8).
 * @returns The resolved string, or null if the section or entry is absent.
 */
export function resolvePtrData(
  strPosition: number,
  source: StringSource,
  sectionName: string,
  entrySize: number,
): string | null {
  if (isElfDataModel(source)) {
    // Find the .log_const section.
    const logConstSection = source.elfSectionHeaders.find(
      (s) => s.shName === sectionName,
    );
    if (logConstSection === undefined) return null;

    const entryOffset =
      Number(logConstSection.offset) + strPosition * entrySize;
    const sectionEnd =
      Number(logConstSection.offset) + Number(logConstSection.size);

    if (entryOffset + entrySize > sectionEnd) return null;

    // Read the 4-byte name pointer from the ELF file image.
    const nameAddr = source.elfFileAccess
      .getDataView()
      .getUint32(entryOffset, true);
    if (nameAddr === 0) return null;

    return resolveStringFromElf(nameAddr, source);
  }
  return null;
}
