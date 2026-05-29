/**
 *
 * Copyright (c) 2025-2026 Analog Devices, Inc.
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

// Note below rule is disable due to allow overload due to this issue:
// https://github.com/typescript-eslint/typescript-eslint/issues/291
/* eslint-disable no-dupe-class-members */

import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

/**
 * Represents data on memory
 */
export interface MemoryData {
  /** The memory address where the data was read from */
  address: number;
  /** The data buffer containing the memory contents */
  data: Buffer;
}

/**
 * Controls how memory read errors are handled when a read spans
 * regions with mixed accessibility.
 */
export enum MemoryReadStrategy {
  /** Single DAP request — throws on any error (default behaviour). */
  AllOrNothing = "all-or-nothing",
  /**
   * Binary-search to find the first unreadable byte, return
   * readable bytes before it and null-fill the remainder.
   * Cost: O(log N) additional DAP calls on error.
   */
  FirstFault = "first-fault",
  /**
   * Binary-search every sub-range to map all "holes".
   * Gives byte-accurate fault boundaries but costs
   * O(N log N) DAP calls in the worst case.
   */
  MapFaults = "map-faults",
}

/**
 * Represents memory data where some bytes may be unreadable.
 * A `null` entry at a given offset means the byte at that
 * address could not be read.
 */
export interface FaultTolerantMemoryData {
  address: number;
  data: (number | null)[];
}

/**
 * Information about why and how the debug target stopped,
 * sourced from the DAP 'stopped' event.
 */
export interface StopInfo {
  /** Why the target stopped (e.g. 'breakpoint', 'step', 'pause', 'exception', 'entry') */
  readonly reason: string;
  /** IDs of breakpoints that were hit, if applicable */
  readonly hitBreakpointIds?: number[];
  /** The thread that triggered the stop */
  readonly threadId?: number;
  /** Human-readable description from the debug adapter */
  readonly description?: string;
}

/**
 * Execution state of a debug session.
 */
export type ExecutionState = "running" | "halted" | "no-session";

/**
 * Representation of a register field as a tuple.
 * The first element is the bit offset of the field within the register,
 * and the second element is the bit length of the field.
 *
 * For example, a field defined as [3, 8] would represent an 8-bit field
 * starting at bit offset 3 of the register (i.e. bits 3 to 10).
 */
export type RegisterField = [number, number];

/** Description of a register, including its address and the fields it contains.
 *
 * For example, a register with address 0x1000 and two fields "field1" using the lower
 * 8 bits and "field2" using the remaining 24 bits would be represented as:
 * {
 *   address: 0x1000,
 *   fields: {
 *     field1: [0, 8],
 *     field2: [8, 24]
 *   }
 *
 * If the register is under an AP that is not accessible by the debugger by default,
 * the AP address can be specified in the `apAddress` field so the register can be
 * accessed through the correct AP.
 */
export interface RegisterDescription {
  address: number;
  apAddress?: number;
  fields: Record<string, RegisterField>;
}

