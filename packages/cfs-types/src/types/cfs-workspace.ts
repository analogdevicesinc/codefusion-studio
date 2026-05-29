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

import type { CfsProject } from "./cfs-project.js";

export interface CfsWorkspace extends Record<string, unknown> {
	/**
	 * The workspace plugin ID used to generate the workspace, if applicable
	 */
	workspacePluginId?: string;

	/**
	 * The workspace plugin version used to generate the workspace, if applicable
	 */
	workspacePluginVersion?: string;

	/**
	 * The name of the workspace as specified by the user
	 */
	workspaceName: string;

	/**
	 * The location of the workspace as specified by the user
	 */
	location: string;

	/**
	 * The board used in the workspace
	 */
	board: string;

	/**
	 * The soc used in the workspace
	 */
	soc: string;

	/**
	 * The SoC package used in the workspace
	 */
	package: string;

	/**
	 * Project specific settings
	 */
	projects?: Partial<CfsProject>[];
}

export type AIModelCfsWorkspace = CfsWorkspace & {
	modelFile: string;
	sampleData: string;
};
