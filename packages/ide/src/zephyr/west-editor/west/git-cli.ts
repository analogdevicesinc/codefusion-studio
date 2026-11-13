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

import type { GitClient, ProjectChanges, ProjectRevisions } from "./clients";
import { WestEngineError } from "./errors";
import type { CommandResult, CommandRunner } from "./runner";

/** The branch `west update` points at the commit the manifest asked for. */
const MANIFEST_REV = "refs/heads/manifest-rev";

/** A full commit id, SHA-1 or SHA-256. */
const COMMIT_ID = /^[0-9a-f]{40}([0-9a-f]{24})?$/;

/** A local or remote-tracking branch, as `--symbolic-full-name` prints it. */
const BRANCH_REF = /^refs\/(heads|remotes)\//;

/** Reads a project's checkout through the `git` command line. */
export class GitCli implements GitClient {
  constructor(
    private readonly runner: Pick<CommandRunner, "run">,
    private readonly command = "git",
  ) {}

  /** The commits HEAD and `manifest-rev` point to in the repository at `dir`. */
  async revisions(
    dir: string,
    signal?: AbortSignal,
  ): Promise<ProjectRevisions> {
    const result = await this.git(
      dir,
      ["rev-parse", "HEAD", MANIFEST_REV],
      signal,
    );

    // git echoes a ref it cannot resolve by name and exits non-zero, so an
    // empty stdout is the only real failure, such as not being a repository.
    if (result.exitCode !== 0 && !result.stdout.trim()) {
      throw this.failure("rev-parse", result);
    }

    const [head, manifestRev] = result.stdout
      .split(/\r?\n/)
      .map((line) => (COMMIT_ID.test(line) ? line : undefined));

    return { head, manifestRev };
  }

  /** Whether the working tree at `dir` has modified or untracked files. */
  async changes(dir: string, signal?: AbortSignal): Promise<ProjectChanges> {
    const result = await this.git(dir, ["status", "--porcelain"], signal);

    if (result.exitCode !== 0) throw this.failure("status", result);

    const lines = result.stdout.split(/\r?\n/).filter(Boolean);

    return {
      modified: lines.some((line) => !line.startsWith("??")),
      untracked: lines.some((line) => line.startsWith("??")),
    };
  }

  /** The commit a tag or SHA `revision` names locally, a full SHA not in the repository
   * as written; undefined for a branch or an unknown name. */
  async resolve(
    dir: string,
    revision: string,
    signal?: AbortSignal,
  ): Promise<string | undefined> {
    // A leading dash would be read as an option.
    if (revision.startsWith("-")) return undefined;

    // A full SHA may name an annotated tag, which west peels to its commit.
    // Not fetched yet, it still names that commit as written.
    if (COMMIT_ID.test(revision)) {
      return (await this.commitOf(dir, revision, signal)) ?? revision;
    }

    const ref = await this.git(
      dir,
      ["rev-parse", "--verify", "--quiet", "--symbolic-full-name", revision],
      signal,
    );

    // West fetches a branch before trusting it, so a local one may be stale.
    if (ref.exitCode !== 0 || BRANCH_REF.test(ref.stdout.trim())) {
      return undefined;
    }

    return this.commitOf(dir, revision, signal);
  }

  /** The commit `revision` peels to locally; undefined when it is not in the repository. */
  private async commitOf(
    dir: string,
    revision: string,
    signal?: AbortSignal,
  ): Promise<string | undefined> {
    const commit = await this.git(
      dir,
      ["rev-parse", "--verify", "--quiet", `${revision}^{commit}`],
      signal,
    );
    const id = commit.stdout.trim();

    return commit.exitCode === 0 && COMMIT_ID.test(id) ? id : undefined;
  }

  private git(
    dir: string,
    args: string[],
    signal?: AbortSignal,
  ): Promise<CommandResult> {
    return this.runner.run(this.command, args, { cwd: dir, signal });
  }

  private failure(subcommand: string, result: CommandResult): WestEngineError {
    return new WestEngineError(
      "failed",
      `git ${subcommand} exited with code ${result.exitCode}`,
      result.stderr,
    );
  }
}
