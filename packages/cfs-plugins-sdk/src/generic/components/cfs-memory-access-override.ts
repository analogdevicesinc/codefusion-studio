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

import { CfsPluginInfo } from "cfs-types";

/**
 * Service for handling memory access overrides in CFS plugins
 */
export class CfsMemoryAccessOverrides {
	/**
	 * Constructor
	 * @param cfsPluginInfo - The plugin information containing access overrides
	 */
	constructor(protected cfsPluginInfo: CfsPluginInfo) {}

	/**
	 * Get memory access overrides
	 * @param partName - The part name to get the overrides for
	 * @return Memory access overrides if any available
	 */
	getMemoryAccessOverrides(
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		partName: string,
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		coreId: string
	): Record<string, string[] | undefined> | undefined {
		return undefined;
	}
}
