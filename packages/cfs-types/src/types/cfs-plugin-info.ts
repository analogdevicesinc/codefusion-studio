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

import type { CfsPluginProperty } from "./cfs-plugin-property.js";
import type { CfsFeature, CfsFeatureScope } from "./cfs-feature.js";
import type { CfsSocInfo } from "./cfs-soc-info.js";

/**
 * Contents of the .cfsplugin file that describe the CFS plugin
 */
export interface CfsPluginInfo {
	/**
	 * Schema version for this file
	 */
	schemaVersion: string;

	/**
	 * Path to the .cfsplugin file
	 */
	pluginPath: string;

	/**
	 * Name of the plugin
	 */
	pluginName: string;

	/**
	 * Description of the plugin
	 */
	pluginDescription: string;

	/**
	 * Unique identifier for the plugin
	 */
	pluginId: string;

	/**
	 * Version of the plugin
	 */
	pluginVersion: string;

	/**
	 * Version of the plugin API used by the plugin
	 */
	pluginApiVersion: number;

	/**
	 * Minimum version of the CfsConfig schema supported by the plugin
	 */
	minConfigSchema: number;

	/**
	 * Maximum version of the CfsConfig schema supported by the plugin
	 */
	maxConfigSchema: number;

	/**
	 * Author of the plugin
	 */
	author: string;

	/**
	 * List of SoCs supported by the plugin
	 */
	supportedSocs: CfsSocInfo[];

	/**
	 * Firmware platform supported by the plugin
	 */
	firmwarePlatform: string;

	/**
	 * Plugin to extend
	 */
	extends: { pluginId: string; pluginVersion: string };

	/**
	 * Map of CfsFeatures supported by the plugin
	 */
	features: Record<CfsFeatureScope, CfsFeature>;

	/**
	 * Plugin properties to display in the UI, by scope
	 */
	properties?: Record<CfsFeatureScope, CfsPluginProperty[]>;

	/**
	 * CfsConfig default overrides
	 */
	configOverrides: [];

	/**
	 * List of host platforms supported by the plugin. If not set, it will be assumed all platforms are supported.
	 */
	supportedHostPlatforms?: string[];
}
