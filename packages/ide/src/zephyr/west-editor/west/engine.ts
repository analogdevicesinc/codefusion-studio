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

import * as path from "node:path";
import type {
  WestManifest,
  WestProject,
  WestProjectStatus,
  WestProjectStatuses,
} from "../types";
import type { GitClient, WestClient, WestProjectInfo } from "./clients";
import { WestEngineError } from "./errors";
import { GitCli } from "./git-cli";
import { CommandRunner, type CommandEnvironment } from "./runner";
import { classifyProjectStatus, type ProjectState } from "./status";
import { WestCli } from "./west-cli";
import { GIT_ENTRY, exists, findWestTopdir } from "./workspace";

/** Projects checked at once; each runs two git processes. */
const PROJECTS_IN_PARALLEL = 4;

/** West's revision for a project and file that name none. */
const DEFAULT_REVISION = "master";

/** What the West engine needs from its host. */
export type WestEngineOptions = {
  /** The host's variables for west and git, such as the SDK `PATH`. */
  getEnvironment: () => Promise<CommandEnvironment | undefined>;
  westCommand?: string;
  gitCommand?: string;
  timeoutMs?: number;
  /** Told about a project whose status could not be read; its card shows none. */
  onProjectError?: (projectName: string, error: unknown) => void;
  /** Which projects get a status; `"file"` by default. */
  scope?: WestStatusScope;
};

/**
 * `"file"`: every project of the open manifest, judged against that file when
 * outside the workspace. `"workspace"`: only projects of the resolved workspace.
 */
export type WestStatusScope = "file" | "workspace";

/** What the engine reads west and git through. */
export type WestEngineClients = {
  west: WestClient;
  git: GitClient;
};

/**
 * The single entry point for west-related questions: everything that runs
 * west or git for the West editor goes through here.
 */
export class WestEngine {
  private readonly west: WestClient;
  private readonly git: GitClient;

  /** @param clients Replace how west or git is read; the command lines by default. */
  constructor(
    private readonly options: WestEngineOptions,
    clients: Partial<WestEngineClients> = {},
  ) {
    const runner = new CommandRunner(options);

    this.west = clients.west ?? new WestCli(runner, options.westCommand);
    this.git = clients.git ?? new GitCli(runner, options.gitCommand);
  }

  /**
   * The status of every project in the workspace holding `manifestPath`.
   * Rejects only when cancelled through `signal`.
   *
   * @param manifest The open manifest, used for Not cloned when west fails.
   */
  async getProjectStatuses(
    manifestPath: string,
    manifest: WestManifest,
    signal?: AbortSignal,
  ): Promise<WestProjectStatuses> {
    const topdir = await findWestTopdir(path.dirname(manifestPath));

    if (!topdir) {
      return {
        statuses: {},
        unavailable: {
          reason: "not-a-workspace",
          message: `${manifestPath} is not in a west workspace`,
        },
      };
    }

    let projects: WestProjectInfo[];

    try {
      projects = await this.west.listProjects(topdir, signal);
    } catch (error) {
      rethrowIfAborted(error);

      return {
        statuses: await notClonedFromDisk(topdir, manifest.projects ?? []),
        unavailable: toUnavailable(error),
      };
    }

    const statuses: Record<string, WestProjectStatus> = {};

    await forEachLimited(projects, PROJECTS_IN_PARALLEL, async (project) => {
      try {
        statuses[project.name] = await this.statusOf(project, signal);
      } catch (error) {
        rethrowIfAborted(error);
        this.options.onProjectError?.(project.name, error);
      }
    });

    if (this.options.scope === "workspace") return { statuses };

    // The open file's projects outside the workspace (an import filter, or
    // unsaved edits) are judged against that file instead.
    const listed = new Set(projects.map((project) => project.name));
    const unlisted = (manifest.projects ?? []).filter(
      (project) => !listed.has(project.name),
    );
    const defaultRevision = manifest.defaults?.revision ?? DEFAULT_REVISION;

    await forEachLimited(unlisted, PROJECTS_IN_PARALLEL, async (project) => {
      try {
        const status = await this.fileStatusOf(
          topdir,
          project,
          defaultRevision,
          signal,
        );

        if (status) statuses[project.name] = status;
      } catch (error) {
        rethrowIfAborted(error);
        this.options.onProjectError?.(project.name, error);
      }
    });

    return { statuses };
  }

  /** A project outside the workspace against the open file's revision; undefined when that cannot be resolved offline. */
  private async fileStatusOf(
    topdir: string,
    project: WestProject,
    defaultRevision: string,
    signal?: AbortSignal,
  ): Promise<WestProjectStatus | undefined> {
    const dir = path.join(topdir, project.path ?? project.name);

    if (!(await exists(path.join(dir, GIT_ENTRY)))) return "not-cloned";

    const target = await this.git.resolve(
      dir,
      project.revision ?? defaultRevision,
      signal,
    );

    if (!target) return undefined;

    const [{ head }, changes] = await Promise.all([
      this.git.revisions(dir, signal),
      this.git.changes(dir, signal),
    ]);

    // The file's revision stands in for manifest-rev, which west never set here.
    return classifyProjectStatus({
      active: true,
      cloned: true,
      head,
      manifestRev: target,
      ...changes,
    });
  }

  private async statusOf(
    project: WestProjectInfo,
    signal?: AbortSignal,
  ): Promise<WestProjectStatus> {
    const state = { ...project, modified: false, untracked: false };

    // Disabled and uncloned projects are settled without git.
    if (!project.active || !project.cloned) {
      return classifyProjectStatus(state);
    }

    const [revisions, changes] = await Promise.all([
      this.revisionsOf(project, signal),
      this.git.changes(project.abspath, signal),
    ]);

    return classifyProjectStatus({ ...state, ...revisions, ...changes });
  }

  /**
   * HEAD, manifest-rev and the commit west.yml names. The quick rev-parse
   * calls run one after another, beside git status, to keep two processes
   * per project.
   */
  private async revisionsOf(
    project: WestProjectInfo,
    signal?: AbortSignal,
  ): Promise<Pick<ProjectState, "head" | "manifestRev" | "manifestTarget">> {
    const revisions = await this.git.revisions(project.abspath, signal);
    const manifestTarget = await this.git.resolve(
      project.abspath,
      project.revision,
      signal,
    );

    return { ...revisions, manifestTarget };
  }
}

/** Not cloned for those of `projects` with no `.git` on disk, when west cannot say. */
async function notClonedFromDisk(
  topdir: string,
  projects: WestProject[],
): Promise<Record<string, WestProjectStatus>> {
  const statuses: Record<string, WestProjectStatus> = {};

  for (const project of projects) {
    const dir = path.join(topdir, project.path ?? project.name);

    if (!(await exists(path.join(dir, GIT_ENTRY)))) {
      statuses[project.name] = "not-cloned";
    }
  }

  return statuses;
}

function toUnavailable(error: unknown): WestProjectStatuses["unavailable"] {
  return error instanceof WestEngineError
    ? { reason: error.kind, message: error.message }
    : { reason: "failed", message: String(error) };
}

function rethrowIfAborted(error: unknown): void {
  if (error instanceof WestEngineError && error.kind === "aborted") throw error;
}

/** Runs `task` over `items`, at most `limit` at a time, to cap concurrent git processes. */
async function forEachLimited<T>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<void>,
): Promise<void> {
  let next = 0;
  const worker = async () => {
    while (next < items.length) await task(items[next++]);
  };

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  );
}
