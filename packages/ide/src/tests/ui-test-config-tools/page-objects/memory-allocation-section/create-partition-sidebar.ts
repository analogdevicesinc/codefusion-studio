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

import { UIUtils } from "../../../ui-test-utils/ui-utils";
import { By, ModalDialog, WebView, Workbench } from "vscode-extension-tester";
import { clearAndSearch } from "../pin-config-section/pin-config-screen";
import {
  getPartitionsByCoreId,
  parseJSONFile,
} from "../../config-tools-utility/cfsconfig-utils";
import { expect } from "chai";

// Memory type dropdown can be slow to render options, so we use more retries than default
const MEMORY_TYPE_DROPDOWN_RETRIES = 3;

export const createPartitionButton: By = By.css(
  "[data-test='create-partition-btn']",
);
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
export const physicalStartAddress: By = By.css(
  '[data-test="start-address"] input',
);
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

export async function pluginOptionLabel(labelType: string): Promise<By> {
  return By.css(
    `[data-test="plugin-options-form:control-${labelType}-control-input"]`,
  );
}

export const sizeDropdown = By.css('[data-test="size-dropdown"]');

export async function sizeDropdownOption(size: string): Promise<By> {
  return By.css(`vscode-option[id="_${size}"]`);
}

export const partitionNameError = By.css('[data-test="partition-name-error"]');

export async function partitionEditButton(partitionName: string): Promise<By> {
  return By.xpath(
    `//h3[contains(text(),"${partitionName}")]//ancestor::section[contains(@class,"innerCardContainer")]//vscode-button[@data-test="edit-partition-btn"]`,
  );
}

export async function partitionDeleteButton(
  partitionName: string,
): Promise<By> {
  return By.xpath(
    `//h3[contains(text(),"${partitionName}")]//ancestor::section[contains(@class,"innerCardContainer")]//vscode-button[@data-test="delete-partition-btn"]`,
  );
}

/**
 * Creates a SHARC-FX memory partition from the Create Partition sidebar form.
 *
 * This helper performs the full UI flow end-to-end: opens the form, selects the
 * memory type, sets partition metadata, assigns FX core permissions, updates
 * start address and size, and submits the configured partition.
 *
 * @param view - Active config-tools webview used to interact with memory allocation UI.
 * @param memoryType - Partition memory type to select ("Flash" or "RAM").
 * @param partitionName - Name to assign to the new partition.
 * @param readWritePermission - FX core permission value ("R" or "R/W").
 * @param chosenFieldValue - Value for plugin CHOSEN metadata field.
 * @param labelFieldValue - Value for plugin LABEL metadata field.
 * @param startAddress - Physical start address for the partition.
 * @param memorySizeType - Size display unit to use in the form (KB, MB, or bytes).
 * @param memorySize - Partition size value in the selected size unit.
 * @returns A Promise that resolves once the partition creation action is submitted.
 */
export async function createSharcfxMemoryPartition(
  view: WebView,
  memoryType: "Flash" | "RAM",
  partitionName: string,
  readWritePermission: "R" | "R/W",
  chosenFieldValue: string,
  labelFieldValue: string,
  startAddress: string,
  memorySizeType: "KB" | "MB" | "bytes",
  memorySize: string,
): Promise<void> {
  // And I click the "Create Partition" button
  await UIUtils.clickElement(view, createPartitionButton);

  // And I select the memory type "${memoryType}" from the dropdown
  await selectMemoryTypeWithRetry(view, memoryType);

  // And I set the partition name to "${partitionName}"
  const partitionNameElement = await UIUtils.findWebElement(
    view,
    partitionNameTextBox,
  );
  await clearAndSearch(partitionNameElement, partitionName);

  // And I assign FX cores
  const cores: string[] = ["multiselect-option-FX"];
  await assignCores(view, cores);

  // And I open the FX permission dropdown
  await UIUtils.clickElement(view, await assignedCoresDropdownOptions("FX"));

  // And I set the FX core permission to "${readWritePermission}"
  await UIUtils.clickElement(
    view,
    await projectCorePermission(readWritePermission),
  );

  // And I set the CHOSEN field to "${chosenFieldValue}"
  const chosenField = await UIUtils.findWebElement(
    view,
    await pluginOptionLabel("CHOSEN"),
  );
  await clearAndSearch(chosenField, chosenFieldValue);

  // And I set the LABEL field to "${labelFieldValue}"
  const labelField = await UIUtils.findWebElement(
    view,
    await pluginOptionLabel("LABEL"),
  );
  await clearAndSearch(labelField, labelFieldValue);

  // And I set the start address to "${startAddress}"
  const startAddressElement = await UIUtils.findWebElement(
    view,
    physicalStartAddress,
  );
  await clearAndSearch(startAddressElement, startAddress);

  // And I change the size display unit to "${memorySizeType}"
  await UIUtils.clickElement(view, sizeDropdown);
  await UIUtils.clickElement(view, await sizeDropdownOption(memorySizeType));

  // And I set the size to "${memorySize}"
  const sizeStepperElement = await UIUtils.findWebElement(view, sizeStepper);
  await clearAndSearch(sizeStepperElement, memorySize);

  // And I click the "Create Configured Partition" button
  await UIUtils.clickElement(view, createConfiguredPartition);
}

/**
 * Persists partition changes and verifies them from the saved config file.
 *
 * This helper exits the webview, closes editors to trigger the save prompt,
 * confirms save, then parses the provided config file and returns partitions
 * assigned to the FX core.
 *
 * @param view - Active config-tools webview to switch back from before saving.
 * @param workbench - Workbench instance used to execute editor-level save flow.
 * @param configPath - Absolute path to the .cfsconfig file to parse post-save.
 * @returns A Promise resolving to the list of persisted FX partitions from config.
 */
