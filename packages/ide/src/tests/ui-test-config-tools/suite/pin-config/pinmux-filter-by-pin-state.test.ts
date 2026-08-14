/**
 *
 * Copyright (c) 2026 Analog Devices, Inc.
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
 * These tests cover the filters "assigned", "conflicts" and "available" in the Pin configuration section of the System Planner.
 */
import { expect } from "chai";
import { By, VSBrowser, WebView, Workbench } from "vscode-extension-tester";

import { UIUtils } from "../../../ui-test-utils/ui-utils";
import {
  assignedFilterControl,
  conflictFilterControl,
  peripheralTab,
  pinTab,
} from "../../page-objects/main-menu";
import { getConfigPathForFile } from "../../config-tools-utility/cfsconfig-utils";
import {
  pinDropdown,
  pinToggle,
  assertPeripheralsPresent,
  clearAndSearch,
  pinConflictError,
  detailsContainerBackButton,
  peripheralConflictIcon,
} from "../../page-objects/pin-config-section/pin-config-screen";
import {
  getCoreContainerSoc,
  getCoreLabel,
  signalAssignChevron,
} from "../../page-objects/peripheral-allocation-section/peripheral-allocation-screen";
import { accordion } from "../../page-objects/clock-config-section/clock-config-screen";
import {
  pinmuxSearchBox,
  pinmuxSearchResults,
} from "../../page-objects/pin-config-section/pinmux-search";

/*
 * Feature: System Planner to check for the filtering the Pins as "assigned", "conflicts" and "available" in the Pin configuration section
 *     As a CodeFusion Studio user
 *     I want to use the pin filters (Assigned, Conflicts, Available)
 *     So that I can quickly understand and manage the pin usage of my peripherals
 *
 * Background:
 *     Given VS Code is open with the CodeFusion Studio extension loaded
 *     And all editors are closed
 *     And all notifications are dismissed
 *
 * Scenario: User has selected the ADC peripheral assigned to ARM core
 *     Given the cfsconfig file is opened
 *     And I wait for the webview to load
 *     And I switch to the WebView frame
 *     When I click on the "peripheral" navigation tab
 *     And I click on ADC Peripheral to assign to arm cortex core
 *     Then I verify that ADC peripheral is assigned to ARM Cortex-M4 core
 *
 *
 *  Scenario: User clicks on the Pin tab and enables the CLK_EXT Signal to ADC peripheral, enables ANT-CTRL0 to BLE peripheral
 *     Given the cfsconfig file is opened
 *     And I click on the "Pin" navigation tab
 *     And I enable  the signal CLK_EXT's Pin Input frequency to ADC peripheral
 *     Then I verify that the  CLK_EXT's Pin Input frequency is enabled for ADC peripheral
 *     And I enable the signal to BLE peripheral
 *     Then I verify that ANT-CTRL0 signal is enabled for BLE peripheral
 *
 *  Scenario: User creates conflict by enabling the same Signal P0.9 to GPIO0 and ADC peripherals
 *     Given the cfsconfig file  is opened
 *     And I enable  the signal P0.9 Pin Input frequency to GPIO0 peripheral for the conflict creation
 *     Then I verify that the  P0.9 Pin Input frequency is enabled for GPIO0 peripheral
 *
 *  Scenario: User verifies the Pin filters are filtering the Pins as expected
 *     Given the cfsconfig file is opened
 *     And user clicks on "Assigned" filter
 *     Then I verify that all assigned pins of the peripherals are present
 *     And I click on "Conflicts" filter
 *     Then I verify that all conflicting pins of the peripherals are present
 *     And I click on "Available" filter
 *     Then I verify that all available pins of the peripherals are present
 *     Then I verify that assigned toggles are NOT displayed in available filter
 *
 */