// This was introduced to work around the fact that some debug adapters (e.g. cortex-debug with JLink)
// do not provide built-in DAP requests to read or write AP registers, but do allow custom monitor commands
// that can be used to perform DP-AP transactions. The script defines two monitor command sequences to perform
// read and write transactions on AP registers, as well as a command to read the DP ID register as a sanity
// check to confirm that the script is loaded correctly and that the monitor commands are working as expected.
// This script is loaded on demand when the first AP read/write operation is attempted, and only once per
// debug session. These commands are defined to maintain the atomicity of AP transactions, which is important
// to avoid issues caused by interleaved monitor commands from other operations. If another command interrupts
// the sequence of monitor commands required for an AP transaction, the transaction can fail, and the cause
// can be difficult to diagnose because the output of the monitor commands would be mixed with the output of
// other monitor commands or debug operations.
const CONF_READ_TRANSACTION_FUNCTION = "configureSendAPReadTransaction";
const CONF_WRITE_TRANSACTION_FUNCTION = "configureSendAPWriteTransaction";
const READ_DP_ID_FUNCTION = "readDPIDRegister";
const READWRITE_AP_FUNCTIONS_SCRIPT = `define ${CONF_READ_TRANSACTION_FUNCTION}
      set $addr = $arg1
      set $endAddr =  $arg1 + $arg2
      monitor writeDP 2 $arg0
      monitor writeAP 0 0x80000012
      monitor writeAP 1 $arg1
      while $addr < $endAddr
        monitor readAP 3
        set $addr = $addr + 4
      end
    end
    define ${CONF_WRITE_TRANSACTION_FUNCTION}
      monitor writeDP 2 $arg0
      monitor writeAP 0 0x80000012
      monitor writeAP 1 $arg1
      set $i = 2
      while $i < $argc
        eval "monitor writeAP 3 $arg%d", $i
        set $i = $i + 1
      end
    end
    define ${READ_DP_ID_FUNCTION}
      monitor writeDP 8 0x00000000
      monitor writeDP 0 0
      monitor readDP 12
    end`;

/**
 * Provides a higher level interface than vscode.debug namespace
 * This is achieved mainly by providing CfsDebugSession instances
 * that wraps DAP messages with functions and events.
 *
 * For functionality already provided by vscode.debug,
 * such as vscode.debug.onDidChangeActiveDebugSession or
 * vscode.debug.onDidTerminateDebugSession use those APIs directly.
 */
export class CfsDebugManager {
  private readonly onStartSessionEmitter =
    new vscode.EventEmitter<CfsDebugSession>();
  /** Event that fires when a new debug session starts.
   * This is equivalent to vscode.debug.onDidStartDebugSession,
   * but provides CfsDebugSession instances instead of vscode.DebugSession.
   */
  readonly onStartSession = this.onStartSessionEmitter.event;

  private readonly onDidChangeActiveDebugSessionEmitter =
    new vscode.EventEmitter<CfsDebugSession | undefined>();
  readonly onDidChangeActiveDebugSession =
    this.onDidChangeActiveDebugSessionEmitter.event;

  private disposables: vscode.Disposable[] = [];
  private sessions: Map<string, CfsDebugSession> = new Map();

  constructor() {
    this.disposables.push(
      vscode.debug.registerDebugAdapterTrackerFactory("*", {
        createDebugAdapterTracker: (session) => {
          const newSession = new CfsDebugSession(session);
          this.onStartSessionEmitter.fire(newSession);
          this.sessions.set(session.id, newSession);
          newSession.onStop(() => {
            this.sessions.delete(session.id);
          });
          return newSession;
        },
      }),
    );

    this.disposables.push(
      vscode.debug.onDidChangeActiveDebugSession((activeSession) => {
        if (activeSession) {
          this.onDidChangeActiveDebugSessionEmitter.fire(
            this.getSession(activeSession.id),
          );
        } else {
          this.onDidChangeActiveDebugSessionEmitter.fire(undefined);
        }
      }),
    );
  }

  /**
   * Retrieves the currently active debug session.
   * Equivalent to vscode.debug.activeDebugSession,
   * but returns a CfsDebugSession instance instead of vscode.DebugSession.
   * @returns The active CfsDebugSession if one exists, undefined otherwise
   */
  public getActiveSession(): CfsDebugSession | undefined {
    const session = vscode.debug.activeDebugSession;
    return session ? this.sessions.get(session.id) : undefined;
  }

  /**
   * Retrieves a specific CfsDebugSession by its ID.
   * @param sessionId - The unique identifier of the debug session
   * @returns The CfsDebugSession with the specified ID if it exists, undefined otherwise
   */
  public getSession(sessionId: string): CfsDebugSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Retrieves all active debug sessions.
   * @returns Array of all debug sessions
   */
  public getAllSessions(): CfsDebugSession[] {
    return Array.from(this.sessions.values());
  }

  public dispose() {
    this.disposables.forEach((d) => d.dispose());
  }
}

