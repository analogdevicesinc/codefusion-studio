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
import { expect } from "chai";
import { UIUtils } from "../../../ui-test-utils/ui-utils";

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
  return By.css(`[data-test='assignable-item:chevron:${signalName}']`);
}

export async function signalAssignContainer(signalName: string): Promise<By> {
  return By.css(`[data-test='assignable-item:container:${signalName}']`);
}

export async function signalDeleteButton(signalName: string): Promise<By> {
  return By.css(`[data-test='assignable-item:delete:${signalName}']`);
}

export async function signalPeripheralBlock(signalName: string): Promise<By> {
  return By.css(`[data-test='peripheral-block-${signalName}']`);
}
export function getCoreContainer(coreName: string): string {
  return `core-${coreName}-container`;
}

export async function signalAssignment(signalName: string): Promise<By> {
  return By.css(`[data-test='signal-assignment:${signalName}']`);
}

export async function signalAssignmentError(): Promise<By> {
  return By.css('[data-test="signal-assignment:error"]');
}

export async function signalConfigBtn(SignalName: string): Promise<By> {
  return By.css(`[data-test="accordion:allocated:${SignalName}"]`);
}

export async function coreCardSignalConfigBtn(SignalName: string): Promise<By> {
  return By.css(
    `[data-test="accordion:${SignalName}"] [data-test='peripheral-assignment:config']`,
  );
}

export async function highlightedCoreCardSignal(
  SignalName: string,
): Promise<By> {
  return By.css(
    `[data-test='cores-summary-container'] [data-test='accordion:${SignalName}'] section`,
  );
}

export async function highlightedCoreCardPin(pin: string): Promise<By> {
  return By.xpath(
    `//div[@data-test='cores-summary-container']//div[@data-test='signal-assignment:${pin}']/parent::div`,
  );
}

export async function pinAssignmentToggle(
  signalName: string,
  pin: string,
): Promise<By> {
  return By.css(`span[data-test="${signalName}-${pin}-span"]`);
}

export async function pinAssignmentInfo(SignalName: string): Promise<By> {
  return By.css(`[data-test='signal-assignment:${SignalName}'] p']`);
}

export async function peripheralError(): Promise<By> {
  return By.css(`[data-test='peripheral:error'] p`);
}

export async function cardPinAssignmentInfo(
  signalName: string,
  pin: string,
): Promise<By> {
  return By.css(
    `[id='${signalName}'] [data-test='signal-assignment:${pin}'] p`,
  );
}

export async function detailsSectionSignal(): Promise<By> {
  return By.xpath("(//div[@data-test='config-sidebar:signal-config']//h5)[1]");
}

export async function detailsSectionPeripheral(): Promise<By> {
  return By.xpath(
    "(//div[@data-test='config-sidebar:peripheral-config']//h5)[1]",
  );
}

export async function allocatedCoreCard(): Promise<By> {
  return By.css(`[data-test='allocated-core-card:CM4']`);
}

export async function detailsInput(): Promise<By> {
  return By.css(`[data-test='details-section:alias-control-input']`);
}

export async function pinAssignmentsSection(): Promise<By> {
  return By.css(`[data-test='config-section:manage-pin-assignments']`);
}

export async function configSection(): Promise<By> {
  return By.css(`[data-test='config-section:configuration']`);
}

export async function verifyPluginSection(view: WebView): Promise<void> {
  const pluginSection = By.css("[data-test='config-panel:plugin-options']");
  expect(
    await UIUtils.findWebElement(view, pluginSection),
    "Plugin section should be present",
  ).to.exist;
}

export async function clickOnSidebarCloseButton(view: WebView): Promise<void> {
  const closeBtn = By.css(
    'div[class*="opening"] div[class*="title"] vscode-button',
  );
  let closeButtonElement = await UIUtils.findWebElement(view, closeBtn);
  await closeButtonElement.isDisplayed().then(async () => {
    console.log("Close button is displayed");
    await UIUtils.sleep(2000);
    await closeButtonElement.click();
  });
}

