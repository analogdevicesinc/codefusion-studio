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

import { By } from "vscode-extension-tester";

export const partitionDetailsDropdowns: By = By.css(
  `[data-test="partition-details-chevron"]`,
);
export const cm4PartitionCardTitles: By = By.css(
  `[data-test="CM4-partition-card-title"] `,
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

// Note: chosenControlInput can also be obtained via pluginOptionLabel("CHOSEN") from create-partition-sidebar
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

export const cm33SecureStartAddress: By = By.css(
  '[data-test*="software-start-address-CM33-flash0"] input',
);

export const physicalStartAddressError: By = By.css(
  '[data-test="start-address-error"]',
);

export const cm33SecureAddressError: By = By.css(
  'span[data-test*="software-start-address-CM33"]',
);

export const sizeStepperError: By = By.css('[data-test="size-stepper-error"]');
