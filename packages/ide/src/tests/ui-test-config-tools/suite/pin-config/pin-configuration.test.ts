/**
 *
 * Copyright (c) 2024-2026 Analog Devices, Inc.
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

// Ticket: CFSIO-6372-Automation-Pin-Configuration-Loading file Pins
/*
Feature: Pin Configuration — Loading file Pins

  Background:
    Given a cfsconfig file "max32690-wlp-dual-core-blinky.cfsconfig" with pins already assigned

  Scenario: Load in-file pins and verify persistence of signal configuration
    Given I open the cfsconfig file in CodeFusion Studio
    And I open the Pin menu and apply the "Assigned" filter
    When I collect the Assigned pins from the UI
    And I parse the same cfsconfig JSON
    Then the pins shown in the UI should equal the assigned peripherals from the JSON
    When I open the Pin Config for peripheral "GPIO0" and signal "P0.11"
    Then the Signal Config sidebar is opened
    And I capture the configuration values from the UI
    And I fetch the configuration for "GPIO0" / "P0.11" from the JSON
    Then the UI configuration should semantically match the JSON configuration
      (e.g., OUT ↔ LED, VDDIO ↔ Use VDDIO, DS "0" ↔ Drive Strength 0)
*/

import { expect } from "chai";
import { VSBrowser, WebView, Workbench } from "vscode-extension-tester";

import { UIUtils } from "../../../ui-test-utils/ui-utils";
import {
  driveStrengthDropdown,
  functionAttachedDropdown,
  getValueFromSidebarConfig,
  nonDefaultValue,
  nonDefaultValueText,
  polarityDropdown,
  polarityDropdownLabel,
  polarityDropdownOption,
  powerSupplyDropdown,
  resetToDefaultButton,
  setAliasInput,
  setDevicetreeIdentifierInput,
  setPHandelIdentifierInput,
} from "../../page-objects/pin-config-section/signal-config-sidebar";
import {
  expectSignalConfigMatchesUI,
  getConfigPathForFile,
  getPeripheralNames,
  getSignalConfigMap,
  parseJSONFile,
} from "../../config-tools-utility/cfsconfig-utils";
import {
  pinTab,
  assignedFilterControl,
  peripheralTab,
} from "../../page-objects/main-menu";
import {
  assignedPinsList,
  pinDropdown,
  pinConfigButton,
} from "../../page-objects/pin-config-section/pin-config-screen";
import { waitForSidebarToOpen } from "../../page-objects/pin-config-section/signal-config-sidebar";
import {
  coreSelectorButton,
  signalAssignChevron,
  signalPeripheralBlock,
} from "../../page-objects/peripheral-allocation-section/peripheral-allocation-screen";

