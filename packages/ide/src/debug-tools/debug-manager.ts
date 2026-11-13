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

import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

import { Mutex } from "../utils/mutex";

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

/**
 * Options for running a GDB command in a debug session.
 */
export interface GdbCommandOptions {
  /**
   * Echo the command output to the Debug Console when the debug adapter does
   * not stream it itself (e.g. cppdbg). Enable this for user-initiated
   * commands whose output is meant to be read in the Debug Console, so that
   * such adapters match adapters that stream their output (e.g. cortex-debug).
   * Defaults to false, keeping internal queries out of the Debug Console.
   */
  echoOutput?: boolean;
}

/**
 * Result of a REPL evaluation, including whether the debug adapter already
 * streamed the output to the Debug Console via DAP "output" events.
 */
export interface ReplEvaluation {
  /** The evaluation output, from "output" events or the evaluate response. */
  output: string;
  /**
   * True when the output was collected from DAP "output" events, which VS Code
   * also renders in the Debug Console. False when it was only available in the
   * evaluate response body, so nothing was shown to the user.
   */
  streamedToConsole: boolean;
}

/**
 * Determines the text that must be echoed to the Debug Console so that REPL
 * output is visible regardless of the debug adapter in use.
 * @param evaluation - The result of a REPL evaluation.
 * @returns The text to append to the Debug Console, or undefined when nothing
 * should be echoed because the adapter already streamed it (e.g. cortex-debug)
 * or the output is blank.
 */
export function getDebugConsoleEcho(
  evaluation: ReplEvaluation,
): string | undefined {
  if (evaluation.streamedToConsole || evaluation.output.trim() === "") {
    return undefined;
  }
  return evaluation.output.trimEnd();
}

const CONF_READ_TRANSACTION_FUNCTION = "configureSendAPReadTransaction";
const CONF_WRITE_TRANSACTION_FUNCTION = "configureSendAPWriteTransaction";

// CSW value for AP accesses (read and write). Bit layout:
//   Size[2:0]    = 0x2  → 32-bit transfers
//   AddrInc[5:4] = 0x1  → single-increment (address advances by transfer size per beat)
//   PROT[27:24]  = 0x3  → privileged data access (HPROT[1:0]=0b11 on AHB-AP)
// The PROT encoding is accepted by both AHB-AP (APH) and APB-AP (APB) implementations,
// making this value usable across mixed AP topologies.
// CSW for sequential-address AP writes (AddrInc = single-increment).
const CONF_SEQUENTIAL = 0x03000012;

