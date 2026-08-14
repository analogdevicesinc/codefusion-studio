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

// Feature: Auto selection of required Pins for particular signals
//   As a user
//   I want to allocate particular peripheral signals and see if pins are auto selected for those signals
//   So that I can properly configure hardware peripherals for my project

// Background:
//   Given VS Code is open with the CodeFusion Studio extension loaded
//   And all editors are closed
//   And the configuration file "max32690-wlp.cfsconfig" is available

import { By, VSBrowser, WebView, Workbench } from "vscode-extension-tester";
import { expect } from "chai";
import { UIUtils } from "../../../ui-test-utils/ui-utils";
import { getConfigPathForFile } from "../../config-tools-utility/cfsconfig-utils";
import { peripheralTab } from "../../page-objects/main-menu";
import {
  signalAccordion,
  signalAssignChevron,
  signalAssignmentError,
} from "../../page-objects/peripheral-allocation-section/peripheral-allocation-screen";
import { pinToggle } from "../../page-objects/pin-config-section/pin-config-screen";

describe("Auto Selection of required Pins", () => {
  let browser: VSBrowser;
  let view: WebView;
  let workbench: Workbench;
  const configPath = getConfigPathForFile("max32690-wlp.cfsconfig");
  const signal = "GPIO1";
  const signal2 = "TMR0";
  const subSignal = "P1.1";
  const coreSelectorButton = By.css(
    `[data-test="core-selector-button-max32690_arm-cortex-m4f"]`,
  );

  /**
   * Helper function to verify pin toggle state
   */
  async function verifyPinToggleState(
    peripheral: string,
    pin: string,
    expectedState: string,
    description: string,
  ) {
    const toggleElement = await UIUtils.findWebElement(
      view,
      await pinToggle(peripheral, pin),
    );
    expect(await toggleElement.getAttribute("data-checked")).to.equal(
      expectedState,
      description,
    );
  }

  before(async function () {
    browser = VSBrowser.instance;
    await new Workbench().executeCommand("workbench.action.closeAllEditors");
    workbench = new Workbench();
    await browser.waitForWorkbench();
  });

  after(async function () {
    await view.switchBack();
    const wb = new Workbench();
    await wb.wait();
    await wb.executeCommand("View: revert and close editor");
  });

  /**
   * Scenario: Verify that pins get auto selected
   *   Given I open the configuration file "max32690-wlp.cfsconfig"
   *   When I navigate to the Peripheral Allocation tab
   *   And I expand the GPIO1 peripheral accordion
   *   And I click the assign chevron for signal P1.1
   *   And I click the core selector button
   *   Then the sidebar should open with title "GPIO1 P1.1"
   *   And the pin toggle for "GPIO1 P1.1" should be checked
   *   When I click the assign chevron for signal TMR0
   *   And I click the core selector button
   *   Then the pin toggle for "TMR0 IOAN" should not be checked
   *   When I click the assign chevron for signal SPI4
   *   And I click the core selector button
   *   Then the pin toggle for "SPI4 MOSI" should be checked
   *   And an error message should be displayed
   */
  it("Verify that pins get auto selected for GPIO and other peripherals not auto selected and conflict for some", async () => {
    // === GIVEN: I open the configuration file
    //  "max32690-wlp.cfsconfig" ===
    await browser.openResources(configPath);
    workbench = new Workbench();

    console.log("Opened the cfsconfig file");

    //   And I dismiss all notifications
    await UIUtils.dismissAllNotifications(workbench, browser);
    view = new WebView();
    view = await view.wait(5000);
    await view.switchToFrame();

    await UIUtils.waitForElement(view, peripheralTab);

    // === WHEN: I navigate to the Peripheral Allocation tab ===
    expect(
      await UIUtils.findWebElement(view, peripheralTab),
      "Peripheral tab not found.",
    ).to.exist;

    const navItem = await UIUtils.findWebElement(view, peripheralTab);
    await navItem.click();

    // === AND: I expand the GPIO1 peripheral accordion ===
    await UIUtils.clickElement(view, await signalAccordion(signal));

    // === AND: I click the assign chevron for signal P1.1 ===
    await UIUtils.clickElement(view, await signalAssignChevron(subSignal));

    // === AND: I click the core selector button ===
    await UIUtils.clickElement(view, coreSelectorButton);

    // === THEN: The sidebar should open with title "GPIO1 P1.1" ===
    const sidebarTitle = By.xpath("//h2[text()='GPIO1 P1.1']");
    await UIUtils.findWebElement(view, sidebarTitle);

    // === AND: The pin toggle for "GPIO1 P1.1" should be checked ===
    await verifyPinToggleState(
      "GPIO1",
      "P1.1",
      "true",
      "GPIO1 P1.1 pin toggle should be checked",
    );

    // === WHEN: I click the assign chevron for signal TMR0 ===
    await UIUtils.clickElement(view, await signalAssignChevron(signal2));

    // === AND: I click the core selector button ===
    await UIUtils.clickElement(view, coreSelectorButton);

    // === THEN: The pin toggle for "TMR0 IOAN" should not be checked ===
    await verifyPinToggleState(
      "TMR0",
      "IOAN",
      "false",
      "TMR0 IOAN pin toggle should not be checked",
    );

    // === WHEN: I click the assign chevron for signal SPI4 ===
    await UIUtils.clickElement(view, await signalAssignChevron("SPI4"));

    // === AND: I click the core selector button ===
    await UIUtils.clickElement(view, coreSelectorButton);

    // === THEN: The pin toggle for "SPI4 MOSI" should be checked ===
    await verifyPinToggleState(
      "SPI4",
      "MOSI",
      "true",
      "SPI4 MOSI pin toggle should be checked",
    );

    // === AND: An error message should be displayed ===
    await UIUtils.sleep(1000); // Give time for error to appear
    const errorElement = await UIUtils.findWebElement(
      view,
      await signalAssignmentError(),
    );
    expect(errorElement).to.exist;
  });
});
