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

import { By } from "vscode-extension-tester";

export const peripheralListContainer: By = By.css(
  `[data-test='Peripheral-List']`,
);
export const helpBannerContainerSelector = By.css(
  '[data-test="peripheral-help-banner:container"]',
);
export const continueButtonSelector = By.css(
  '[data-test="help-banner:continue-button"]',
);
export const allocateArm: By = By.css(
  `[data-test='core-corepart_01jrdgezrce69rsqvja125h3v2-container']`,
);
export const allocateRiscv: By = By.css(
  `[data-test='core-corepart_01jrdgezrce6a8zq3xaqac6wkg-container']`,
);
export const coreConfig: By = By.css(`[data-test='signal-assignment:config']`);
export const riscvSignalDelete: By = By.css(
  `[data-test='allocated-core-card:corepart_01jrdgezrce69rsqvja125h3v2:delete-icon']`,
);
export const managePinsAssignment: By = By.css(
  `[data-test='config-section:manage-pin-assignments']`,
);
export const baudRateField: By = By.css(
  `[data-test='plugin-options:plugin-form:control-BAUD-control-input']`,
);
export const chosenFieldSelector = By.css(
  `[data-test='plugin-options:plugin-form:control-CHOSEN-control-input']`,
);

export async function mainPanelProjectCard(project: string): Promise<By> {
  return By.css(`[data-test="core:${project}-proj:label"]`);
}

export async function mainPanelProjectItem(
  project: string,
  allocation: string,
): Promise<By> {
  return By.css(`[data-test="core:${project}-proj:allocation:${allocation}"]`);
}

export async function signalAccordion(signalName: string): Promise<By> {
  return By.css(`[data-test='accordion:${signalName}']`);
}

export async function signalCloseButton(signalName: string): Promise<By> {
  return By.xpath(
    `//h2[contains(text(), '${signalName}')]/following-sibling::vscode-button`,
  );
}

export async function signalAssignChevron(signalName: string): Promise<By> {
  return By.css(`[data-test='peripheral-signal-${signalName}-chevron']`);
}

export async function signalAssignContainer(signalName: string): Promise<By> {
  return By.css(`[data-test='peripheral-signal-${signalName}-container']`);
}

export async function signalDeleteButton(signalName: string): Promise<By> {
  return By.css(`[data-test='peripheral-signal-${signalName}-delete']`);
}

export async function signalPeripheralBlock(signalName: string): Promise<By> {
  return By.css(`[data-test='peripheral-block-${signalName}']`);
}
