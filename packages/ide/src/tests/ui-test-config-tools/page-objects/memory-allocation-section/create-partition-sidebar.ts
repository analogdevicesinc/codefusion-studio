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

import { UIUtils } from "../../../ui-test-utils/ui-utils";
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
export const sizeStepper: By = By.css(
  "[data-test='size-stepper-control-input']",
);
export const createConfiguredPartition: By = By.css(
  "[data-test='create-partition-button']",
);
export const ownerToggleSpan: By = By.css('span[data-test="undefined-span"]');

export async function memoryTypeSelector(
  memoryOption: "Flash" | "RAM",
): Promise<By> {
  return By.css(`[data-test="${memoryOption}"]`);
}

export async function assignedCoresDropdownOptions(
  project: string,
): Promise<By> {
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
    await UIUtils.clickElement(view, await assignedCoresSelector(element));
  }

  await UIUtils.clickElement(view, assignedCoresDropdown);
  console.log("Closed dropdown");
}

export async function getBaseBlockOption(optionText: string): Promise<By> {
  return By.css(
    `[data-test='base-block-dropdown'] > vscode-option[data-test='${optionText}']`,
  );
}

export async function getAssignedCoreText(view: WebView): Promise<string> {
  const normaliseText = (s?: string) =>
    (s ?? "").replace(/\u00A0/g, " ").trim();
  const root = await UIUtils.findWebElement(view, assignedCoresDropdown);

  const selected = await root.findElements(
    By.css(
      'vscode-checkbox[aria-checked="true"] span[data-test^="multiselect-option-"] div',
    ),
  );
  if (selected.length) {
    return normaliseText(await selected[0].getText());
  }

  const btnPs = await root.findElements(By.css(":scope > button p"));
  if (btnPs.length) {
    return normaliseText(await btnPs[0].getText());
  }

  const checked = await root.findElements(
    By.css('vscode-checkbox[aria-checked="true"]'),
  );
  if (checked.length) {
    return normaliseText(await checked[0].getAttribute("aria-label"));
  }

  return "";
}

export async function getCorePermissionValueText(
  view: WebView,
  project: string,
): Promise<"R" | "R/W" | ""> {
  const dd = await UIUtils.findWebElement(
    view,
    await assignedCoresDropdownOptions(project),
  );
  return (await dd.getAttribute("current-value"))?.trim() as "R" | "R/W" | "";
}

export async function isOwnerCheckedBoolean(view: WebView): Promise<boolean> {
  const el = await UIUtils.findWebElement(view, ownerToggleSpan);
  const val =
    (await el.getAttribute("data-checked")) ??
    (await el.getAttribute("aria-checked")) ??
    (await el.getAttribute("current-checked"));
  return String(val).trim().toLowerCase() === "true";
}

export async function getOwnerCheckedText(view: WebView): Promise<string> {
  return String(await isOwnerCheckedBoolean(view));
}
