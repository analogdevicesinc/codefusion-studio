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

/**
 * These tests cover the conflict error display on Generate Code screen without visiting Clock tab
 */

import { expect } from "chai";
import {
  By,
  EditorView,
  VSBrowser,
  WebView,
  Workbench,
} from "vscode-extension-tester";

import { UIUtils } from "../../ui-test-utils/ui-utils";
import {
  generateCodeTab,
  peripheralTab,
  pinTab,
} from "../page-objects/main-menu";
import {
  getConfigPathForFile,
  //parseJSONFile,
} from "../config-tools-utility/cfsconfig-utils";
import {
  pinDropdown,
  pinToggle,
} from "../page-objects/pin-config-section/pin-config-screen";
import {
  getCoreContainer,
  getCoreLabel,
  signalAssignChevron,
} from "../page-objects/peripheral-allocation-section/peripheral-allocation-screen";
import {
  getErrorSignal,
  getReadySignal,
  errorContainerSelector,
} from "../page-objects/generate-code-section/generate-code-screen";
import {
  accordion,
  backButton,
  clockErrorSign,
  clockConfig,
} from "../page-objects/clock-config-section/clock-config-screen";

/*
 * Feature: System Planner to check for the conflict error on Generate Code screen without visiting Clock tab
 *     As a CodeFusion Studio user
 *     I want to check for clock conflict error on Generate Code screen
 *     So that I can ensure proper error handling in the System Planner
 *
 * Background:
 *     Given VS Code is open with the CodeFusion Studio extension loaded
 *     And all editors are closed
 *     And all notifications are dismissed
 *
 * Scenario: User has selected the ADC peripheral assigned to ARM core
 *     Given the cfsconfig file of soc MAX7XXXX is opened
 *     And I wait for the webview to load
 *     And I switch to the WebView frame
 *     When I click on the "peripheral" navigation tab
 *     And I click on ADC Peripheral to assign to arm cortex core
 *     Then I verify that ADC peripheral is assigned to ARM Cortex-M4 core to the soc MAX7XXXX
 *
 *
 *  Scenario: User clicks on the Pin tab and enables the CLK_EXT Signal to ADC peripheral
 *     Given the cfsconfig file of soc MAX7XXXX is opened
 *     And I click on the "Pin" navigation tab
 *     And I enable  the signal CLK_EXT's Pin Input frequency to ADC peripheral
 *     Then I verify that the CLK_EXT signal is enabled for ADC peripheral
 *
 *  Scenario: User navigates to Generate Code tab
 *     Given the cfsconfig file of soc MAX7XXXX is opened
 *     And I click on the "Generate Code" navigation tab
 *     Then I verify the conflict error is displayed for ADC peripheral for clock configuration
 *     And I click on the accordion icon to expand the error details
 *     Then I verify the error details show "1 errors in Clock Config."
 *
 *
 *  Scenario: User navigates to DashBoard Tab
 *     Given the cfsconfig file of soc MAX7XXXX is opened
 *     And I click on the "Dashboard" navigation tab
 *     Then I verify the conflict error on clock configuration
 *
 *  Scenario: User navigates to Clock Configuration Tab
 *     Given the cfsconfig file of soc MAX7XXXX is opened
 *     And I click on the "Clock Configuration" navigation tab
 *     And I enter the value for the Pin so that there is no conflict
 *     And I click on back button and go to dashboard tab
 *     Then I verify the conflict error is NOT displayed on Dashboard tab
 *     And I click on the "Generate Code" navigation tab
 *     Then I verify that the conflict error is resolved on Generate Code tab
 *
 *
 */

