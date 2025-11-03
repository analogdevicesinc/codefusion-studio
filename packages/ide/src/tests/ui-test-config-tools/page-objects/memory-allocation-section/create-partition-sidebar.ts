/* eslint-disable no-await-in-loop */
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

import { UIUtils } from "../../config-tools-utility/config-utils";
import { By, WebView } from "vscode-extension-tester";

export const memoryTypeDropdown: By = By.css(
  "[data-test='memory-type-dropdown']",
);
export const partitionNameTextBox: By = By.css(
  "[data-test='partition-name-control-input']",
);
export const assignedCoresDropdown: By = By.css(
  "[data-test='assigned-cores-multiselect']",
);
export const baseBlockDropdown: By = By.css(
  "[data-test='base-block-dropdown']",
);
export const startAddress: By = By.css('[data-test="start-address"] input');
export const secureStartAddress: By = By.css(
  '[data-test^="software-start-address"] input',
);
export const sizeStepper: By = By.css("[data-test='size-stepper'] input");
export const createConfiguredPartition: By = By.css(
  "[data-test='create-partition-button']",
);

export async function memoryTypeSelector(
  memoryOption: "Flash" | "RAM",
): Promise<By> {
  return By.css(`[data-test="${memoryOption}"]`);
}

export async function assignedCoresDropdownOptions(project: string): Promise<By> {
  return By.id(`core-permission${project}-controlDropdown`);
}

export async function assignedCoresSelector(coreName: string): Promise<By> {
  return By.css(`[data-test="${coreName}"]`);
}

export async function projectCorePermission(permission: string): Promise<By> {
  return By.css(`[data-value="${permission}"]`);
}

export async function pluginCoreText(index: number): Promise<By> {
  return By.xpath(
    `(//vscode-text-field[@data-test="plugin-options-form:control-NAME_OVERRIDE-control-input"])[${index}]`,
  );
}

export async function assignCores(view: WebView, cores: string[]) {
  await UIUtils.clickElement(view, assignedCoresDropdown);
  console.log("Opened dropdown");
  for (const element of cores) {
      await UIUtils.clickElement(
        view,
        await assignedCoresSelector(element),
      );
  }

  await UIUtils.clickElement(view, assignedCoresDropdown);
  console.log("Closed dropdown");
}

export async function getBaseBlockOption(optionText: string): Promise<By> {
  return By.css(
    `[data-test='base-block-dropdown'] > vscode-option[data-test='${optionText}']`,
  );
}
