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

import { By } from "selenium-webdriver";
import { until, WebView } from "vscode-extension-tester";
import { UIUtils } from "../../config-tools-utility/config-utils";

// Signal Config Sidebar elements
export const signalConfigSidebarContainer: By = By.css(
  "[data-test='config-sidebar:signal-config']",
);
export const panelContainer: By = By.css(
  '#pinmux-main-panel ~ [class*="_sidePanelContainer_"] [class*="_container_"]',
);

// CONFIGURATION section
export const functionAttachedDropdown: By = By.id("MODE-controlDropdown");
export const powerSupplyDropdown: By = By.id("PWR-controlDropdown");
export const driveStrengthDropdown: By = By.id("DS-controlDropdown");
export const pullUpPullDownDropdown: By = By.id("PS-controlDropdown");

// CODE GENERATION PLUGIN section
export const polarityDropdown: By = By.id("POLARITY-controlDropdown");
export const setDevicetreeIdentifierInput: By = By.css(
  "[data-test^='DT_NAME-']",
);
export const setPHandelIdentifierInput: By = By.css("[data-test^='PHANDLE-']");
export const setInputEventCodeInput: By = By.css("[data-test^='INPUT_CODE-']");
export const setAliasInput: By = By.css("[data-test^='ALIAS-']");

export async function getValueFromSidebarConfig(
  view: WebView,
  selector: By,
  timeout = 8000,
): Promise<string> {
  const driver = view.getDriver();

  let element = await driver.wait(until.elementLocated(selector), timeout);
  await driver.wait(async () => {
    try {
      return await element.isDisplayed();
    } catch {
      // Stale or not found → re-locate and retry
      element = await driver.findElement(selector);
      return element.isDisplayed();
    }
  }, timeout);
  const currentValue = await UIUtils.getAttributeFromWebElement(element, "current-value");
  console.log("Current value of element is: ", currentValue);

  return currentValue;
}
