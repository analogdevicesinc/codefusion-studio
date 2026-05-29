/**
 *
 * Copyright (c) 2024-2026 Analog Devices, Inc.
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

import type { CfsFileMap } from "./cfs-file-map.js";

/**
 * Feature scope relating to different aspects of CFS plugin functionality.
 *
 * @remarks
 * This is a union type (not an enum) to avoid generating runtime code.
 * Use string literals directly: 'workspace', 'project', 'codegen', etc.
 */
export type CfsFeatureScope =
	| "workspace" // Feature scope relating to workspace generation
	| "project" // Feature scope relating to project generation
	| "codegen" // Feature scope relating to code generation
	| "memory" // Feature scope relating to memory allocation
	| "peripheral" // Feature scope relating to peripheral configuration
	| "pinConfig" // Feature scope relating to Pin configuration
	| "clockConfig" // Feature scope relating to clock configuration
	| "dfg" // Feature scope relating to data flow gasket configuration
	| "aiprof"; // Feature scope relating to AI model profiling for workspace generation

export interface CfsFeature {
	/**
	 * Files to copy over as-is
	 */
	files: CfsFileMap[];

	/**
	 * Templates to copy then run through the Eta template engine
	 */
	templates: CfsFileMap[];
}
