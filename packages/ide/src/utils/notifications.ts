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

import * as vscode from "vscode";
import { EXTENSION_ID, CFS_TELEMETRY_ENABLE } from "../constants";

export const handleTelemetryNotification = async (): Promise<void> => {
  const config = vscode.workspace.getConfiguration(EXTENSION_ID);
  const isTelemetryEnabled = config.get(CFS_TELEMETRY_ENABLE);

  if (isTelemetryEnabled === null) {
    const shareData = "Share Anonymous Data";
    const dontShareData = "Don’t Share Data";
    const result = await vscode.window.showInformationMessage(
      "CodeFusion Studio collects anonymous diagnostics and usage data (such as which features or parts you use), known as Telemetry, to improve performance and usability. You can change your data collection preference at any time by opening Settings and searching for 'CFS Telemetry'. For details on data collection, see our [Privacy Policy.](https://www.analog.com/en/who-we-are/legal-and-risk-oversight/data-privacy/privacy-policy.html)",
      shareData,
      dontShareData,
    );

    if (result === shareData) {
      await config.update(CFS_TELEMETRY_ENABLE, true, true);
    } else if (result === dontShareData) {
      await config.update(CFS_TELEMETRY_ENABLE, false, true);
    }
  }
};