// CSW for same-address AP reads: FIFO registers such as TMC RRD where
// the address must not advance between beats (AddrInc = disabled).
const CONF_NO_INCREMENT = 0x03000002;

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
          this.sessions.set(session.id, newSession);
          newSession.onStop(() => {
            this.sessions.delete(session.id);
          });
          this.onStartSessionEmitter.fire(newSession);
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

  // Assume the target is running until the adapter reports otherwise. Some
  // adapters (e.g. cppdbg used by the SHARC-FX xt-run simulator) emit the
  // initial "stopped" event before the "launch" response, so starting from
  // running ensures that first halt is not dropped by processHalt.
  private running: boolean = true;
  private stopInfo: StopInfo | undefined = undefined;
  private evaluateOutputBuffer: string | undefined = undefined;
  private gdbScriptLoadPromise: Promise<void> | undefined = undefined;

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
  private evaluateMutex: Mutex = new Mutex();

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
  // Method overload signatures intentionally repeat the same member name.
  // See: https://github.com/typescript-eslint/typescript-eslint/issues/291
  /* eslint-disable no-dupe-class-members */
  async evaluateREPL(expression: string): Promise<string>;
  async evaluateREPL(
    expression: string,
    resultPattern: RegExp,
  ): Promise<RegExpMatchArray>;
  async evaluateREPL(
    expression: string,
    resultPattern?: RegExp,
  ): Promise<string | RegExpMatchArray> {
    const { output: result } = await this.evaluate(expression);

    if (resultPattern) {
      const match = result.trimStart().match(resultPattern);
      if (!match) {
        throw new Error(
          `No match found for regex ${resultPattern} in output: ${result}`,
        );
      }
      return match;
    }

    return result;
  }
  /* eslint-enable no-dupe-class-members */

  /**
   * Runs a GDB command in the session, handling adapter-specific quirks.
   * cppdbg (e.g. the SHARC-FX xt-run simulator) evaluates bare REPL input as a
   * C expression (via -var-create), so GDB CLI commands must be prefixed with
   * "-exec" to run. MI commands (already starting with "-") and other adapters
   * are passed through unchanged.
   * @param command - The GDB command to run (e.g. "info registers").
   * @param options - Options controlling how the output is surfaced.
   * @returns A promise that resolves to the command output.
   */
  async evaluateGdbCommand(
    command: string,
    options: GdbCommandOptions = {},
  ): Promise<string> {
    const needsExecPrefix =
      this.vscodeSession.type === "cppdbg" &&
      !command.trimStart().startsWith("-");
    const evaluation = await this.evaluate(
      needsExecPrefix ? `-exec ${command}` : command,
    );

    if (options.echoOutput) {
      const echo = getDebugConsoleEcho(evaluation);
      if (echo !== undefined) {
        this.appendToDebugConsole(echo);
      }
    }

    return evaluation.output;
  }

  /**
   * Appends a line to the Debug Console of the active debug session.
   * @param text - The text to append.
   */
  private appendToDebugConsole(text: string): void {
    vscode.debug.activeDebugConsole.appendLine(text);
  }

  /**
   * Evaluates an expression, serialising concurrent calls so that the shared
   * output event buffer is not mixed up between evaluations.
   * @param expression - The expression to evaluate.
   * @returns A promise that resolves to the evaluation output and its origin.
   */
  private async evaluate(expression: string): Promise<ReplEvaluation> {
    return this.evaluateMutex.withLock(() =>
      this.evaluateREPL_Internal(expression),
    );
  }

  /**
   * This method is unsafe to be used concurrently, as it relies on
   * shared console output events from debug adapter.
   */
  private async evaluateREPL_Internal(
    expression: string,
  ): Promise<ReplEvaluation> {
    // Guard evaluate requests while the target is running to avoid
    // cortex-debug throwing a different error path than other customRequest
    // commands, where we handle errors consistently.
    if (this.running && this.vscodeSession.type === "cortex-debug") {
      throw new Error(
        `Cannot evaluate REPL expression while target is running (${this.vscodeSession.type} session).`,
      );
    }
    this.evaluateOutputBuffer = "";
    // Some debug adapters (e.g. cppdbg, used by the SHARC-FX xt-run simulator)
    // require a frameId to evaluate REPL expressions and reject the request
    // otherwise. Only resolve and send the top frame for those adapters. Other
    // adapters (e.g. cortex-debug) default to the user's currently selected
    // frame, so forcing frame 0 would break expressions like the Memory
    // Viewer's `&localVariable` when a lower stack frame is selected. This is
    // best-effort: if the stack trace can't be obtained, fall back to omitting
    // the frameId.
    const frameId =
      this.vscodeSession.type === "cppdbg"
        ? await this.getTopFrameId()
        : undefined;
    const response = await this.vscodeSession.customRequest("evaluate", {
      expression: expression,
      frameId: frameId,
      context: "repl",
    });
    const streamedOutput = this.evaluateOutputBuffer;
    this.evaluateOutputBuffer = undefined;

    if (streamedOutput) {
      return { output: streamedOutput, streamedToConsole: true };
    }

    // Some debug adapters (e.g. cppdbg) return REPL output directly in the
    // evaluate response body rather than streaming it via "output" events like
    // cortex-debug does. Fall back to the response result when no output events
    // were captured. Such output never reaches the Debug Console on its own.
    return {
      output: typeof response?.result === "string" ? response.result : "",
      streamedToConsole: false,
    };
  }

  /**
   * Resolves the frameId of the active thread's top stack frame, used to
   * scope REPL evaluate requests for adapters that require it.
   * @returns A promise that resolves to the top frame's id, or undefined if it
   * cannot be determined (e.g. the target is running or has no stack).
   */
  private async getTopFrameId(): Promise<number | undefined> {
    try {
      // Prefer the thread reported by the latest "stopped" event, since that
      // is the thread whose stack is relevant for the evaluate request. Fall
      // back to the first available thread when no stop info is present.
      const threadId = this.stopInfo?.threadId ?? (await this.getThreadId());
      const stackTrace = await this.vscodeSession.customRequest("stackTrace", {
        threadId: threadId,
        startFrame: 0,
        levels: 1,
      });
      return stackTrace?.stackFrames?.[0]?.id;
    } catch {
      return undefined;
    }
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
   * @returns A promise that resolves when the script is loaded
   */
  private async ensureGDBScriptIsLoaded(): Promise<void> {
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
    if (this.gdbScriptLoadPromise) {
      await this.gdbScriptLoadPromise;
      return;
    }
    // Due to CFSIO-26542 use "set" instructions at beginning of the functions to avoid the monitor commands being
    // interleaved with other monitor commands from other operations. Use dummy ones to ensure the atomicity of the AP transactions.
    const READ_DP_ID_FUNCTION = "readDPIDRegister";
    const READWRITE_AP_FUNCTIONS_SCRIPT = `define ${CONF_READ_TRANSACTION_FUNCTION}
      set $count = $arg2
      set $accumulator = 0
      monitor writeDP 2 $arg0
      monitor writeAP 0 $arg3
      monitor writeAP 1 $arg1
      while $accumulator < $count
        monitor readAP 3
        set $accumulator = $accumulator + 4
      end
    end
    define ${CONF_WRITE_TRANSACTION_FUNCTION}
      set $dummySet = 0
      monitor writeDP 2 $arg0
      monitor writeAP 0 0x${CONF_SEQUENTIAL.toString(16)}
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

    const loadFile = async () => {
      const tempDir = await fs.promises.mkdtemp(
        path.join(os.tmpdir(), "gdb-script-"),
      );
      const tempFilePath = path.join(tempDir, "script.gdb");
      const gdbPath = tempFilePath.replace(/\\/g, "/");

      try {
        await fs.promises.writeFile(
          tempFilePath,
          READWRITE_AP_FUNCTIONS_SCRIPT,
          {
            encoding: "utf-8",
            flag: "wx",
          },
        );

        await this.evaluateREPL(`source ${gdbPath}`);
      } finally {
        await fs.promises.rm(tempDir, { recursive: true, force: true });
      }

      await this.evaluateREPL(
        `${READ_DP_ID_FUNCTION}`,
        /O.K.:(0x[0-9a-fA-F]+)/,
      );
    };

    this.gdbScriptLoadPromise = loadFile().catch((err) => {
      this.gdbScriptLoadPromise = undefined;
      throw err;
    });
    await this.gdbScriptLoadPromise;
  }
  /**
   * Issues a `ReadMemAP` monitor command and returns the parsed hex words.
   * Output format: `O.K.:0xXXXXXXXX,0xXXXXXXXX,...` (comma-separated on one line).
   */
  private async readMemApSequential(
    apAddress: number,
    address: number,
    numberOfElems: number,
  ): Promise<string[]> {
    const readCommand = `monitor ReadMemAP 0x${apAddress.toString(16)} 0x${address.toString(16)} 0x${numberOfElems.toString(16)} 0`;
    const regEx = /O\.K\.:0x[0-9a-fA-F]{8}(?:,0x[0-9a-fA-F]{8})*[\r\n]*/;
    const match = await this.evaluateREPL(readCommand, regEx);
    return match[0].match(/0x[0-9a-fA-F]{8}/g) ?? [];
  }

  /**
   * Issues a `CONF_READ_TRANSACTION_FUNCTION` monitor command for repeated reads
   * at a fixed address and returns the parsed hex words.
   * Output format: three `O.K.` acknowledgement lines followed by one `O.K.:0xXXXXXXXX` per word.
   */
  private async readMemApSameAddress(
    apAddress: number,
    address: number,
    count: number,
  ): Promise<string[]> {
    // eslint-disable-next-line no-bitwise
    const apBank = apAddress | 0xd00; // 0xd00 is _CSW_REG_OFF DP reg to configure communication between the DP and AP.
    const readCommand = `${CONF_READ_TRANSACTION_FUNCTION} 0x${apBank.toString(16)} 0x${address.toString(16)} 0x${count.toString(16)} 0x${CONF_NO_INCREMENT.toString(16)}`;
    const regEx = /(?:O\.K\.\r?\n){3}(?:O\.K\.:0x[0-9a-fA-F]{8}(?:\r?\n|$))+/;
    const match = await this.evaluateREPL(readCommand, regEx);
    return match[0].match(/0x[0-9a-fA-F]{8}/g) ?? [];
  }

  /**
   * Reads memory from an AP (Access Port).
   * @param apAddress - The address of the AP to access
   * @param address - The target memory address to read on the AP. Must be 4-byte aligned.
   * @param count - The number of bytes to read, should be a multiple of 4 and > 0.
   * @param readSameAddress - If true, all reads will be performed on the same AP register (address),
   * which performs repeated/posted reads against a fixed address (for FIFO/data registers),
   * not sequential memory reads across increasing addresses.
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
    readSameAddress = false,
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
    await this.ensureGDBScriptIsLoaded();

    const numberOfElems = count / 4;
    const hexValues =
      readSameAddress && numberOfElems > 1
        ? await this.readMemApSameAddress(apAddress, address, count)
        : await this.readMemApSequential(apAddress, address, numberOfElems);

    if (hexValues.length !== numberOfElems) {
      throw new Error(
        `AP memory read returned ${hexValues.length} words, expected ${numberOfElems} (address=0x${address.toString(16)}, count=${count})`,
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
    await this.ensureGDBScriptIsLoaded();

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
    let tid = threadId;

    if (tid === undefined) {
      try {
        tid = await this.getThreadId();
      } catch {
        if (this.stopInfo?.threadId) {
          tid = this.stopInfo.threadId;
        } else {
          throw new Error(
            "Unable to determine a valid thread ID for pause request",
          );
        }
      }
    }

    await this.vscodeSession.customRequest("pause", { threadId: tid });
  }

  /* eslint-disable no-dupe-class-members */
  /**
   * Reads a register and returns the content of each of its fields.
   * Only bits that are described in the register definition are returned,
   * other bits are discarded.
   *
   * @param register - The register description containing address and field definitions
   * @param numberOfReads - Optional number of consecutive reads to perform on the register.
   * @returns A promise that resolves to an object mapping field names to their corresponding values read from the register.
   *           If `numberOfReads` is omitted, field values are returned as single numbers.
   *           If `numberOfReads` is provided, the return value is an array of records (length = numberOfReads),
   *           where each record maps field names to numbers.   */
  async readRegister(
    register: RegisterDescription,
  ): Promise<Record<string, number>>;
  async readRegister(
    register: RegisterDescription,
    numberOfReads: number,
  ): Promise<Record<string, number>[]>;
  async readRegister(
    register: RegisterDescription,
    numberOfReads?: number,
  ): Promise<Record<string, number> | Record<string, number>[]> {
    // For the moment we only support 32-bit registers, for bigger registers
    // we would need to make use of BigInt and adjust the buffer size accordingly
    const numberOfReadsInternal = numberOfReads ?? 1;
    if (!Number.isInteger(numberOfReadsInternal) || numberOfReadsInternal < 1) {
      throw new Error(
        `numberOfReads must be a positive integer (got ${numberOfReads})`,
      );
    }
    const length = numberOfReadsInternal * 4;
    const buffer =
      register.apAddress === undefined
        ? await (async () => {
            const chunks: MemoryData[] = [];
            for (let i = 0; i < numberOfReadsInternal; i++) {
              chunks.push(await this.readMemory(register.address, 4));
            }
            return {
              address: chunks[0].address,
              data: Buffer.concat(chunks.map((c) => c.data)),
            };
          })()
        : await this.readMemoryAp(
            register.apAddress,
            register.address,
            length,
            true,
          );
    const arrayRegs: Record<string, number>[] = [];
    for (let i = 0; i < numberOfReadsInternal; i++) {
      const offset = i * 4;
      const value = buffer.data.readUInt32LE(offset);
      arrayRegs[i] = {};
      for (const [fieldName, [bitOffset, bitLength]] of Object.entries(
        register.fields,
      )) {
        // BigInt needed for register fields of 32 bits
        // eslint-disable-next-line no-bitwise
        const mask = Number((1n << BigInt(bitLength)) - 1n);
        // eslint-disable-next-line no-bitwise
        const fieldValue = ((value >>> bitOffset) & mask) >>> 0;
        // >>> 0 to enforce unsigned values
        arrayRegs[i][fieldName] = fieldValue;
      }
    }
    return numberOfReads === undefined ? arrayRegs[0] : arrayRegs;
  }
  /* eslint-enable no-dupe-class-members */
  /**
   * Writes values to a register in the debugged program.
   * This method reads the current value of the register, updates the bits corresponding
   * to the provided fields, and writes the new value back to memory.
   * Only the fields provided on values are modified by this operation,
   * other bits of the register remain unchanged.
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
      // Note: "launch"/"attach" responses are intentionally not treated as a
      // resume. The target may stop at entry or a breakpoint as part of the
      // launch, and some adapters (e.g. cppdbg) send that "stopped" event
      // before the "launch" response; treating the response as a continue
      // would incorrectly flip the session back to running. Session start is
      // already assumed running (see `running` initial value).
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
  /**
   * Retrieves the executable path of the currently active debug session.
   * @returns The path to the executable if available, undefined otherwise
   */
  public getExecutablePath(): string | undefined {
    switch (this.vscodeSession.configuration.type) {
      case "cortex-debug":
        return this.vscodeSession.configuration.executable;
      case "stlinkgdbtarget":
        return this.vscodeSession.configuration.imagesAndSymbols?.[0]
          ?.imageFileName;
      default:
        return this.vscodeSession.configuration.program;
    }
  }
}