describe("Pin Configuration — Loading file Pins", () => {
  let workbench: Workbench;
  let browser: VSBrowser;
  let view: WebView;
  browser = VSBrowser.instance;

  before(async function () {
    this.timeout(10000);
    ({ browser } = await UIUtils.setupTestSuite({ sleepMs: 3000 }));
  });

  afterEach(async function () {
    this.timeout(10000);
    await UIUtils.teardownTestSuite(view);
  });

  it("Pin configuration in Signal Configuration sidebar matches JSON configuration @regression", async () => {
    // Given I open the cfsconfig file in CodeFusion Studio
    const configPath = getConfigPathForFile(
      "max32690-wlp-dual-core-blinky.cfsconfig",
    );
    await browser.openResources(configPath);
    workbench = new Workbench();

    console.log("Opened the cfsconfig file");
    await UIUtils.dismissAllNotifications(workbench, browser);
    await UIUtils.sleep(5000);
    console.log("Waiting for the element to be located in the DOM");
    view = new WebView();
    await view.wait();
    await view.switchToFrame();

    // And I open the Pin menu and apply the "Assigned" filter
    await UIUtils.clickElement(view, pinTab);
    console.log("PIN Menu UI rendered");
    await UIUtils.clickElement(view, assignedFilterControl);
    console.log("Assigned filter applied");

    // When I collect the Assigned pins from the UI
    const assignedPinsNames: string[] = await UIUtils.getTextFromWebElements(
      view,
      assignedPinsList,
    );

    // And I parse the same cfsconfig JSON
    const peripheralData = parseJSONFile(configPath);

    // Then the pins shown in the UI should equal the assigned peripherals from the JSON
    const peripheralNames: string[] = getPeripheralNames(peripheralData);
    expect(
      peripheralNames,
      "Pins displayed in UI did not match values in JSON file",
    ).to.have.members(assignedPinsNames);

    // When I open the Pin Config for peripheral "GPIO0" and signal "P0.11"
    await UIUtils.clickElement(view, await pinDropdown("GPIO0"));
    await UIUtils.clickElement(view, await pinConfigButton("GPIO0", "P0.11"));

    // Then the Signal Config sidebar is opened
    await waitForSidebarToOpen(view, 10000);
    console.log("Panel refreshed");

    // And I capture the configuration values from the UI
    const gpio0FunctionAttachedValue = await getValueFromSidebarConfig(
      view,
      functionAttachedDropdown,
    );
    const powerSupplyValue = await getValueFromSidebarConfig(
      view,
      powerSupplyDropdown,
    );
    const driveStrengthValue = await getValueFromSidebarConfig(
      view,
      driveStrengthDropdown,
    );
    const polarityValue = await getValueFromSidebarConfig(
      view,
      polarityDropdown,
    );
    const setDevicetreeIdentifierValue = await getValueFromSidebarConfig(
      view,
      setDevicetreeIdentifierInput,
    );
    const setPhandleIdentifierValue = await getValueFromSidebarConfig(
      view,
      setPHandelIdentifierInput,
    );
    const setAliasValue = await getValueFromSidebarConfig(view, setAliasInput);

    const uiValues = {
      MODE: gpio0FunctionAttachedValue,
      PWR: powerSupplyValue,
      POLARITY: polarityValue,
      DT_NAME: setDevicetreeIdentifierValue,
      PHANDLE: setPhandleIdentifierValue,
      DS: driveStrengthValue,
      ALIAS: setAliasValue,
    };
    console.log("Configs for GPIO0 pin, P0.11 signal from UI: ", uiValues);

    // And I fetch the configuration for "GPIO0" / "P0.11" from the JSON
    const jsonConfigs = getSignalConfigMap(peripheralData, "GPIO0", "P0.11");
    console.log("Configs for GPIO0 pin, P0.11 signal from JSON: ", jsonConfigs);

    // Then the UI configuration should semantically match the JSON configuration
    expectSignalConfigMatchesUI(jsonConfigs, uiValues);
    console.log("Compared values matched");
  });

  // Ticket: CFSIO-23870-Reset-To-Default
  /*
  Feature: Pin Configuration — Reset to Default

    Background:
      Given a cfsconfig file "max32657-wlp-trustzone.cfsconfig" with no pins assigned

    Scenario: Reset To Default button visibility toggles with polarity value changes
      Given I open the cfsconfig file in CodeFusion Studio
      And I allocate signal "P0.5" on peripheral "GPIO0" to the "CM33-secure" project
      And I navigate to the Pin Config for peripheral "GPIO0" and signal "P0.5"
      Then the Signal Config sidebar is opened
      When I set the polarity value to "HIGH"
      Then the Reset To Default button should be displayed
      And the non-default value indicator should be displayed
      And the Polarity label should show "Polarity *"
      When I set the polarity value to "LOW"
      Then the Reset To Default button should not be displayed
      And the non-default value indicator should not be displayed
      And the Polarity label should show "Polarity"
  */
  it("Verify the Reset To Default button is not displayed when the polarity value is set to default @regression", async () => {
    // Given I open the cfsconfig file in CodeFusion Studio
    const configPath = getConfigPathForFile("max32657-wlp-trustzone.cfsconfig");
    await browser.openResources(configPath);
    workbench = new Workbench();
    const peripheral = "GPIO0";
    const signal = "P0.5";

    console.log("Opened the cfsconfig file");
    await UIUtils.dismissAllNotifications(workbench, browser);
    await UIUtils.sleep(5000);
    console.log("Waiting for the element to be located in the DOM");
    view = new WebView();
    await view.wait(2000);
    await view.switchToFrame();
    await UIUtils.waitForElement(view, peripheralTab, 30000);

    // And I open the Pin menu and apply the "Assigned" filter
    await UIUtils.clickElement(view, peripheralTab);
    await UIUtils.clickElement(view, await signalPeripheralBlock(peripheral));
    await UIUtils.clickElement(view, await signalAssignChevron(signal));

    // TrustZone SoC has two projects on the same core, so allocation requires picking one
    await UIUtils.clickElement(view, await coreSelectorButton("CM33-secure"));

    // Now click on Pin Config Tab
    await UIUtils.clickElement(view, pinTab);
    await UIUtils.clickElement(view, await pinDropdown(peripheral));
    await UIUtils.clickElement(view, await pinConfigButton(peripheral, signal));

    // Then the Signal Config sidebar is opened
    await waitForSidebarToOpen(view, 10000);
    console.log("Side Panel opened");
    await UIUtils.clickElement(view, polarityDropdown);
    await UIUtils.clickElement(view, await polarityDropdownOption("HIGH"));
    let nonDefaultValueElements = await view.findWebElements(nonDefaultValue);
    expect(
      nonDefaultValueElements.length,
      "Non-default value indicator should be present when the polarity is set to HIGH",
    ).to.equal(1);
    if (nonDefaultValueElements.length > 0) {
      const nonDefaultValueTextElement = await UIUtils.findWebElement(
        view,
        nonDefaultValueText,
      );
      expect((await nonDefaultValueTextElement.getText()).trim()).to.equal(
        "* non-default value",
      );
    }

    let resetToDefaultButtonElement =
      await view.findWebElements(resetToDefaultButton);
    expect(
      resetToDefaultButtonElement.length,
      "Reset To Default button should be present when the polarity is set to HIGH",
    ).to.equal(1);

    let polarityLabel = await UIUtils.waitForElementToBeVisible(
      view,
      await polarityDropdownLabel(signal),
    );
    expect((await polarityLabel.getText()).trim()).to.equal("Polarity *");

    await UIUtils.sleep(1000);
    await UIUtils.clickElement(view, polarityDropdown);
    await UIUtils.clickElement(view, await polarityDropdownOption("LOW"));
    nonDefaultValueElements = await view.findWebElements(nonDefaultValue);
    expect(
      nonDefaultValueElements.length,
      "Non-default value indicator should not be present when the polarity is set to LOW",
    ).to.equal(0);

    resetToDefaultButtonElement =
      await view.findWebElements(resetToDefaultButton);
    expect(
      resetToDefaultButtonElement.length,
      "Reset To Default button should not be present when the polarity is set to LOW",
    ).to.equal(0);

    polarityLabel = await UIUtils.waitForElementToBeVisible(
      view,
      await polarityDropdownLabel(signal),
    );
    expect((await polarityLabel.getText()).trim()).to.equal("Polarity");
  });
});
