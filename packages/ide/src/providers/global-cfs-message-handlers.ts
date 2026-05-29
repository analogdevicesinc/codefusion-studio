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

import { Messenger } from "vscode-messenger";
import { getAvailableAiModelsRequest } from "../constants/messages/global-cfs-messages";
import { findWorkspaceConfigFile } from "cfs-lib";
import { readJsonFile } from "cfs-lib";
import type { CfsConfig, AIModel } from "cfs-types";
import { getWorkspaceRoot } from "../utils/utils";

/**
 * This function registers message handlers related to general cfs data and functionality.
 * These are available globally for all webviews to use, and are not specific to any one webview.
 */
export function registerGlobalCfsMessageHandlers(messenger: Messenger) {
  messenger.onRequest(getAvailableAiModelsRequest, async () => {
    const aiModels: AIModel[] = [];

    // Get all workspace folders
    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot) {
      return [];
    }

    let cfsconfig: string | undefined;
    try {
      cfsconfig = findWorkspaceConfigFile(workspaceRoot);
    } catch (error) {
      console.warn(
        `Failed to find config file in workspace ${workspaceRoot}:`,
        error,
      );
    }

    if (!cfsconfig) {
      return [];
    }

    try {
      const config = readJsonFile<CfsConfig>(cfsconfig);
      config.Projects.forEach((project) => {
        aiModels.push(...(project.AIModels ?? []));
      });
    } catch (error) {
      // Log error but continue with next file
      console.warn(`Failed to parse config file ${cfsconfig}:`, error);
    }

    return aiModels;
  });
}
