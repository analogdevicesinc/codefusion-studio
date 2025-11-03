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

import { TelemetryManager } from "cfs-lib";
import {
  CFS_TELEMETRY_ENABLE,
  CFS_TELEMETRY_USER_ID,
  EXTENSION_ID,
} from "../constants";
import * as vscode from "vscode";
import { Utils } from "../utils/utils";
import { v4 as uuid } from "uuid";

export const getTelemetryManager = async () => {
  const config = vscode.workspace.getConfiguration(EXTENSION_ID);
  const isGlobalTelemetryEnabled = vscode.env.isTelemetryEnabled;
  const isCfsTelemetryEnabled = config.get(CFS_TELEMETRY_ENABLE) as boolean;
  const isTelemetryEnabled = isGlobalTelemetryEnabled && isCfsTelemetryEnabled;
  const userId = await getUserId();
  const vscodeVersion = vscode.version;
  const sessionId = vscode.env.sessionId;

  return new TelemetryManager(
    isTelemetryEnabled,
    Utils.getExtensionVersion() ?? "",
    vscodeVersion,
    userId,
    sessionId,
  );
};

const getUserId = async (): Promise<string> => {
  const config = vscode.workspace.getConfiguration(EXTENSION_ID);
  const userId = config.get(CFS_TELEMETRY_USER_ID) as string;

  if (!userId) {
    return await generateUserId(config);
  }

  return userId;
};

const generateUserId = async (
  config: vscode.WorkspaceConfiguration,
): Promise<string> => {
  const userId = uuid();

  await config.update(CFS_TELEMETRY_USER_ID, userId, true);

  return userId;
};

/**
 *
 * Function to handle potentially sensitive telemetry data.
 * @param data - Data to obfuscate, if needed
 * @param isAdiDeveloped - Whether to obfuscate the data or not.
 * @returns The original data or "Custom" if obfuscation is applied.
 */
export const handleSensitiveTelemetryData = (
  data: string,
  isAdiDeveloped: boolean,
): string => {
  if (!data) {
    return "";
  }
  if (isAdiDeveloped) {
    return data;
  }
  return "Custom";
};
