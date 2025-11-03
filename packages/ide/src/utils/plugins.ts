/**
 *
 * Copyright (c) 2025 Analog Devices, Inc.
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
import { CfsPluginManager } from "cfs-lib";
import { ConfiguredProject } from "cfs-plugins-api";

/**
 * Finds missing project plugins by comparing configured projects against
 * the plugins currently available in the system.
 *
 * If no plugins are missing, the array will be empty.
 *
 * @param projects - Configured projects, each specifying a PluginId and PluginVersion.
 * @param pluginManager - Manager used to retrieve available plugins.
 * @returns Array of entries describing missing plugins.
 */
export async function getMissingProjectPlugins(
  projects: ConfiguredProject[],
  pluginManager: CfsPluginManager,
): Promise<Array<{ PluginId: string; PluginVersion: string }>> {
  const pluginInfoList = await pluginManager.getPluginsInfoList();

  const missing = projects
    .filter(
      ({ PluginId, PluginVersion }) =>
        PluginId.trim() !== "" && // exclude empty pluginIds
        !pluginInfoList.some(
          (info) =>
            info.pluginId === PluginId && info.pluginVersion === PluginVersion,
        ),
    )
    .map(({ PluginId, PluginVersion }) => ({
      PluginId,
      PluginVersion,
    }));

  // Remove duplicates
  const unique = Array.from(
    new Map(
      missing.map((p) => [`${p.PluginId}:${p.PluginVersion}`, p]),
    ).values(),
  );

  return unique;
}
