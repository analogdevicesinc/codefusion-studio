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

import type { WestClient, WestProjectInfo } from "./clients";
import { WestEngineError } from "./errors";
import type { CommandResult, CommandRunner } from "./runner";

/** `west list` fields read for every project, tab-separated: paths may hold spaces. */
const FIELDS = ["name", "path", "abspath", "revision", "cloned"] as const;

/** The manifest repository's reserved name; it is not a project card. */
const MANIFEST_PROJECT = "manifest";

/** Reads the resolved workspace through the `west` command line. */
export class WestCli implements WestClient {
  constructor(
    private readonly runner: Pick<CommandRunner, "run">,
    private readonly command = "west",
  ) {}

  /** Every project in the workspace at `topdir`, active or not. */
  async listProjects(
    topdir: string,
    signal?: AbortSignal,
  ): Promise<WestProjectInfo[]> {
    const result = await this.list(
      topdir,
      ["--all"],
      [...FIELDS, "active"],
      signal,
    );

    if (result.exitCode === 0) {
      return parseRows(result.stdout, FIELDS.length + 1).map((row) => ({
        ...toProject(row),
        active: row[FIELDS.length] === "active",
      }));
    }

    if (!result.stderr.includes('unknown key "active"')) {
      throw this.failure(result);
    }

    return this.listWithoutActiveKey(topdir, signal);
  }

  /** West before 1.4 has no `active` key: inactive projects are those only `--all` lists. */
  private async listWithoutActiveKey(
    topdir: string,
    signal?: AbortSignal,
  ): Promise<WestProjectInfo[]> {
    const [all, active] = await Promise.all([
      this.list(topdir, ["--all"], FIELDS, signal),
      this.list(topdir, [], ["name"], signal),
    ]);

    for (const result of [all, active]) {
      if (result.exitCode !== 0) throw this.failure(result);
    }

    const activeNames = new Set(
      parseRows(active.stdout, 1).map(([name]) => name),
    );

    return parseRows(all.stdout, FIELDS.length).map((row) => ({
      ...toProject(row),
      active: activeNames.has(row[0]),
    }));
  }

  private list(
    topdir: string,
    flags: string[],
    fields: readonly string[],
    signal?: AbortSignal,
  ): Promise<CommandResult> {
    const format = fields.map((field) => `{${field}}`).join("\t");

    return this.runner.run(this.command, ["list", ...flags, "-f", format], {
      cwd: topdir,
      signal,
    });
  }

  private failure(result: CommandResult): WestEngineError {
    return new WestEngineError(
      "failed",
      `west list exited with code ${result.exitCode}`,
      result.stderr,
    );
  }
}

/** Splits `west list` output into rows of `width` fields, dropping the manifest repository. */
function parseRows(stdout: string, width: number): string[][] {
  return stdout
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => {
      const row = line.split("\t");

      if (row.length !== width) {
        throw new WestEngineError(
          "failed",
          `unexpected west list line: ${line}`,
        );
      }

      return row;
    })
    .filter(([name]) => name !== MANIFEST_PROJECT);
}

function toProject(row: string[]): Omit<WestProjectInfo, "active"> {
  const [name, path, abspath, revision, cloned] = row;

  return { name, path, abspath, revision, cloned: cloned === "cloned" };
}