describe("System Planner conflict error on Generate Code screen ", () => {
  // === Given the existing cfsconfig file generated via workpsace creation for MAX78XXX===
  const configFile = "max78002-manual-msdk.cfsconfig";
  const configPath = getConfigPathForFile(configFile);

  // ===Test Setup===
  let workbench: Workbench;
  let browser: VSBrowser;
  let view: WebView;
  let editor: EditorView;
  browser = VSBrowser.instance;

  before(async () => {
    browser = VSBrowser.instance;
    editor = new EditorView();
    await editor.closeAllEditors();
    await UIUtils.sleep(3000);
  });
  after(async () => {
    await UIUtils.sleep(2000);
    await view.switchBack();
    const wb = new Workbench();
    await wb.wait();
    await wb.executeCommand("revert and close editor");
  });

  it("Should display the conflict on generate code screen without visiting clock tab", async () => {
    await browser.openResources(configPath);
    workbench = new Workbench();
    view = new WebView();
    await view.wait(7000);

    // === TAnd all notifications are dismissed ,wait for the webview to load===
    await UIUtils.dismissAllNotifications(workbench, browser);

    // ===And I switch to the WebView frame===
    console.log("Switched to the WebView frame");
    await view.switchToFrame(5000);
    expect(
      await (await UIUtils.waitForElement(view, peripheralTab)).isDisplayed(),
      "Clock tab should be visible after loading the WebView",
    ).to.be.true;

    // ===When I click on the "peripheral" navigation tab===
    await UIUtils.clickElement(view, peripheralTab);

    // === And I click on ADC Peripheral to assign to arm cortex core===
    await UIUtils.clickElement(view, await signalAssignChevron("ADC"));

    // ===Then I verify that ADC peripheral is assigned to ARM Cortex-M4 core to the soc MAX7XXXX===
    await UIUtils.clickElement(view, getCoreContainer("max78002_msdk"));
    const coreLabelSelector = await getCoreLabel("max78002_msdk");
    const labelElement = await UIUtils.findWebElement(view, coreLabelSelector);
    const labelElementText = await labelElement.getText();
    console.log("Core label text:", labelElementText);
    expect(
      labelElementText,
      `Peripheral 'ADC' not found for core '${labelElementText}'`,
    ).to.include("ARM Cortex-M4");

    // === And I click on the "Pin" navigation tab===
    await UIUtils.clickElement(view, pinTab);

    // === And I enable  the signal CLK_EXT's Pin Input frequency to ADC peripheral===
    await UIUtils.clickElement(view, await pinDropdown("ADC"));
    await UIUtils.clickElement(view, await pinToggle("ADC", "CLK_EXT"));
    await UIUtils.sleep(2000);

    // ===Then I verify that the CLK_EXT signal is enabled for ADC peripheral===
    const dataCheckedPin = await UIUtils.getAttributeFromWebElement(
      await UIUtils.findWebElement(view, await pinToggle("ADC", "CLK_EXT")),
      "data-checked",
    );
    expect(
      dataCheckedPin,
      `Expected pin 'CLK_EXT' for peripheral 'ADC' to be enabled, but it was not.`,
    ).to.equal("true");

    // === And I click on the "Generate Code" navigation tab===

    await UIUtils.sleep(2000);
    await UIUtils.clickElement(view, generateCodeTab);

    // ===TThen I verify the conflict error is displayed for ADC peripheral for clock configuration===
    const errorSignalElement = await UIUtils.findWebElement(
      view,
      getErrorSignal("max78002_msdk"),
    );
    const errorText = await errorSignalElement.getText();
    console.log("The text is", errorText);

    expect(
      errorText.includes("1 Issues"),
      `Expected conflict error for peripheral 'ADC' to be displayed, but it was not.`,
    ).to.be.true;

    // === And I click on the accordion icon to expand the error details===
    await UIUtils.clickElement(
      view,
      "generate-code:core:max78002_msdk:endSlot:icon",
    );

    // ===Then I verify the error details show "1 errors in Clock Config."===

    const errorContainer = await UIUtils.findWebElement(
      view,
      errorContainerSelector("max78002_msdk"),
    );
    const coreError = await errorContainer.getText();
    console.log("other text is", coreError);
    const coreErrorText = await errorContainer.getText();
    expect(coreErrorText).to.include("1 errors in Clock Config.");

    // === And I click on the "Dashboard" navigation tab===
    await UIUtils.clickElement(view, "nav-item:dashboard");

    // ===Then I verify the conflict error is displayed on Dashboard tab===
    const dashboardErrorElement = await UIUtils.findWebElement(
      view,
      clockErrorSign,
    );
    expect(
      await dashboardErrorElement.isDisplayed(),
      `Expected conflict error on Dashboard tab to be displayed, but it was not.`,
    ).to.be.true;

    // === And I click on the "Clock Configuration" navigation tab===
    await UIUtils.clickElement(view, clockConfig);

    // ===And I enter the value for the Pin so that there is no conflict===
    await UIUtils.clickElement(view, accordion("PIN INPUT"));
    await UIUtils.clickElement(view, "P1.10");
    const pinElement = await UIUtils.clickElement(
      view,
      "P1_10_FREQ-P1.10-control-input",
    );
    await pinElement.sendKeys("32768");
    await UIUtils.sleep(2000);

    // ===And I click on back button and go to dashboard tab===
    await UIUtils.clickElement(view, backButton);
    await UIUtils.clickElement(view, "nav-item:dashboard");

    // ===Then I verify the conflict error is NOT displayed on Dashboard tab===
    const noErrorClockConfig = await view.findWebElement(
      By.css("[data-test='clock-card']"),
    );
    const clockCardText = await noErrorClockConfig.getText();
    console.log("Clock card text is", clockCardText);
    expect(
      clockCardText,
      "Clock card should not contain error text",
    ).to.not.include("error");

    // === And I click on the "Generate Code" navigation tab===

    await UIUtils.clickElement(view, generateCodeTab);

    // ===Then I verify that the conflict error is resolved on Generate Code tab===

    const readyElement = await UIUtils.findWebElement(
      view,
      getReadySignal("max78002_msdk"),
    );
    const readyText = await readyElement.getText();
    console.log("The text is", readyText);

    expect(
      readyText.includes("Ready"),
      `Expected conflict error for peripheral 'ADC' to be displayed, but it was not.`,
    ).to.be.true;

    await UIUtils.sleep(2000);
  });
});