describe("Pinmux Filter Tests", () => {
  // === Given the existing cfsconfig file generated via workspace creation===
  const configFile = "max32690-wlp.cfsconfig";
  const configPath = getConfigPathForFile(configFile);

  // ===Test Setup===
  let workbench: Workbench;
  let browser: VSBrowser;
  let view: WebView;
  browser = VSBrowser.instance;

  before(async () => {
    browser = VSBrowser.instance;
    await new Workbench().executeCommand("workbench.action.closeAllEditors");
    await UIUtils.sleep(3000);
  });
  after(async () => {
    await UIUtils.sleep(2000);
    await view.switchBack();
    const wb = new Workbench();
    await wb.wait();
    await wb.executeCommand("revert and close editor");
  });

  it("Should display the filters are filtering the Pins as expected", async () => {
    await browser.openResources(configPath);
    workbench = new Workbench();
    // === And I wait for the webview to load===
    view = new WebView();
    await view.wait(4000);

    // === And all notifications are dismissed, wait for the webview to load===
    await UIUtils.dismissAllNotifications(workbench, browser);

    // ===And I switch to the WebView frame===
    await view.switchToFrame();
    expect(
      await (await UIUtils.waitForElement(view, peripheralTab)).isDisplayed(),
      "Peripheral tab should be visible after loading the WebView",
    ).to.be.true;

    // ===When I click on the "peripheral" navigation tab===
    await UIUtils.clickElement(view, peripheralTab);

    // === And I click on ADC Peripheral to assign to arm cortex core===
    await UIUtils.clickElement(view, await signalAssignChevron("ADC"));

    // ===Then I verify that ADC peripheral is assigned to ARM Cortex-M4 core===
    await UIUtils.clickElement(
      view,
      getCoreContainerSoc("max32690_arm-cortex-m4f"),
    );
    const coreLabelSelector = await getCoreLabel("max32690_arm-cortex-m4f");
    const labelElement = await UIUtils.findWebElement(view, coreLabelSelector);
    const labelElementText = await labelElement.getText();
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

    // ===Then I verify that the  CLK_EXT's Pin Input frequency is enabled for ADC peripheral===
    const dataCheckedPin = await UIUtils.getAttributeFromWebElement(
      await UIUtils.findWebElement(view, await pinToggle("ADC", "CLK_EXT")),
      "data-checked",
    );
    expect(
      dataCheckedPin,
      `Expected pin 'CLK_EXT' for peripheral 'ADC' to be enabled, but it was not.`,
    ).to.equal("true");

    // ===And I enable the signal to BLE peripheral===
    await UIUtils.clickElement(view, accordion("BLE"));
    //=== Then I verify that ANT-CTRL0 signal is enabled for BLE peripheral===
    await UIUtils.clickElement(view, await pinToggle("BLE", "ANT_CTRL0"));
    expect(
      await UIUtils.getAttributeFromWebElement(
        await UIUtils.findWebElement(view, await pinToggle("BLE", "ANT_CTRL0")),
        "data-checked",
      ),
      `Expected pin 'ANT_CTRL0' for peripheral 'BLE' to be enabled, but it was not.`,
    ).to.equal("true");
    await UIUtils.sleep(2000);

    // ===And I enable  the signal P0.9 Pin Input frequency to GPIO0 peripheral for the conflict creation===

    await UIUtils.clickElement(view, accordion("GPIO0"));
    await UIUtils.clickElement(view, await pinToggle("GPIO0", "P0.9"));
    expect(
      await UIUtils.getAttributeFromWebElement(
        await UIUtils.findWebElement(view, await pinToggle("GPIO0", "P0.9")),
        "data-checked",
      ),
      `Expected pin 'P0.9' for peripheral 'GPIO0' to be enabled, but it was not.`,
    ).to.equal("true");
    await UIUtils.sleep(2000);

    // ===And user clicks on "Assigned" filter===
    await UIUtils.clickElement(view, "filter-control:assigned");

    // ===Then I verify that all assigned pins of the peripherals are present===
    await assertPeripheralsPresent(
      view,
      ["CAN0", "BLE", "MISC", "LPTMR0", "CAN1"],
      true,
    );

    await UIUtils.sleep(4000);

    //=== And I click on "Conflicts" filter===
    await UIUtils.clickElement(view, "filter-control:conflicts");
    await assertPeripheralsPresent(view, ["ADC", "GPIO0"], true);

    //===Then I verify that all conflicting pins of the peripherals are present===
    expect(
      await (
        await UIUtils.dataTest(view, "accordion:conflict:ADC")
      ).isDisplayed(),
      "ADC conflict icon should be displayed",
    ).to.be.true;
    expect(
      await (
        await UIUtils.dataTest(view, "accordion:conflict:GPIO0")
      ).isDisplayed(),
      "GPIO0 conflict icon should be displayed",
    ).to.be.true;

    //=== And I click on "Available" filter===
    await UIUtils.clickElement(view, "filter-control:available");
    await UIUtils.sleep(1000);

    //=== Then I verify that all available peripherals are present===
    const availablePeripherals = await view.findWebElements(
      By.css('[id^="pincfg-peripheral-"]'),
    );
    expect(
      availablePeripherals.length,
      "Should have available peripherals",
    ).to.be.greaterThan(5);

    //=== Then I verify that assigned toggles are NOT displayed in available filter===
    const assignedSignals = [
      { peripheral: "BLE", signal: "ANT_CTRL0" },
      { peripheral: "ADC", signal: "CLK_EXT" },
    ];

    for (const { peripheral, signal } of assignedSignals) {
      await UIUtils.clickElement(view, accordion(peripheral));
      const toggleElements = await view.findWebElements(
        await pinToggle(peripheral, signal),
      );
      expect(
        toggleElements.length,
        `${peripheral} ${signal} toggle should not be displayed in available filter as it's already assigned`,
      ).to.equal(0);
    }
  }).timeout(150000);
});

