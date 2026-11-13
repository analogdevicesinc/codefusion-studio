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

/**
 * What the West engine asks of west and git, independent of how it is
 * answered. `WestCli` and `GitCli` answer through the command lines.
 */

/** A project of the resolved workspace. */
export type WestProjectInfo = {
  name: string;
  /** Relative to the topdir. */
  path: string;
  abspath: string;
  /** As written in the manifest. */
  revision: string;
  cloned: boolean;
  /** False when group filters or `manifest.project-filter` disable it. */
  active: boolean;
};

/** Where a project is, and where `west update` last put it. */
export type ProjectRevisions = {
  /** Absent in a repository with no commit. */
  head?: string;
  /** Absent when `west update` never completed for the project. */
  manifestRev?: string;
};

/** Local changes in a project's working tree. */
export type ProjectChanges = {
  /** Tracked files changed, staged or not. */
  modified: boolean;
  /** Files neither tracked nor ignored. */
  untracked: boolean;
};

/** Reads the resolved workspace. */
export interface WestClient {
  /** Every project in the workspace at `topdir`, active or not. */
  listProjects(
    topdir: string,
    signal?: AbortSignal,
  ): Promise<WestProjectInfo[]>;
}

/** Reads a project's checkout. */
export interface GitClient {
  /** The commits HEAD and `manifest-rev` point to in the repository at `dir`. */
  revisions(dir: string, signal?: AbortSignal): Promise<ProjectRevisions>;
  /** Whether the working tree at `dir` has modified or untracked files. */
  changes(dir: string, signal?: AbortSignal): Promise<ProjectChanges>;
  /** The commit a tag or SHA `revision` names locally, a full SHA not in the repository
   * as written; undefined for a branch or an unknown name. */
  resolve(
    dir: string,
    revision: string,
    signal?: AbortSignal,
  ): Promise<string | undefined>;
}
