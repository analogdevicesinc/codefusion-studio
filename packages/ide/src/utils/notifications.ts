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

import * as vscode from "vscode";
import { EXTENSION_ID, CFS_TELEMETRY_ENABLE } from "../constants";
import { getTelemetryManager } from "../telemetry/telemetry";
import { TELEMETRY_ACTIONS } from "../telemetry/action-names";

export const handleTelemetryNotification = async (): Promise<void> => {
  const config = vscode.workspace.getConfiguration(EXTENSION_ID);
  const isTelemetryEnabled = config.get(CFS_TELEMETRY_ENABLE);

  if (isTelemetryEnabled === null) {
    const shareData = "Share Data";
    const dontShareData = "Don't Share Data";
    const result = await vscode.window.showInformationMessage(
      "CodeFusion Studio collects diagnostic and usage data, including tool version, operating system, command categories, performance metrics, and error codes, to improve usability and performance. A randomly generated usage identifier is stored locally to link your sessions. No source code, file paths, credentials, or personal details are collected. To distinguish ADI-internal from external use, CodeFusion Studio checks locally whether you are signed in to myAnalog with an ADI account or using an ADI-managed computer; only the result is shared. You can change your data collection preference at any time by opening Settings and searching for 'CFS Telemetry'. To learn more, view our [Privacy Policy](https://www.analog.com/en/who-we-are/legal-and-risk-oversight/data-privacy/privacy-policy.html).",
      dontShareData,
      shareData,
    );

    if (result === shareData) {
      await config.update(CFS_TELEMETRY_ENABLE, true, true);
      await getTelemetryManager().then((telemetryManager) => {
        telemetryManager.logAction(
          TELEMETRY_ACTIONS.TELEMETRY_CONSENT_GIVEN,
          {},
        );
      });
    } else if (result === dontShareData) {
      await config.update(CFS_TELEMETRY_ENABLE, false, true);
    }
  }
};
