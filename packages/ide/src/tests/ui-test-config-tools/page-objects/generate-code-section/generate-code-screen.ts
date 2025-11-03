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

import { By, WebView } from "vscode-extension-tester";
import { UIUtils } from "../../config-tools-utility/config-utils";

export const rVCheckbox: By = By.css(
  "[data-test='generate-code:core:RV:checkbox']",
);

export const generateCodeButton: By = By.css(
  "[data-test='generate-code:generate-btn']",
);

export const generatedFilesList: By = By.css(
  "[data-test='generated-files:list-container'] > li",
);

export const overwriteButton: By = By.css('[data-test="generate-code:modal:overwrite"]');

// Helper function to dismiss the overwrite modal if it appears
export async function dismissOverwriteModal(view: WebView): Promise<void> {
  try {
    const dismissBtn = await view
      .findWebElement(overwriteButton)
      .catch(() => null);

    if (dismissBtn) {
      await dismissBtn.click();
      await UIUtils.sleep(3000);
      console.log("Dismissed overwrite modal");
    }
  } catch (_) {
    console.warn("no dismiss button found");
  }
}
