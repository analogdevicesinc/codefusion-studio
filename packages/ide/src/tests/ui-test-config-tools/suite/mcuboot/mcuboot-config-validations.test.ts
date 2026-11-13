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

import { expect } from "chai";
import { VSBrowser, WebView, By, Key } from "vscode-extension-tester";

import { UIUtils } from "../../../ui-test-utils/ui-utils";
import { getConfigPathForFile } from "../../config-tools-utility/cfsconfig-utils";
import { setupMCUBootView } from "../../page-objects/mcuboot-section/mcuboot-screen";

const SELECT_ALL_MODIFIER =
  process.platform === "darwin" ? Key.COMMAND : Key.CONTROL;

/*
 * Feature: MCUBoot Configuration Validation
 *     As a CodeFusion Studio user
 *     I want to see validation errors when MCUBoot configuration has invalid data
 *     So that I can fix issues before building
 *
 * Background:
 *     Given VS Code is open with the CodeFusion Studio extension loaded
 *     And all editors are closed
 *     And all notifications are dismissed
 */

describe("MCUBoot Configuration Validation", () => {
  const configFile = "mcuboot-config.cfsconfig";
  const configPath = getConfigPathForFile(configFile);

  let browser: VSBrowser;
  let view: WebView;

  before(async function () {
    this.timeout(60000);
    ({ browser } = await UIUtils.setupTestSuite({ sleepMs: 3000 }));
  });

  after(async function () {
    this.timeout(60000);
    await UIUtils.teardownTestSuite(view, configPath);
  });

  /*
   * Scenario: Navigate to MCUBoot config and select "New App Pack 1"
   *     Given the existing cfsconfig file is opened
   *     And I navigate to the MCUBoot Config tab
   *     Then the MCUBoot config screen should be visible
   */
  it("Should open MCUBoot config and navigate to the first app pack", async function () {
    // Given: Open the cfsconfig file
    view = await setupMCUBootView(configPath, browser);

    // Then: Verify the MCUBoot config container is visible
    const mcubootContainer = await UIUtils.waitForElement(
      view,
      By.css('[data-test="mcuboot-config:container"]'),
    );
    expect(
      await mcubootContainer.isDisplayed(),
      "MCUBoot config container should be visible",
    ).to.be.true;
  }).timeout(60000);

  /*
   * Scenario: Validation error is shown when image version is cleared
   *     Given the first app pack "New App Pack 1" is selected
   *     And the image card is expanded
   *     When I clear the image version field
   *     Then a validation error should be displayed for the image version field
   */
  it("Should show validation error when image version is cleared", async function () {
    // Given: Select the first app pack
    const sidebar = await UIUtils.findWebElement(
      view,
      By.css('[data-test="mcuboot-config:sidebar"]'),
    );

    const firstAppPackItem = await sidebar.findElement(
      By.xpath(`.//*[contains(text(), "New App Pack 1")]`),
    );
    await firstAppPackItem.click();
    await UIUtils.sleep(1000);

    // And: Expand the image card
    const imageCardHeader = await UIUtils.findWebElement(
      view,
      By.css('[data-test^="image-card:"][data-test$="-header"]'),
    );
    await imageCardHeader.click();
    await UIUtils.sleep(1000);

    // When: Clear the image version field
    const imageVersionField = await UIUtils.waitForElement(
      view,
      By.css('[data-test="image:Image 1-image-version-control-input"]'),
    );
    await imageVersionField.click();
    await imageVersionField.sendKeys(Key.chord(SELECT_ALL_MODIFIER, "a"));
    await imageVersionField.sendKeys(Key.BACK_SPACE);
    await UIUtils.sleep(1000);

    // Then: Validation error should be displayed
    const versionError = await UIUtils.waitForElement(
      view,
      By.css('[data-test="image:Image 1-image-version-error"]'),
    );
    expect(
      await versionError.isDisplayed(),
      "Image version validation error should be visible",
    ).to.be.true;
  }).timeout(60000);

  /*
   * Scenario: Validation error is shown when location address is cleared
   *     Given the image card is expanded
   *     When I clear the location address field
   *     Then a validation error should be displayed for the location address field
   */
  it("Should show validation error when location address is cleared", async function () {
    // When: Clear the location address field (HexInputField uses child input)
    const locationAddressInput = await UIUtils.findWebElement(
      view,
      By.css('[data-test="image:Image 1-location-address"] input'),
    );
    await locationAddressInput.click();
    await locationAddressInput.sendKeys(Key.chord(SELECT_ALL_MODIFIER, "a"));
    await locationAddressInput.sendKeys(Key.BACK_SPACE);
    await UIUtils.sleep(1000);

    // Then: Validation error should be displayed
    const locationError = await UIUtils.waitForElement(
      view,
      By.css('[data-test="image:Image 1-location-address-error"]'),
    );
    expect(
      await locationError.isDisplayed(),
      "Location address validation error should be visible",
    ).to.be.true;
  }).timeout(60000);

  /*
   * Scenario: Validation error is shown when slot size is below minimum
   *     Given the image card is expanded
   *     When I set the slot size to a value below the minimum (less than 4096 bytes)
   *     Then a validation error should be displayed for the slot size field
   */
  it("Should show validation error when slot size is below minimum", async function () {
    // When: Clear and set slot size to "0"
    const slotSizeField = await UIUtils.findWebElement(
      view,
      By.css('[data-test="image:Image 1-slot-size-control-input"]'),
    );
    await slotSizeField.click();
    await slotSizeField.sendKeys(Key.chord(SELECT_ALL_MODIFIER, "a"));
    await slotSizeField.sendKeys("0");
    await UIUtils.sleep(1000);

    // Then: Validation error should be displayed
    const slotSizeError = await UIUtils.waitForElement(
      view,
      By.css('[data-test="image:Image 1-slot-size-error"]'),
    );
    expect(
      await slotSizeError.isDisplayed(),
      "Slot size validation error should be visible",
    ).to.be.true;
  }).timeout(60000);

  /*
   * Scenario: Validation error is shown for a new app pack without a core assigned
   *     Given a disabled app pack without a core is selected ("New App Pack 2")
   *     When I enable the app pack
   *     Then a validation error should be displayed for the core ID field
   */
  it("Should show validation error when core ID is not assigned", async function () {
    // Given: Select "New App Pack 2" which has no core assigned
    const sidebar = await UIUtils.findWebElement(
      view,
      By.css('[data-test="mcuboot-config:sidebar"]'),
    );

    const secondAppPackItem = await sidebar.findElement(
      By.xpath(`.//*[contains(text(), "New App Pack 2")]`),
    );
    await secondAppPackItem.click();
    await UIUtils.sleep(1000);

    // When: Enable the app pack by clicking the toggle
    const enabledToggle = await UIUtils.findWebElement(
      view,
      By.css('[data-test="app-packages-summary:enabled-toggle-span"]'),
    );
    // Scroll into view and use JS click to avoid overlay interception from help banner
    await VSBrowser.instance.driver.executeScript(
      "arguments[0].scrollIntoView({ block: 'center' }); arguments[0].click();",
      enabledToggle,
    );
    await UIUtils.sleep(1000);

    // Then: Validation error should be displayed for core ID dropdown
    const coreIdError = await UIUtils.waitForElement(
      view,
      By.css('[data-test="package-core-error"]'),
    );
    expect(
      await coreIdError.isDisplayed(),
      "Core ID validation error should be visible when no core is assigned",
    ).to.be.true;
  }).timeout(60000);

  /*
   * Scenario: Sidebar conflict icon is shown for app pack with validation errors
   *     Given an app pack with validation errors exists
   *     Then the sidebar should display a conflict icon for that app pack
   */
  it("Should display conflict icon in sidebar for app pack with errors", async function () {
    // Given: "New App Pack 2" was enabled in the previous test without a core
    // Then: The sidebar conflict icon should be visible
    const conflictIcon = await UIUtils.waitForElement(
      view,
      By.css('[data-test="sidebar-conflict-icon"]'),
    );
    expect(
      await conflictIcon.isDisplayed(),
      "Sidebar conflict icon should be visible for app pack with errors",
    ).to.be.true;
  }).timeout(60000);
});
