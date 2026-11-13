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
import { VSBrowser, WebView, By } from "vscode-extension-tester";

import { UIUtils } from "../../../ui-test-utils/ui-utils";
import { getConfigPathForFile } from "../../config-tools-utility/cfsconfig-utils";
import { setupMCUBootView } from "../../page-objects/mcuboot-section/mcuboot-screen";

/*
 * Feature: MCUBoot Configuration Persistence
 *     As a CodeFusion Studio user
 *     I want to see data loaded from the cfsconfig file displayed correctly
 *     So that I can verify my MCUBoot configuration persists across sessions
 *
 * Background:
 *     Given VS Code is open with the CodeFusion Studio extension loaded
 *     And all editors are closed
 *     And all notifications are dismissed
 */

describe("MCUBoot Configuration Persistence", () => {
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
   * Scenario: Application package data is loaded from the cfsconfig file
   *     Given the existing cfsconfig file with MCUBoot configuration is opened
   *     And I navigate to the MCUBoot Config tab
   *     Then the first application package should display the correct name
   *     And the enabled toggle should reflect the saved state
   *     And the Core ID dropdown should display the saved core
   *     And the sign key dropdown should display the saved key
   *     And the image details should display the saved values
   */
  it("Should load and display application package data from the cfsconfig file @regression", async function () {
    // Given: The existing cfsconfig file with MCUBoot configuration is opened
    view = await setupMCUBootView(configPath, browser);

    // Then: Select the first app pack "New App Pack 1" in the sidebar
    const sidebar = await UIUtils.findWebElement(
      view,
      By.css('[data-test="mcuboot-config:sidebar"]'),
    );

    const firstAppPackItem = await sidebar.findElement(
      By.xpath(`.//*[contains(text(), "New App Pack 1")]`),
    );
    await firstAppPackItem.click();
    await UIUtils.sleep(1000);

    // Then: Verify the app pack name is displayed correctly
    const appPackName = await UIUtils.findWebElement(
      view,
      By.css('[data-test="app-packages-summary:edit-name-trigger"]'),
    );
    const nameText = await appPackName.getText();
    expect(nameText, 'App pack name should be "New App Pack 1"').to.include(
      "New App Pack 1",
    );

    // And: Verify the enabled toggle reflects the saved state (enabled = true)
    const enabledToggle = await UIUtils.findWebElement(
      view,
      By.css('[data-test="app-packages-summary:enabled-toggle-span"]'),
    );
    expect(
      await enabledToggle.isDisplayed(),
      "Enabled toggle should be visible",
    ).to.be.true;

    // And: Verify the Core ID dropdown displays the persisted core
    const coreIdDropdown = await UIUtils.findWebElement(
      view,
      By.css('[data-test="package-core"]'),
    );
    const coreIdValue = await coreIdDropdown.getAttribute("current-value");
    expect(coreIdValue, "Core ID should match the persisted value").to.equal(
      "Core0",
    );

    // And: Verify the sign key dropdown displays the saved key "demo-key.pem"
    const signKeyDropdown = await UIUtils.findWebElement(
      view,
      By.css('[data-test="assign-sign-key:dropdown"]'),
    );
    const signKeyValue = await signKeyDropdown.getAttribute("current-value");
    expect(signKeyValue, 'Sign key should display "demo-key.pem"').to.include(
      "demo-key.pem",
    );
  }).timeout(60000);

  /*
   * Scenario: Image data is loaded correctly from the cfsconfig file
   *     Given the first application package is selected
   *     Then the image card should display the correct image name
   *     And the image location address should match the saved value
   *     And the image version should match the saved value
   *     And the slot size should match the saved value
   *     And the header size should match the saved value
   */
  it("Should load and display image data from the cfsconfig file @regression", async function () {
    // Given: The first app pack is already selected from the previous test
    // Verify the image card for "Image 1" is displayed
    const imageCard = await UIUtils.waitForElement(
      view,
      By.css('[data-test^="image-card:"]'),
    );
    expect(await imageCard.isDisplayed(), "Image card should be visible").to.be
      .true;

    // Then: Verify the image name is "Image 1"
    const imageName = await UIUtils.findWebElement(
      view,
      By.css('[data-test^="image-card:"][data-test$="-name"]'),
    );
    const imageNameText = await imageName.getText();
    expect(imageNameText, 'Image name should be "Image 1"').to.include(
      "Image 1",
    );

    // And: Expand the image card to reveal the form fields
    const imageCardHeader = await UIUtils.findWebElement(
      view,
      By.css('[data-test^="image-card:"][data-test$="-header"]'),
    );
    await imageCardHeader.click();
    await UIUtils.sleep(1000);

    // And: Verify the location address is "0xAAA" (HexInputField uses child input)
    const locationAddress = await UIUtils.waitForElement(
      view,
      By.css('[data-test="image:Image 1-location-address"] input'),
    );
    const locationAddressValue = await locationAddress.getAttribute("value");
    expect(
      locationAddressValue,
      'Location address should be "0xAAA"',
    ).to.include("AAA");

    // And: Verify the image version is "1.1.0" (TextField uses -control-input suffix)
    const imageVersion = await UIUtils.findWebElement(
      view,
      By.css('[data-test="image:Image 1-image-version-control-input"]'),
    );
    const imageVersionValue = await imageVersion.getAttribute("current-value");
    expect(imageVersionValue, 'Image version should be "1.1.0"').to.include(
      "1.1.0",
    );

    // And: Verify the slot size is "4" (displayed in MB unit)
    const slotSize = await UIUtils.findWebElement(
      view,
      By.css('[data-test="image:Image 1-slot-size-control-input"]'),
    );
    const slotSizeValue = await slotSize.getAttribute("current-value");
    expect(slotSizeValue, "Slot size should be 4 (MB)").to.equal("4");

    // And: Verify the header size is "32" (IntegerField uses -control-input suffix)
    const headerSize = await UIUtils.findWebElement(
      view,
      By.css('[data-test="image:Image 1-header-size-control-input"]'),
    );
    const headerSizeValue = await headerSize.getAttribute("current-value");
    expect(headerSizeValue, "Header size should be 32").to.include("32");
  }).timeout(60000);

  /*
   * Scenario: All application packages from the config file are loaded in the sidebar
   *     Given the MCUBoot config screen is open
   *     Then the sidebar should contain all 5 application packages from the config file
   *     And each package name should match the saved data
   */
  it("Should load all application packages from the cfsconfig file into the sidebar @regression", async function () {
    // Given: The MCUBoot config screen is already open
    const sidebar = await UIUtils.findWebElement(
      view,
      By.css('[data-test="mcuboot-config:sidebar"]'),
    );

    // Then: Verify all 5 application packages are listed
    const expectedPackageNames = [
      "New App Pack 1",
      "New App Pack 2",
      "New App Pack 3",
      "New App Pack 4",
      "New App Pack demo",
    ];

    const listItems = await sidebar.findElements(
      By.css('[data-test^="sidebar:app-pack-item:"]'),
    );

    expect(
      listItems.length,
      `Sidebar should have ${expectedPackageNames.length} application packages loaded from config`,
    ).to.equal(expectedPackageNames.length);

    // And: Verify each expected package name is present
    for (const expectedName of expectedPackageNames) {
      const matchingItem = await sidebar.findElement(
        By.xpath(`.//*[contains(text(), "${expectedName}")]`),
      );
      expect(
        await matchingItem.isDisplayed(),
        `Application package "${expectedName}" should be loaded from config file`,
      ).to.be.true;
    }
  }).timeout(60000);
});
