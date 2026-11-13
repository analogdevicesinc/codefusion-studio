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

import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import type {
  CommandResult,
  RunOptions,
} from "../../zephyr/west-editor/west/runner";

/**
 * Creates `entries` under `root`, in the order given so a test can tell
 * sorting apart from the order the disk happens to return. An entry ending in
 * `/` is a directory, anything else an empty file.
 */
export async function createLayout(
  root: string,
  entries: string[],
): Promise<void> {
  for (const entry of entries) {
    const target = path.join(root, entry);

    if (entry.endsWith("/")) {
      await fs.mkdir(target, { recursive: true });
    } else {
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, "");
    }
  }
}

/** Creates an empty directory under the OS temp directory. */
export async function createTempDir(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

/** One command a {@link FakeRunner} received. */
export type RunCall = { command: string; args: string[]; cwd: string };

/**
 * Stands in for `CommandRunner`: records each call and answers with
 * `respond`, which returns a result or throws as the real runner would.
 */
export class FakeRunner {
  readonly calls: RunCall[] = [];

  constructor(
    private readonly respond: (call: RunCall) => Partial<CommandResult>,
  ) {}

  async run(
    command: string,
    args: string[],
    { cwd }: RunOptions,
  ): Promise<CommandResult> {
    const call = { command, args, cwd };
    this.calls.push(call);

    return { stdout: "", stderr: "", exitCode: 0, ...this.respond(call) };
  }
}