describe("Pin Config - Auto clearing of pin filters - CFSIO-21304", () => {
  /*
   * Feature: Auto clearing of active pin filters in Pin configuration
   *     As a CodeFusion Studio user
   *     I want the active pin filters to clear automatically when their result set becomes empty
   *     So that the UI always reflects the current pin assignment/conflict state
   *
   * Background:
   *     Given VS Code is open with the CodeFusion Studio extension loaded
   *     And all editors are closed
   *     And all notifications are dismissed
   *     And the cfsconfig file max32690-wlp-clearing-pinmuxFilters.cfsconfig is opened
   *     And I switch to the WebView frame
   *     And I navigate to the Pin tab
   *
   * Scenario: Assigned filter clears after all assigned pins are unassigned
   *     Given the Assigned filter is applied
   *     When I unassign all currently assigned GPIO0 and UART0 signals
   *     Then the Assigned filter is automatically cleared and disabled
   *
   * Scenario: Conflicts filter clears after conflict is resolved
   *     Given a conflict is created on pin P2.12 between GPIO2 and UART0
   *     And the Conflicts filter is applied
   *     When I unassign the conflicting GPIO2 P2.12 signal
   *     Then the Conflicts filter is automatically cleared and disabled
   */
  // === Given the existing cfsconfig file generated via workspace creation===
  const configFile = "max32690-wlp-clearing-pinmuxFilters.cfsconfig";
  const configPath = getConfigPathForFile(configFile);

  // ===Test Setup===
  let workbench: Workbench;
  let browser: VSBrowser;
  let view: WebView;
  browser = VSBrowser.instance;

  beforeEach(async () => {
    browser = VSBrowser.instance;
    await new Workbench().executeCommand("workbench.action.closeAllEditors");
  });

  afterEach(async () => {
    if (view) {
      await view.switchBack();
    }
    const wb = new Workbench();
    await wb.wait();
    await wb.executeCommand("revert and close editor");
  });

  it("Verify that the assigned filter is cleared after unassigning of pins", async () => {
    await browser.openResources(configPath);
    workbench = new Workbench();
    // === And I wait for the webview to load===
    view = new WebView();
    await view.wait(4000);

    // === And all notifications are dismissed, wait for the webview to load===
    await UIUtils.dismissAllNotifications(workbench, browser);

    // ===And I switch to the WebView frame===
    await view.switchToFrame();
    // When the user navigates to the Pin Menu
    await UIUtils.clickElement(view, pinTab);

    // Click on the assigned filter
    await UIUtils.clickElement(view, assignedFilterControl);

    // Click on GPIO0 peripheral to expand it
    await UIUtils.clickElement(view, accordion("GPIO0"));

    // Click on the toggle for P0.12 signal to unassign it
    await UIUtils.clickElement(view, await pinToggle("GPIO0", "P0.12"));

    // Click on the toggle for P0.13 signal to unassign it
    await UIUtils.clickElement(view, await pinToggle("GPIO0", "P0.13"));

    // Verify that the assigned filter is still applied as UART0 peripherals are still assigned
    const assignedFilterElement = await UIUtils.findWebElement(
      view,
      assignedFilterControl,
    );
    const isAssignedFilterApplied =
      await assignedFilterElement.getAttribute("appearance");
    expect(
      isAssignedFilterApplied,
      "Assigned filter should still be applied after unassigning GPIO0 signals",
    ).to.equal("primary");

    expect(await assignedFilterElement.getAttribute("class")).to.not.contain(
      "disabled",
    );

    // Click on UART0 peripheral to expand it
    await UIUtils.clickElement(view, accordion("UART0"));

    // Click on the toggle for RX signal to unassign it
    await UIUtils.clickElement(view, await pinToggle("UART0", "RX"));

    // Click on the toggle for TX signal to unassign it
    await UIUtils.clickElement(view, await pinToggle("UART0", "TX"));

    // Verify that the assigned filter is automatically cleared as no peripherals are assigned
    const isAssignedFilterCleared =
      await assignedFilterElement.getAttribute("appearance");
    expect(
      isAssignedFilterCleared,
      "Assigned filter should be cleared after unassigning all peripherals",
    ).to.equal("secondary");

    expect(await assignedFilterElement.getAttribute("class")).to.contain(
      "disabled",
    );
  }).timeout(150000);

  it("Verify that the conflicts filter is cleared after unassigning one of the pins", async () => {
    await browser.openResources(configPath);
    workbench = new Workbench();
    // === And I wait for the webview to load===
    view = new WebView();
    await view.wait(4000);

    // === And all notifications are dismissed, wait for the webview to load===
    await UIUtils.dismissAllNotifications(workbench, browser);

    // ===And I switch to the WebView frame===
    await view.switchToFrame();
    // When the user navigates to the Pin Menu
    await UIUtils.clickElement(view, pinTab);

    // Click on the pinmux search and search for Pin P2.12
    const pinmuxSearchBoxElement = await UIUtils.findWebElement(
      view,
      pinmuxSearchBox,
    );
    await clearAndSearch(pinmuxSearchBoxElement, "P2.12");

    await UIUtils.clickElement(view, await pinmuxSearchResults("P2.12"));

    // Click on the toggle for P2.12(J5) signal to assign it to create conflict with UART0 TX signal
    await UIUtils.clickElement(view, await pinToggle("GPIO2", "P2.12"));

    expect(
      await (
        await UIUtils.findWebElement(view, pinConflictError)
      ).isDisplayed(),
      "Conflict error icon should be displayed for P2.12 signal",
    ).to.be.true;

    // Click on the back button in the details container to go back to the main pin configuration screen
    await UIUtils.clickElement(view, detailsContainerBackButton);

    // Click on the conflicts filter
    await UIUtils.clickElement(view, conflictFilterControl);

    // Verify the conflicts icon is displayed for GPIO2 and UART0 peripherals
    expect(
      await (
        await UIUtils.findWebElement(
          view,
          await peripheralConflictIcon("GPIO2"),
        )
      ).isDisplayed(),
      "GPIO2 conflict icon should be displayed",
    ).to.be.true;

    expect(
      await (
        await UIUtils.findWebElement(
          view,
          await peripheralConflictIcon("UART0"),
        )
      ).isDisplayed(),
      "UART0 conflict icon should be displayed",
    ).to.be.true;

    // Click on the GPIO2 peripheral to expand it
    await UIUtils.clickElement(view, accordion("GPIO2"));

    // Click on the toggle for P2.12(J5) signal to unassign it and resolve the conflict
    await UIUtils.clickElement(view, await pinToggle("GPIO2", "P2.12"));

    // Verify that the conflicts filter is automatically cleared as no peripherals are in conflict
    const conflictFilterElement = await UIUtils.findWebElement(
      view,
      conflictFilterControl,
    );
    const isConflictFilterCleared =
      await conflictFilterElement.getAttribute("appearance");
    expect(
      isConflictFilterCleared,
      "Conflicts filter should be cleared after unassigning the conflicting pin",
    ).to.equal("secondary");

    expect(await conflictFilterElement.getAttribute("class")).to.contain(
      "disabled",
    );
  }).timeout(150000);
});
