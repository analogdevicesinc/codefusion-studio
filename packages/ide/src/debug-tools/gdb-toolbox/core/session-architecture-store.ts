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

import type { GdbToolboxScript } from "../types/types";

/**
 * Sentinel architecture value recorded when a session's architecture cannot be
 * determined (unrecognised `show architecture` output or a failed query).
 * Storing this distinct value—rather than clearing the entry—keeps
 * architecture filtering active so unknown targets only expose
 * architecture-agnostic scripts instead of bypassing the filter entirely.
 */
export const UNKNOWN_ARCHITECTURE = "unknown";

/**
 * Maps the output of GDB's `show architecture` command to a recognised
 * architecture id. Returns {@link UNKNOWN_ARCHITECTURE} when the output is not a
 * string or does not match a known architecture (e.g. SHARC-FX targets), so the
 * caller can keep architecture filtering active rather than bypassing it.
 */
export function detectArchitecture(showArchitectureOutput: unknown): string {
  if (typeof showArchitectureOutput === "string") {
    const lower = showArchitectureOutput.toLowerCase();
    if (lower.includes("arm")) return "arm";
    if (lower.includes("riscv")) return "riscv";
    if (lower.includes("xtensa")) return "xtensa";
  }
  return UNKNOWN_ARCHITECTURE;
}

/**
 * Determines whether a script should be visible for the given session
 * architecture. Scripts without any architecture constraint are always visible;
 * constrained scripts are visible only when they declare the session's
 * architecture. The unknown sentinel therefore matches only unconstrained
 * (architecture-agnostic) scripts.
 *
 * @param script - The script whose `arch`/`core` metadata is evaluated. `core`
 * is deprecated in favour of `arch` but is still honoured for compatibility.
 * @param sessionArch - The session's detected architecture.
 */
export function isScriptSupportedForArchitecture(
  script: Pick<GdbToolboxScript, "arch" | "core">,
  sessionArch: string,
): boolean {
  const isUnconstrained = !script.arch && !script.core;
  // The sentinel is not a real architecture, so never match declared values
  // (e.g. a user script with `arch: "unknown"`); only unconstrained scripts show.
  if (sessionArch === UNKNOWN_ARCHITECTURE) {
    return isUnconstrained;
  }
  return (
    isUnconstrained ||
    (script.arch?.includes(sessionArch) ?? false) ||
    (script.core?.includes(sessionArch) ?? false)
  );
}

/**
 * Stores the processor architecture detected for each debug session so GDB
 * Toolbox components can share it through a typed contract instead of relying
 * on process-global state.
 */
export class SessionArchitectureStore {
  private readonly architectureBySessionId = new Map<string, string>();

  /**
   * Records the detected architecture for a debug session.
   */
  public set(sessionId: string, architecture: string): void {
    this.architectureBySessionId.set(sessionId, architecture);
  }

  /**
   * Returns the detected architecture for a debug session, or undefined if none
   * has been recorded.
   */
  public get(sessionId: string): string | undefined {
    return this.architectureBySessionId.get(sessionId);
  }

  /**
   * Removes any recorded architecture for a debug session.
   */
  public delete(sessionId: string): void {
    this.architectureBySessionId.delete(sessionId);
  }
}
