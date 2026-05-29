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
 * Shape of the CLI user configuration file (~/.config/cfsutil/config.json).
 * Extends the existing config format with settings and env fields
 * for task execution.
 */
export type CliConfig = {
  /** Custom data model search paths */
  dataModelSearchPaths?: string[];
  /** Custom tool search paths */
  toolSearchPaths?: string[];
  /** CFS install path */
  cfsInstallPath?: string;
  /** Catalog store path */
  catalogStorePath?: string;
  /** VS Code setting overrides (e.g., "cfs.project.target": "MAX32690") */
  settings?: Record<string, boolean | number | string | unknown>;
  /** Additional environment variables for task execution */
  env?: Record<string, string>;
};