export async function verifyPartitionPersistence(
  view: WebView,
  workbench: Workbench,
  configPath: string,
): Promise<any[]> {
  // And I save the configuration file
  console.log("Save the configuration file changes");
  await view.switchBack();
  await workbench.executeCommand("view: close all editors");
  const dialog = new ModalDialog();
  await dialog.pushButton("Save");
  console.log("Saved the configuration file");
  await UIUtils.sleep(300);
  const peripheralData = parseJSONFile(configPath);
  const partitions = getPartitionsByCoreId(peripheralData, "FX");
  return partitions;
}

/**
 * Sets the physical start address field to a new value.
 * Clears the existing value and enters the provided address.
 * Note: The secure starting address gets auto-populated when this value changes.
 *
 * @param view - The WebView instance representing the current UI context
 * @param address - The physical start address to set (e.g., "0x20000000", "1000000")
 * @returns A Promise that resolves when the address is successfully set
 */
export async function setPhysicalStartAddress(
  view: WebView,
  address: string,
): Promise<void> {
  const physicalStartAddressElement = await UIUtils.findWebElement(
    view,
    physicalStartAddress,
  );
  await clearAndSearch(physicalStartAddressElement, address);
}

/**
 * Creates a memory partition in the UI with the specified options and verifies its existence
 * @param view - The WebView instance representing the current UI context.
 * @param options - An object containing:
 *   @property memoryType - The type of memory (e.g., "Flash" or "RAM").
 *   @property partitionName - The name of the partition to create (e.g., "smoketest").
 *   @property coreName - The name of the core to assign the partition to (e.g., "arm_cortex").
 *   @property baseBlock - The base block to select (e.g., "flash1").
 *   @property sizeKB - The size of the partition in KB (e.g., "8").
 * @returns A Promise that resolves when the partition is created and verified.
 */
export async function createAndVerifyMemoryPartition(
  view: WebView,
  options: {
    memoryType: "Flash" | "RAM";
    partitionName: string;
    coreName: string;
    baseBlock: string;
    sizeKB: string;
  },
): Promise<void> {
  const { partitionName, coreName, baseBlock, sizeKB } = options;

  // ===Open partition creation dialog===
  const createPartitionBtnClick = await UIUtils.waitForElement(
    view,
    createPartitionButton,
  );
  await createPartitionBtnClick.click();

  // ===Select memory type===
  await selectMemoryTypeWithRetry(view, options.memoryType);

  // ===Enter partition name===
  const partitionNameElement = await UIUtils.findWebElement(
    view,
    partitionNameTextBox,
  );
  await clearAndSearch(partitionNameElement, partitionName);

  // ===Assign core===
  const assignedCoresSelector = await UIUtils.waitForElement(
    view,
    By.css("[data-test='assigned-cores-multiselect']"),
  );
  await assignedCoresSelector.click();
  const coreOptionSelector = await UIUtils.waitForElement(
    view,
    By.css(`[data-test='multiselect-option-${coreName}']`),
  );
  await coreOptionSelector.click();

  // ===Select base block===
  const baseBlockSelector = await UIUtils.waitForElement(
    view,
    By.css("[data-test='base-block-dropdown']"),
  );
  await baseBlockSelector.click();
  const baseBlockOptionSelector = await UIUtils.waitForElement(
    view,
    By.css(`[data-test='${baseBlock}']`),
  );
  await baseBlockOptionSelector.click();

  // ===Enter size===
  await UIUtils.sendKeysToElements(
    view,
    By.css("[data-test='size-stepper-control-input']"),
    sizeKB,
  );

  // ===Create partition and expand details===
  const saveToCreatePartition = await UIUtils.waitForElement(
    view,
    By.css("[data-test='create-partition-button']"),
  );
  await saveToCreatePartition.click();
  const partitionDetailsChevron = await UIUtils.waitForElement(
    view,
    By.css("[data-test='partition-details-chevron']"),
  );
  await partitionDetailsChevron.click();

  // ===Verify partition card exists===
  const partitionTitleCss = `[data-test='${coreName}-partition-card-title'] > h3`;
  const partitionTitleElem = await UIUtils.waitForElement(
    view,
    By.css(partitionTitleCss),
  );
  await partitionTitleElem.click();
  const displayedText = await partitionTitleElem.getText();

  expect(displayedText).to.include(
    partitionName,
    ` Partition '${partitionName}' not found for core '${coreName}'`,
  );
}

/**
 * Selects a memory type from the dropdown with enhanced reliability.
 * Waits for dropdown readiness then selects with extra retries for stability.
 * This function addresses intermittent failures with the memory type dropdown
 * by ensuring element readiness before interaction.
 *
 * @param view - The WebView instance representing the current UI context
 * @param memoryType - The type of memory to select ("Flash" or "RAM")
 * @returns A Promise that resolves when the memory type is successfully selected
 * @throws Error if the dropdown selection fails after all retry attempts
 */
async function selectMemoryTypeWithRetry(
  view: WebView,
  memoryType: "Flash" | "RAM",
): Promise<void> {
  await UIUtils.waitForElement(view, memoryTypeDropdown);
  await UIUtils.selectOptionFromDropdown(
    view,
    memoryTypeDropdown,
    await memoryTypeSelector(memoryType),
    MEMORY_TYPE_DROPDOWN_RETRIES,
  );
}