/**
 * Represents a single debug session within the CodeFusion Studio IDE.
 * It offers methods and events to interact with the debug adapter at a
 * higher level than the raw DAP messages.
 */
export class CfsDebugSession implements vscode.DebugAdapterTracker {
  private readonly onStartEmitter = new vscode.EventEmitter<void>();
  /** Event that fires when the debug session starts */
  readonly onStart = this.onStartEmitter.event;

  private readonly onStopEmitter = new vscode.EventEmitter<void>();
  /** Event that fires when the debug session stops */
  readonly onStop = this.onStopEmitter.event;

  private readonly onContinueEmitter = new vscode.EventEmitter<void>();
  /** Event that fires when the debugged program continues execution */
  readonly onContinue = this.onContinueEmitter.event;

  private readonly onHaltEmitter = new vscode.EventEmitter<StopInfo>();
  /** Event that fires when the debugged program halts execution.
   * This may be due to hitting a breakpoint, stepping, pausing, etc.
   * The event payload contains stop information from DAP.
   */
  readonly onHalt = this.onHaltEmitter.event;

  /** The underlying vscode.DebugSession */
  vscodeSession: vscode.DebugSession;

  private running: boolean = false;
  private stopInfo: StopInfo | undefined = undefined;
  private evaluateOutputBuffer: string | undefined = undefined;
  private isGDBScriptLoaded: boolean = false;

  /**
   * Whether the debugged program is currently executing.
   */
  get isRunning(): boolean {
    return this.running;
  }

  /**
   * Information about the last stop, if available.
   */
  get lastStopInfo(): StopInfo | undefined {
    return this.stopInfo;
  }
  private evaluateMutex: Promise<string> = Promise.resolve("");

  /**
   * Creates a new CfsDebugSession instance.
   * @param session - The VS Code debug session to wrap
   *
   * This method should not be used to create instances directly.
   * Use CfsDebugManager to obtain CfsDebugSession instances.
   */
  constructor(session: vscode.DebugSession) {
    this.vscodeSession = session;
  }

  /**
   * Returns whether the debug session is running (false) or
   * the execution is halted (true).
   */
  public isHalted(): boolean {
    return !this.isRunning;
  }

  /**
   * Evaluates an expression in the context of the debug session.
   * @param expression - The expression to evaluate
   * @param resultPattern - Optional regular expression to extract specific information from the output.
   * @returns A promise that resolves to the full evaluation output when no result pattern is provided,
   * or to the matched substring (`match[0]`) when `resultPattern` is supplied
   */

  async evaluateREPL(expression: string): Promise<string>;
  async evaluateREPL(
    expression: string,
    resultPattern: RegExp,
  ): Promise<RegExpMatchArray>;
  async evaluateREPL(
    expression: string,
    resultPattern?: RegExp,
  ): Promise<string | RegExpMatchArray> {
    // This implementation is just a mutex wrapper around evaluateREPL_Internal
    // to prevent concurrent calls that would mix up output events.
    const result = this.evaluateMutex.then(() =>
      this.evaluateREPL_Internal(expression),
    );
    this.evaluateMutex = result.then(() => "").catch(() => "");

    if (resultPattern) {
      return result.then((output) => {
        const match = output.trimStart().match(resultPattern);
        if (!match) {
          throw new Error(
            `No match found for regex ${resultPattern} in output: ${output}`,
          );
        }
        return match;
      });
    }

    return result;
  }

  /**
   * This method is unsafe to be used concurrently, as it relies on
   * shared console output events from debug adapter.
   */
  private async evaluateREPL_Internal(expression: string): Promise<string> {
    this.evaluateOutputBuffer = "";
    await this.vscodeSession.customRequest("evaluate", {
      expression: expression,
      context: "repl",
    });
    const result = this.evaluateOutputBuffer;
    this.evaluateOutputBuffer = undefined;

    return result;
  }

