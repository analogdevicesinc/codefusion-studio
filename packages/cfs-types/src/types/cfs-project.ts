/**
 *
 * Copyright (c) 2025-2026 Analog Devices, Inc.
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

export interface CfsProject extends Record<string, unknown> {
	/**
	 * The name of the project
	 */
	name: string;

	/**
	 * The core Id in the project
	 */
	coreId?: string;

	/**
	 * This is the path to the project folder relative to the workspace root
	 */
	path: string;

	/**
	 * The soc used in the project
	 */
	soc: string;

	/**
	 * The board used in the project
	 */
	board?: string;

	/**
	 * The package used in the project
	 */
	package: string;

	/**
	 * The id of the project. This is used to identify multiple projects under the same core
	 */
	id: string;

	/**
	 * The id of the plugin assigned to the project during workspace creation flow
	 */
	pluginId: string;

	/**
	 * The version of the plugin assigned to the project during workspace creation flow
	 */
	pluginVersion: string;

	/**
	 *
	 * Plugin specific configuration set during workspace creation flow.
	 */
	platformConfig: Record<string, unknown>;

	/**
	 * The operating system of the host machine
	 */
	hostPlatform?: string;

	/**
	 * True if this is considered to be the primary project.
	 */
	isPrimary?: boolean;
}
