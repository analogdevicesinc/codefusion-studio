/**
 *
 * Copyright (c) 2023-2024 Analog Devices, Inc.
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

import { Dependency } from "./dependency";

/**
 * Interface describing the `tool.json` file format, allowing external
 * tools to be dropped in and supported by the extension.
 */
export interface ToolInfo {
  /** Tool name */
  name: string;
  /** Tool description */
  description: string;
  /** Unique tool ID used for identifying the tool and comparing tool versions */
  id: string;
  /** Tool vendor */
  vendor: string;
  /** Tool version */
  version: string;
  /** `tool.json` schema version */
  schemaVersion: string;
  /** Optional dependencies */
  dependencies?: Dependency[];
  /** The relative path to the software license */
  license: string;
  /** Paths to add to the Path environment variable */
  paths: string[];
}
