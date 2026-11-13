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

import type { WestProjectStatus } from "../types";

/** What west and git report about one project. */
export type ProjectState = {
  active: boolean;
  cloned: boolean;
  head?: string;
  manifestRev?: string;
  /** The commit west.yml names; absent when it cannot be resolved offline, such as a branch. */
  manifestTarget?: string;
  modified: boolean;
  untracked: boolean;
};

/**
 * Picks the one badge a project shows. The first match wins:
 * disabled, not cloned, different revision, modified, untracked, in sync.
 */
export function classifyProjectStatus(state: ProjectState): WestProjectStatus {
  if (!state.active) return "disabled";

  if (!state.cloned) return "not-cloned";

  // No manifest-rev means west update never completed for the project.
  if (!state.manifestRev || state.head !== state.manifestRev) {
    return "different-revision";
  }

  // west.yml changed since the last west update.
  if (state.manifestTarget && state.manifestTarget !== state.manifestRev) {
    return "different-revision";
  }

  if (state.modified) return "modified-files";

  if (state.untracked) return "untracked-files";

  return "in-sync";
}
