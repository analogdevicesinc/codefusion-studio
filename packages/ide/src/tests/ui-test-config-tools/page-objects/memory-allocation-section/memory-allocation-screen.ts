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

import { By, WebView } from "vscode-extension-tester";
import { expect } from "chai";
import { UIUtils } from "../../../ui-test-utils/ui-utils";
import {
  memoryTypeDropdown,
  memoryTypeSelector,
} from "./create-partition-sidebar";

// Memory type dropdown can be slow to render options, so we use more retries than default
const MEMORY_TYPE_DROPDOWN_RETRIES = 3;

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

export const partitionDetailsDropdowns: By = By.css(
  `[data-test="partition-details-chevron"]`,
);
export const cm4PartitionCardTitles: By = By.css(
  `[data-test="CM4-partition-card-title"] `,
);
export const createPartitionButton: By = By.css(
  "[data-test='create-partition-btn']",
);
export const deletePartitionButton: By = By.css(
  "[data-test='delete-partition-btn']",
);
export const memoryTypeFilterButton: By = By.css(
  "[data-test='memory-type-filter']",
);
export const memoryTypeFilterOptionRAM: By = By.css(
  "[data-test='multiselect-option-RAM']",
);

export async function pluginOptionsHeader(index: number): Promise<By> {
  return By.xpath(
    `//h3[normalize-space()='Plugin Options']/following::h5[${index}]/div`,
  );
}

export async function partitionDetailsChevron(index: number): Promise<By> {
  return By.xpath(`(//div[@data-test='partition-details-chevron'])[${index}]`);
}

export async function getDeletePartitionButton(index: number): Promise<By> {
  return By.xpath(`(//*[@data-test='delete-partition-btn'])[${index}]`);
}

export async function getEditPartitionButton(index: number): Promise<By> {
  return By.xpath(`(//*[@data-test='edit-partition-btn'])[${index}]`);
}

export async function getBaseBlockOption(optionText: string): Promise<By> {
  return By.css(`[data-test='${optionText}']`);
}

export const chosenControlInput: By = By.css(
  "[data-test='plugin-options-form:control-CHOSEN-control-input']",
);

export const partitionSidebarCloseButton: By = By.xpath(
  "//*[@data-test='partition-sidebar']//vscode-button[.//*[contains(@class,'closeIcon')]]",
);

export async function getPartitionTitleEl(
  coreId: "CM4" | "RV",
  index: number,
): Promise<By> {
  return By.xpath(
    `(//div[@data-test='${coreId}-partition-card-title']/h3)[${index}]`,
  );
}

export async function getPartitionName(
  name: string,
  memory: string,
): Promise<By> {
  return By.xpath(
    `//div[@data-test='partition-accordion-${memory}']//div[@title='${name}']`,
  );
}

export async function getStartAddressForMemoryType(
  memoryType: "flash0" | "flash1" | "sysram0",
): Promise<By> {
  return By.xpath(
    `//div[@data-test="accordion:${memoryType}"]//span[text()="Start Address"]/following-sibling::span`,
  );
}

export async function getEndAddressForMemoryType(
  memoryType: "flash0" | "flash1" | "sysram0",
): Promise<By> {
  return By.xpath(
    `//div[@data-test="accordion:${memoryType}"]//span[text()="End Address"]/following-sibling::span`,
  );
}

export async function leftPartitionDropdown(
  partitionName: string,
): Promise<By> {
  return By.css(`[data-test="accordion:${partitionName}"]`);
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
  await UIUtils.sendKeysToElements(
    view,
    By.css('[data-test="partition-name-control-input"]'),
    partitionName,
  );

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