export async function projectSideBar(): Promise<By> {
  return By.css('div[class*="opening"]');
}

export async function projectTitle(): Promise<By> {
  return By.css('div[class*="opening"] h2');
}

export async function coreExpandBtn(signalName: string): Promise<By> {
  return By.css(
    `[data-test='cores-summary-container'] [data-test='accordion:${signalName}'] [class*='chevron']`,
  );
}

export async function pinDeleteIcon(signalName: string): Promise<By> {
  return By.css(
    `[data-test="signal-assignment:${signalName}"] [class*="deleteIcon"]`,
  );
}

export async function pinAllocateIcon(signalName: string): Promise<By> {
  return By.css(`[data-test="peripheral-signal-${signalName}-chevron"]`);
}
export function getCoreContainerSoc(coreProjectId: string): string {
  return `core-${coreProjectId}-container`;
}

export async function getCoreLabel(projectId: string): Promise<By> {
  return By.css(`[data-test='core-${projectId}']`);
}

export async function verifySidebarSections(
  view: WebView,
  isSignal: boolean,
): Promise<void> {
  console.log("Verifying sidebar sections...");
  if (isSignal) {
    expect(await UIUtils.findWebElement(view, await detailsSectionSignal())).to
      .exist;
  } else {
    expect(await UIUtils.findWebElement(view, await detailsSectionPeripheral()))
      .to.exist;
  }
  expect(await UIUtils.findWebElement(view, await allocatedCoreCard())).to
    .exist;
  expect(await UIUtils.findWebElement(view, await detailsInput())).to.exist;
  expect(await UIUtils.findWebElement(view, await pinAssignmentsSection())).to
    .exist;
  expect(await UIUtils.findWebElement(view, await configSection())).to.exist;
}

export async function sidebarChecks(
  view: WebView,
  signal: string,
  subSignal: string,
): Promise<void> {
  console.log("Inside sidebar checks method");
  let isSignal: boolean = true; // Set to true for signal, false for peripheral
  let openedSidebar = await UIUtils.findWebElement(
    view,
    await projectSideBar(),
  );
  await openedSidebar.isDisplayed().then(async () => {
    expect(openedSidebar, "Project Sidebar (right) should be opened").to.exist;
    await UIUtils.sleep(5000);
    let projectTitleText = await UIUtils.findWebElement(
      view,
      await projectTitle(),
    );
    let projectName: string = await projectTitleText.getText();
    console.log("Project Name:", projectName);
    const expectedProjectName = `${signal} ${subSignal}`;
    // Check for the sidebar project card title
    expect(projectName).to.equal(expectedProjectName.trim());
    if (subSignal == "") {
      isSignal = false;
    }
    await verifySidebarSections(view, isSignal);
  });
}

/**
 * Assigns a peripheral to a specified core in the UI and verifies the assignment by checking the displayed checkmark.
 *
 * @param view - The WebView instance representing the current UI context.
 * @param peripheralConfig - An object containing:
 *  @property peripheral - The name of the peripheral to assign (e.g., "CAN0").
 *  @property core - The name of the core to assign the peripheral to (e.g., "arm_cortex").
 * @returns A Promise that resolves when the assignment and verification are complete.
 */
export async function assignPeripheralToCore(
  view: WebView,
  peripheralConfig: {
    peripheral: string;
    coreProjectId: string;
    core: string;
  },
): Promise<void> {
  const { peripheral, core, coreProjectId } = peripheralConfig;
  await UIUtils.clickElement(view, `assignable-item:chevron:${peripheral}`);
  await UIUtils.clickElement(view, `core-${coreProjectId}`);
  const peripheralAssignedToCore = await UIUtils.dataTest(
    view,
    `core-${coreProjectId}`,
  );
  const coreName = await peripheralAssignedToCore.getText();
  expect(
    `Peripheral '${peripheral}' not found for core '${coreName}'`,
  ).to.include(core);
}
