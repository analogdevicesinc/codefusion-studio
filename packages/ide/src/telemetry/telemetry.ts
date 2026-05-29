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

import {
  getHostPlatform,
  SessionManager,
  TelemetryManager,
  UserType,
} from "cfs-lib";
import {
  CFS_TELEMETRY_ENABLE,
  CFS_TELEMETRY_USER_ID,
  CFS_TELEMETRY_USER_TYPE,
  EXTENSION_ID,
} from "../constants";
import * as vscode from "vscode";
import { Utils } from "../utils/utils";
import { v4 as uuid } from "uuid";
import { promisify } from "node:util";
import { exec } from "node:child_process";
import { AuthConfigParser } from "../utils/auth-config";

export const getTelemetryManager = async () => {
  const config = vscode.workspace.getConfiguration(EXTENSION_ID);
  const isGlobalTelemetryEnabled = vscode.env.isTelemetryEnabled;
  const isCfsTelemetryEnabled = config.get(CFS_TELEMETRY_ENABLE) as boolean;
  const isTelemetryEnabled = isGlobalTelemetryEnabled && isCfsTelemetryEnabled;
  const userId = await getUserId();
  const userType = await determineUserType(isTelemetryEnabled);
  const vscodeVersion = vscode.version;
  const sessionId = vscode.env.sessionId;

  return new TelemetryManager(
    isTelemetryEnabled,
    Utils.getExtensionVersion() ?? "",
    vscodeVersion,
    userId,
    userType ?? UserType.EXTERNAL,
    sessionId,
  );
};

/**
 * Retrieves the user ID from extension settings.
 * @returns The user ID as a string.
 */
const getUserId = async (): Promise<string> => {
  const config = vscode.workspace.getConfiguration(EXTENSION_ID);
  const userId = config.get(CFS_TELEMETRY_USER_ID) as string;

  if (!userId) {
    return await generateUserId(config);
  }

  return userId;
};

/**
 * Retrieves the user type from extension settings.
 * @returns The user type, either "Internal" or "External".
 */
const getUserType = async (): Promise<UserType | undefined> => {
  const config = vscode.workspace.getConfiguration(EXTENSION_ID);
  const userType = config.get(CFS_TELEMETRY_USER_TYPE) as UserType;

  return userType === UserType.INTERNAL || userType === UserType.EXTERNAL ? userType : undefined;
};

/**
 * Sets the user type in the extension settings for telemetry caching purposes.
 * @param userType - The user type to set, either "Internal" or "External".
 * @returns A promise that resolves when the user type has been set.
 */
const setUserType = async (userType: UserType): Promise<void> => {
  const config = vscode.workspace.getConfiguration(EXTENSION_ID);
  await config.update(CFS_TELEMETRY_USER_TYPE, userType, true);
};

const generateUserId = async (
  config: vscode.WorkspaceConfiguration,
): Promise<string> => {
  const userId = uuid();

  await config.update(CFS_TELEMETRY_USER_ID, userId, true);

  return userId;
};

/**
 * Determines if the user is an internal or an external user
 * @returns "Internal" if the user is an internal ADI user, otherwise "External". Can return undefined if telemetry is disabled or if there was an error determining the user type.
 */
export const determineUserType = async (
  isTelemetryEnabled: boolean,
): Promise<UserType | undefined> => {

  if (!isTelemetryEnabled) {
    return undefined;
  }

  const userType = await getUserType();

  if (userType) {
    return userType;
  }

  try {
    const authConfig = new AuthConfigParser().getConfig();
    const sessionManager = new SessionManager(authConfig);
    const session = await sessionManager.getSession();

    // If there's an active session, determine user type from the email domain and cache it for future use
    if (session) {
      const email = session.userEmail;
      if (email) {
        if (email?.toLowerCase().endsWith("@analog.com")) {
          await setUserType(UserType.INTERNAL);
          return UserType.INTERNAL;
        } else {
          await setUserType(UserType.EXTERNAL);
          return UserType.EXTERNAL;
        }
      }
    }
  } catch (error) {
    console.warn(
      "Failed to retrieve auth session, falling back to system checks for user type",
      error,
    );
  }

  const platform = getHostPlatform();

  let command = "";

  // platform specific commands to check if the device in ADI managed
  switch (platform) {
    case "windows":
      command = 'systeminfo | findstr /B /C:"Domain"';
      break;
    case "linux":
      command = "grep -i analog /etc/hosts";
      break;
    case "osx":
      command = "profiles status -type enrollment";
      break;
    default:
      return undefined;
  }

  const output = await runInternalCheck(command);

  if (output && output.toLowerCase().includes("analog")) {
    await setUserType(UserType.INTERNAL);
    return UserType.INTERNAL;
  }
  await setUserType(UserType.EXTERNAL);
  return UserType.EXTERNAL;
};

/**
 * Runs a system command to check for indicators of an internal ADI user.
 * @param command - The system command to run, based on the host platform.
 * @returns The output of the command, or undefined if an error occurs.
 */
const runInternalCheck = async (
  command: string,
): Promise<string | undefined> => {
  try {
    const execPromise = promisify(exec);
    const { stdout } = await execPromise(command, { windowsHide: true, timeout: 5000 });
    return stdout;
  } catch (error) {
    return undefined;
  }
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