  /**
   * Reads memory from the debugged program using a memory reference.
   * This is equivalent to the DAP 'readMemory' request.
   * @param reference - Memory reference, as provided to readMemory DAP request,
   *                    or a numeric value representing an address
   * @param count - The number of bytes to read
   * @param offset - Optional offset from the reference address
   * @returns A promise that resolves to the memory data (address and buffer)
   */
  async readMemory(
    reference: string | number,
    count: number,
    offset?: number,
  ): Promise<MemoryData> {
    if (typeof reference === "number") {
      reference = `0x${reference.toString(16)}`;
    }

    const response = await this.vscodeSession.customRequest("readMemory", {
      memoryReference: reference,
      count: count,
      offset: offset,
    });

    return {
      address: parseInt(response.address),
      data: Buffer.from(response.data, "base64"),
    };
  }

  /**
   * Ensures that the GDB script with AP read/write functions is loaded in the debug adapter.
   * This is necessary for AP read/write operations, which rely on custom monitor commands defined in the script.
   * The script is loaded only once per debug session.
   * @param script - The GDB script content to load
   * @returns A promise that resolves when the script is loaded
   */
  private async ensureGDBScriptIsLoaded(script: string): Promise<void> {
    if (this.isGDBScriptLoaded) {
      return;
    }

    const tempDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), "gdb-script-"),
    );
    const tempFilePath = path.join(tempDir, "script.gdb");
    const gdbPath = tempFilePath.replace(/\\/g, "/");

    try {
      await fs.promises.writeFile(tempFilePath, script, {
        encoding: "utf-8",
        flag: "wx",
      });

      await this.evaluateREPL(`source ${gdbPath}`);
    } finally {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    }

    await this.evaluateREPL(`${READ_DP_ID_FUNCTION}`, /O.K.:(0x[0-9a-fA-F]+)/);

    this.isGDBScriptLoaded = true;
  }
  /**
   * Reads memory from an AP (Access Port).
   * @param apAddress - The address of the AP to access
   * @param address - The target memory address to read on the AP. Must be 4-byte aligned.
   * @param count - The number of bytes to read, should be a multiple of 4 and > 0.
   * @returns A promise that resolves to the memory data (address and buffer)
   * @throws An error if the debug session type does not support AP access, if the count is not a multiple of 4,
   * or if a required command fails or if address is not 4-byte aligned or if count is not greater than 0.
   *
   * Note: This method depends on custom monitor commands provided by this class's GDB helper script.
   * The script is loaded on demand before use, so no external launch configuration changes are required
   */
  async readMemoryAp(
    apAddress: number,
    address: number,
    count: number,
  ): Promise<MemoryData> {
    if (count <= 0) {
      throw new Error("AP memory read count must be greater than 0");
    }
    if (
      !(
        this.vscodeSession.type === "cortex-debug" &&
        (this.vscodeSession.configuration.servertype === "jlink" ||
          this.vscodeSession.configuration.servertype === "external")
      )
    ) {
      throw new Error(
        "AP memory read is currently only supported for cortex-debug sessions using jlink or external servertype",
      );
    }

    if (count % 4 !== 0) {
      throw new Error(
        "AP memory read currently only supports counts that are a multiple of 4",
      );
    }

    if (address % 4 !== 0) {
      throw new Error(
        "AP memory read currently only supports addresses that are 4-byte aligned",
      );
    }

    // Ensure the GDB script with AP read/write functions is loaded,
    // to ensure the required monitor commands are available.
    await this.ensureGDBScriptIsLoaded(READWRITE_AP_FUNCTIONS_SCRIPT);

    // 0xd00 is _CSW_REG_OFF DP reg to configure communication between the DP and AP.
    // eslint-disable-next-line no-bitwise
    const apBank = apAddress | 0xd00;
    const match = await this.evaluateREPL(
      `${CONF_READ_TRANSACTION_FUNCTION} 0x${apBank.toString(16)} 0x${address.toString(16)} 0x${count.toString(16)}`,
      /(?:O\.K\.\r?\n){3}(?:O\.K\.:0x[0-9a-fA-F]{8}(?:\r?\n|$))+/,
    );

    const fullOutput = match[0]; // The entire matched string

    // Extract ALL hex values (all O.K.:0x pairs)
    const allHexMatches = fullOutput.match(/:0x([0-9a-fA-F]{8})/g) || [];
    const hexValues = allHexMatches.map((hex) => hex.substring(1)); // Remove ':' prefix, keep '0x'
    const expectedWords = count / 4;
    if (hexValues.length !== expectedWords) {
      throw new Error(
        `AP memory read returned ${hexValues.length} words, expected ${expectedWords} (address=0x${address.toString(16)}, count=${count})`,
      );
    }

    const buf = Buffer.alloc(count);
    let offset = 0;

    for (const hex of hexValues) {
      if (!/^(?:0[xX])?[0-9a-fA-F]{8}$/.test(hex)) {
        throw new Error(`Invalid hex value in AP response: "${hex}"`);
      }
      buf.writeUInt32LE(Number.parseInt(hex, 16), offset);
      offset += 4;
    }

    return {
      address,
      data: buf.subarray(0, count),
    };
  }

  /**
   * Reads memory with fault tolerance using binary-search subdivision.
   *
   * Attempts a single DAP read for the full range first. If it succeeds
   * the result is returned immediately. If it fails, the behaviour depends
   * on `strategy`:
   *
   * - **AllOrNothing** – re-throws the error (identical to {@link readMemory}).
   * - **FirstFault** – binary-searches to find the first unreadable byte,
   *   returns readable bytes before it and `null`-fills the remainder.
   *   Cost: O(log N) additional DAP calls.
   * - **MapFaults** – recursively subdivides every failing sub-range to
   *   map all unreadable "holes" at byte granularity.
   *   Cost: O(N log N) DAP calls in the worst case.
   *
   * @param address  - Start address as a number
   * @param count    - Number of bytes to read
   * @param strategy - Error-handling strategy (defaults to AllOrNothing)
   * @returns Promise resolving to an array of `(number | null)` values
   */
  async readMemoryFaultTolerant(
    address: number,
    count: number,
    strategy: MemoryReadStrategy = MemoryReadStrategy.AllOrNothing,
  ): Promise<FaultTolerantMemoryData> {
    try {
      const result = await this.readMemory(address, count);
      return {
        address,
        data: Array.from(result.data),
      };
    } catch (error) {
      if (strategy === MemoryReadStrategy.AllOrNothing || count <= 0) {
        throw error;
      }

      // Base case: single byte that failed → null
      if (count === 1) {
        return { address, data: [null] };
      }

      const midOffset = Math.floor(count / 2);

      if (strategy === MemoryReadStrategy.FirstFault) {
        return this.readMemoryFirstFault(address, count, midOffset);
      }

      // MapFaults: recurse both halves to find all holes
      const [left, right] = await Promise.all([
        this.readMemoryFaultTolerant(
          address,
          midOffset,
          MemoryReadStrategy.MapFaults,
        ),
        this.readMemoryFaultTolerant(
          address + midOffset,
          count - midOffset,
          MemoryReadStrategy.MapFaults,
        ),
      ]);

      return {
        address,
        data: [...left.data, ...right.data],
      };
    }
  }

  /**
   * FirstFault helper: binary-searches for the first unreadable byte,
   * then null-fills everything from that point onward.
   */
  private async readMemoryFirstFault(
    address: number,
    count: number,
    midOffset: number,
  ): Promise<FaultTolerantMemoryData> {
    try {
      // Try reading the first half
      const leftResult = await this.readMemory(address, midOffset);
      const leftData: (number | null)[] = Array.from(leftResult.data);

      // First half succeeded — the fault is in the second half.
      // Continue binary-searching the second half.
      const right = await this.readMemoryFaultTolerant(
        address + midOffset,
        count - midOffset,
        MemoryReadStrategy.FirstFault,
      );

      return {
        address,
        data: [...leftData, ...right.data],
      };
    } catch {
      if (midOffset === 1) {
        // The very first byte is unreadable — null-fill everything
        return {
          address,
          data: Array<null>(count).fill(null),
        };
      }

      // First half failed — the fault starts in the first half.
      // Continue binary-searching within it.
      const newMid = Math.floor(midOffset / 2);
      return this.readMemoryFirstFault(address, count, newMid);
    }
  }

  /**
   * Writes data to memory in the debugged program using a memory reference.
   * @param reference - Memory reference, as provided to writeMemory DAP request,
   *                    or a numeric value representing an address
   * @param data - The buffer containing data to write
   * @param offset - Optional offset from the reference address
   * @returns A promise that resolves when the write operation completes
   */
  async writeMemory(
    reference: string | number,
    data: Buffer,
    offset?: number,
  ): Promise<void> {
    if (typeof reference === "number") {
      reference = `0x${reference.toString(16)}`;
    }
    await this.vscodeSession.customRequest("writeMemory", {
      memoryReference: reference,
      data: data.toString("base64"),
      offset: offset,
    });
  }
  /**
   * Writes memory to an AP (Access Port) target address
   * @param apAddress - The address of the AP to access
   * @param address - The target memory address to write on the AP (should be 4-byte aligned)
   * @param data - The buffer containing data to write (should be 4-byte aligned and a multiple of 4 bytes in length)
   * @throws An error if the debug session type does not support AP access, the buffer is not properly aligned, or if a required command fails
   * or if address is not 4-byte aligned.
   *
   * Note: This method depends on custom monitor commands provided by this class's GDB helper script.
   * The script is loaded on demand before use, so no external launch configuration changes are required
   */
  public async writeMemoryAp(
    apAddress: number,
    address: number,
    data: Buffer,
  ): Promise<void> {
    if (
      !(
        this.vscodeSession.type === "cortex-debug" &&
        (this.vscodeSession.configuration.servertype === "jlink" ||
          this.vscodeSession.configuration.servertype === "external")
      )
    ) {
      throw new Error(
        "AP memory write is currently only supported for cortex-debug sessions with jlink or external server types",
      );
    }

    if (data.length % 4 !== 0) {
      throw new Error(
        "AP memory write currently only supports 4-byte aligned buffers",
      );
    }
    if (address % 4 !== 0) {
      throw new Error(
        "AP memory write currently only supports 4-byte aligned addresses",
      );
    }

    // Ensure the GDB script with AP read/write functions is loaded,
    // to ensure the required monitor commands are available.
    await this.ensureGDBScriptIsLoaded(READWRITE_AP_FUNCTIONS_SCRIPT);

    // 0xd00 is _CSW_REG_OFF DP reg to configure comm between DP-AP
    // eslint-disable-next-line no-bitwise
    const apBank = apAddress | 0xd00;
    let builtGDBCall = `${CONF_WRITE_TRANSACTION_FUNCTION} 0x${apBank.toString(16)} 0x${address.toString(16)} `;
    for (let offset = 0; offset < data.length; offset += 4) {
      const chunkValue = data.readUInt32LE(offset);
      builtGDBCall += `0x${chunkValue.toString(16)} `;
    }
    // 3 monitor commands with O.K. response, plus one O.K. per 4 bytes written
    const numberOfOKsExpected = 3 + data.length / 4;
    await this.evaluateREPL(
      builtGDBCall,
      new RegExp(
        `(?:O\\.K\\.\\r?\\n){${numberOfOKsExpected - 1}}O\\.K\\.(?:\\r?\\n)?`,
      ),
    );
  }

  /**
   * Gets the primary thread ID from the debug session.
   * @returns A promise that resolves to the thread ID
   */
  async getThreadId(): Promise<number> {
    const threads = await this.vscodeSession.customRequest("threads");
    const threadId = threads.threads[0]?.id;
    if (!threadId) {
      throw new Error("No active thread");
    }
    return threadId;
  }

  /**
   * Continues execution of the debugged program.
   * @param threadId - Optional thread ID, defaults to primary thread
   * @returns A promise that resolves when the continue request is sent
   */
  async continue(threadId?: number): Promise<void> {
    const tid = threadId ?? (await this.getThreadId());
    await this.vscodeSession.customRequest("continue", { threadId: tid });
  }

  /**
   * Steps over the current line of code.
   * @param threadId - Optional thread ID, defaults to primary thread
   * @returns A promise that resolves when the step over request is sent
   */
  async stepOver(threadId?: number): Promise<void> {
    const tid = threadId ?? (await this.getThreadId());
    await this.vscodeSession.customRequest("next", { threadId: tid });
  }

  /**
   * Steps into the current line of code.
   * @param threadId - Optional thread ID, defaults to primary thread
   * @returns A promise that resolves when the step into request is sent
   */
  async stepInto(threadId?: number): Promise<void> {
    const tid = threadId ?? (await this.getThreadId());
    await this.vscodeSession.customRequest("stepIn", { threadId: tid });
  }

  /**
   * Steps out of the current function.
   * @param threadId - Optional thread ID, defaults to primary thread
   * @returns A promise that resolves when the step out request is sent
   */
  async stepOut(threadId?: number): Promise<void> {
    const tid = threadId ?? (await this.getThreadId());
    await this.vscodeSession.customRequest("stepOut", { threadId: tid });
  }

  /**
   * Pauses execution of the debugged program.
   * @param threadId - Optional thread ID, defaults to primary thread
   * @returns A promise that resolves when the pause request is sent
   */
  async pause(threadId?: number): Promise<void> {
    const tid = threadId ?? (await this.getThreadId());
    await this.vscodeSession.customRequest("pause", { threadId: tid });
  }

  /**
   * Reads a register and returns the content of each of its fields.
   * Only bits that are described in the register definition are returned,
   * other bits are discarded.
   *
   * @param register - The register description containing address and field definitions
   * @returns A promise that resolves to an object mapping field names to their numeric values
   */
  async readRegister(
    register: RegisterDescription,
  ): Promise<Record<string, number>> {
    // For the moment we only support 32-bit registers, for bigger registers
    // we would need to make use of BigInt and adjust the buffer size accordingly
    const length = 4;

    const buffer =
      register.apAddress === undefined
        ? await this.readMemory(register.address, length)
        : await this.readMemoryAp(register.apAddress, register.address, length);

    const value = buffer.data.readUInt32LE(0);
    return Object.fromEntries(
      Object.entries(register.fields).map(
        ([fieldName, [bitOffset, bitLength]]) => {
          // BigInt needed for register fields of 32 bits
          // eslint-disable-next-line no-bitwise
          const mask = Number((1n << BigInt(bitLength)) - 1n);
          // eslint-disable-next-line no-bitwise
          const fieldValue = ((value >>> bitOffset) & mask) >>> 0;
          // >>> 0 to enforce unsigned values
          return [fieldName, fieldValue];
        },
      ),
    );
  }

  /**
   * Writes values to a register in the debugged program.
   * This method reads the current value of the register, updates the bits corresponding
   * to the provided fields, and writes the new value back to memory.
   * Only the fields provided on values are modified by this operation,
   * other bits of the register remain unchanged.
   *
   *
   * @param register - The register description containing address and field definitions
   * @param values - An object mapping field names to the numeric values to write on them.
   *                 Fields present on register that are not included in this object will
   *                 remain unchanged.
   * @returns A promise that resolves when the write operation completes
   */
  async writeRegister(
    register: RegisterDescription,
    values: Record<string, number>,
  ): Promise<void> {
    const registerValue = await this.readRegister(register);

    const valuesToWrite = {
      ...registerValue,
      ...values,
    };
    let value = 0;
    for (const [fieldName, fieldValue] of Object.entries(valuesToWrite)) {
      if (fieldName in register.fields === false) {
        throw new Error(
          `Field ${fieldName} is not defined in the register description (available fields: ${Object.keys(register.fields).join(", ")})`,
        );
      }
      const [bitOffset, bitLength] = register.fields[fieldName];
      // BigInt needed for register fields of 32 bits
      // eslint-disable-next-line no-bitwise
      const mask = Number((1n << BigInt(bitLength)) - 1n);
      // eslint-disable-next-line no-bitwise
      value |= (fieldValue & mask) << bitOffset;
    }

    // For the moment we only support 32-bit registers, for bigger registers
    // we would need to make use of BigInt and adjust the buffer size accordingly
    const writeBuffer = Buffer.alloc(4);

    // >>> 0 to enforce unsigned values
    // eslint-disable-next-line no-bitwise
    writeBuffer.writeUInt32LE(value >>> 0, 0);

    if (register.apAddress !== undefined) {
      await this.writeMemoryAp(
        register.apAddress,
        register.address,
        writeBuffer,
      );
    } else {
      await this.writeMemory(register.address, writeBuffer);
    }
  }

  // Debug Adapter Tracker methods
  /**
   * Called by VS Code when the debug session is about to start.
   */
  onWillStartSession(): void {
    this.onStartEmitter.fire();
  }

  /**
   * Called by VS Code when the debug session is about to stop.
   */
  onWillStopSession(): void {
    this.onStopEmitter.fire();
  }

  /**
   * Called by VS Code when the debug adapter sends a message.
   * @param message - The message sent by the debug adapter
   */
  onDidSendMessage(message: any) {
    switch (message.type) {
      case "event":
        this.onDebugAdapterEvent(message);
        break;
      case "response":
        if (message.success === true) {
          this.onDebugAdapterResponse(message);
        }
        break;
    }
  }

  // Debug Adapter processing convenience methods
  onDebugAdapterEvent(message: any) {
    switch (message.event) {
      case "output":
        // Capture console output for evaluateREPL responses.
        // this.evaluateOutputBuffer !== undefined indicates
        // an ongoing execution of evaluateREPL.
        //
        // Mixing of outputs from concurrent evaluateREPL calls
        // is prevented by the mutex in evaluateREPL method,
        // although this can potentially be problematic
        // if output events of category console are triggered
        // by other means while an evaluateREPL is ongoing.
        if (
          (message.body?.category === "console" ||
            message.body?.category === "stdout") &&
          this.evaluateOutputBuffer !== undefined
        ) {
          this.evaluateOutputBuffer += message.body.output;
        }
        break;
      case "continued":
        this.processContinue();
        break;
      case "stopped":
        this.processHalt({
          reason: message.body?.reason ?? "unknown",
          hitBreakpointIds: message.body?.hitBreakpointIds,
          threadId: message.body?.threadId,
          description: message.body?.description,
        });
        break;
    }
  }

  onDebugAdapterResponse(message: any) {
    switch (message.command) {
      case "launch":
      case "attach":
      case "continue":
      case "next":
      case "stepIn":
      case "stepOut":
        this.processContinue();
        break;
      case "pause":
        break;
    }
  }

  /**
   * Processes a continue operation, updating the running state and firing the continue event.
   * Prevents duplicate events if the session is already marked as running.
   * Note: Some debug adapters incorrectly send continued events as responses to continue requests,
   * which violates the DAP spec, so we guard against duplicate state changes.
   */
  private processContinue() {
    if (!this.running) {
      this.running = true;
      this.onContinueEmitter.fire();
    }
  }

  /**
   * Processes a halt operation, updating the running state and firing the halt event.
   * Only fires the event if the session was previously running.
   */
  private processHalt(stopInfo?: StopInfo) {
    if (this.running) {
      this.running = false;
      const info = stopInfo ?? { reason: "unknown" };
      this.stopInfo = info;
      this.onHaltEmitter.fire(info);
    }
  }
}
