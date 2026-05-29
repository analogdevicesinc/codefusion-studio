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

import type { CfsPluginInfo } from "./cfs-plugin-info.js";

/**
 * Represents a CFS plugin, which can be a composition of multiple services.
 * Use it as a generic to specify which services a plugin is expected to provide.
 * e.g. CfsPlugin<CfsWorkspaceGenerationService & CfsProjectGeneratorService>
 * @param pluginInfo - The .cfsplugin file information for the plugin.
 */
export type CfsPlugin<T> = new (
  pluginInfo: CfsPluginInfo
) => Partial<T>;
