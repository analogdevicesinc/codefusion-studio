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

import { spawn } from "node:child_process";
import { WestEngineError } from "./errors";
import { isDirectory } from "./workspace";

/** Variables a host adds to, or overrides in, the process environment. */
export type CommandEnvironment = Record<string, string | undefined>;

/** Outcome of a command that ran to completion, whatever its exit code. */
export type CommandResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
};

/**
 * Overlays `overrides` on `base`; an `undefined` override unsets the name.
 * On Windows names match case-insensitively, so `PATH` replaces `Path`.
 */
export function mergeEnvironment(
  base: CommandEnvironment,
  overrides: CommandEnvironment = {},
  platform: NodeJS.Platform = process.platform,
): Record<string, string> {
  const merged: Record<string, string> = {};
  const normalize = (name: string) =>
    platform === "win32" ? name.toUpperCase() : name;
  const overridden = new Set(Object.keys(overrides).map(normalize));

  for (const [name, value] of Object.entries(base)) {
    if (value !== undefined && !overridden.has(normalize(name))) {
      merged[name] = value;
    }
  }

  for (const [name, value] of Object.entries(overrides)) {
    if (value !== undefined) merged[name] = value;
  }

  return merged;
}

/** How a {@link CommandRunner} starts its commands. */
export type CommandRunnerOptions = {
  /** The host's variables, resolved on every run so setting changes apply. */
  getEnvironment: () => Promise<CommandEnvironment | undefined>;
  /** Kills a command still running after this long. */
  timeoutMs?: number;
};

/** Where and how one command runs. */
export type RunOptions = {
  cwd: string;
  signal?: AbortSignal;
};

const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Starts west and git: the one place in the West engine that spawns.
 * A non-zero exit is returned for the caller to read; only failing to run
 * at all throws a {@link WestEngineError}.
 */
export class CommandRunner {
  constructor(private readonly options: CommandRunnerOptions) {}

  async run(
    command: string,
    args: string[],
    { cwd, signal }: RunOptions,
  ): Promise<CommandResult> {
    const label = [command, ...args].join(" ");

    if (signal?.aborted) {
      throw new WestEngineError("aborted", `${label} was cancelled`);
    }

    if (!(await isDirectory(cwd))) {
      throw new WestEngineError("failed", `${label}: no directory ${cwd}`);
    }

    const env = mergeEnvironment(
      process.env,
      await this.options.getEnvironment(),
    );

    // Cancelled during the awaits above: the abort listener is not attached yet.
    if (signal?.aborted) {
      throw new WestEngineError("aborted", `${label} was cancelled`);
    }

    const timeoutMs = this.options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd,
        env,
        shell: false,
        windowsHide: true,
      });
      const stdout: Buffer[] = [];
      const stderr: Buffer[] = [];
      const stderrText = () => Buffer.concat(stderr).toString("utf8");
      // Set when the runner kills the child, so `close` reports why.
      let stopped: WestEngineError | undefined;

      const stop = (error: WestEngineError) => {
        stopped ??= error;
        child.kill();
      };
      const onAbort = () =>
        stop(new WestEngineError("aborted", `${label} was cancelled`));
      const timer = setTimeout(
        () =>
          stop(
            new WestEngineError(
              "timeout",
              `${label} timed out after ${timeoutMs} ms`,
            ),
          ),
        timeoutMs,
      );
      const settle = () => {
        clearTimeout(timer);
        signal?.removeEventListener("abort", onAbort);
      };

      signal?.addEventListener("abort", onAbort, { once: true });
      child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk));
      child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));

      child.on("error", (error: NodeJS.ErrnoException) => {
        settle();
        reject(
          error.code === "ENOENT"
            ? new WestEngineError("not-installed", `${command} was not found`)
            : new WestEngineError("failed", `${label}: ${error.message}`),
        );
      });

      child.on("close", (code, killedBy) => {
        settle();

        if (stopped) {
          reject(
            new WestEngineError(stopped.kind, stopped.message, stderrText()),
          );
        } else if (code === null) {
          reject(
            new WestEngineError(
              "failed",
              `${label} was killed by ${killedBy}`,
              stderrText(),
            ),
          );
        } else {
          resolve({
            stdout: Buffer.concat(stdout).toString("utf8"),
            stderr: stderrText(),
            exitCode: code,
          });
        }
      });
    });
  }
}
