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

import path from "path";
import * as fs from "fs/promises";
import type { CfsConfig, CfsPluginInfo } from "cfs-types";

/**
 * Service for providing default system configuration by CFS plugins
 * This implementation of the service overrides system configuration with
 * whatever information is provided on files stored on paths:
 * <plugin-dir>/config-patches/<SoC-ID>/system-<package>.json
 * <plugin-dir>/config-patches/<SoC-ID>/system.json
 *
 * If the file does not exist, input system configuration is returned unmodified
 */
export class CfsJsonSystemConfig {
	/**
	 * Constructor
	 * @param cfsPluginInfo - The plugin information containing property directives
	 */
	constructor(protected cfsPluginInfo: CfsPluginInfo) {}

	private async configureSystemWithFile(config: CfsConfig, filename: string) {
		const pluginDir = path.dirname(this.cfsPluginInfo.pluginPath);
		const patchPath = [
			pluginDir,
			"config-patches",
			config.Soc.toLowerCase(),
			filename
		].join("/");
		const patch = JSON.parse(
			await fs.readFile(patchPath, "utf-8")
		) as Record<string, unknown>;
		// This overrides any content that comes in from the .cfsconfig with
		// the content from the patch. It is assumed we don't want or need to
		// merge the content.
		Object.keys(patch).forEach((key) => (config[key] = patch[key]));
	}

	/**
	 * Receives a complete CfsConfig and returns an updated version of that configuration.
	 * This is requested only on the primary core.
	 * @param config - Overall system-level configuration, read from .cfsconfig file
	 * @returns CfsConfig, potentially modified.
	 */
	async configureSystem(config: CfsConfig): Promise<CfsConfig> {
		try {
			// We check a file specific for a package first, for example, system-wlp.json
			await this.configureSystemWithFile(config, "system" + "-" + config.Package.toLowerCase() + ".json");
		} catch {
			try {
				// We do a second attempt by checking a common file (without package), e.g., system.json
				await this.configureSystemWithFile(config, "system.json");
			} catch {
				// Do nothing if file is not found in both places.
				// Input config will be returned
			}
		}
		return config;
	}
}
