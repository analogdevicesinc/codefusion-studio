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
import {
  container,
  sidebar,
  applicationPackageSummary,
  addAppPackButton,
  appPackItems,
  removeAppPackButton,
  deleteAppPackConfirmButton,
  setupMCUBootView,
} from "../../page-objects/mcuboot-section/mcuboot-screen";

/*
 * Feature: MCUBoot Configuration Screen Visibility
 *     As a CodeFusion Studio user
 *     I want to see the MCUBoot configuration screen
 *     So that I can configure MCUBoot settings for my Zephyr project
 *
 * Background:
 *     Given VS Code is open with the CodeFusion Studio extension loaded
 *     And all editors are closed
 *     And all notifications are dismissed
 */

describe("MCUBoot Configuration", () => {
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
   * Scenario: MCUBoot config screen is visible for a Zephyr project
   *     Given the existing cfsconfig file with a Zephyr project is opened
   *     Then dismiss all notifications, wait for the webview to load
   *     Then switch to frame
   *     And I click on the "MCUBoot Config" navigation tab
   *     Then I verify the MCUBoot config container is visible
   *     And I verify the MCUBoot config sidebar is visible
   *     And I verify the application package summary is visible
   */
  it("Should display the MCUBoot configuration screen when navigating to the MCUBoot tab @regression", async function () {
    // Given: The existing cfsconfig file with a Zephyr project is opened
    view = await setupMCUBootView(configPath, browser);

    // Then: I verify the MCUBoot config container is visible
    const mcubootContainer = await UIUtils.waitForElement(view, container);
    expect(
      await mcubootContainer.isDisplayed(),
      "MCUBoot config container should be visible",
    ).to.be.true;

    // And: I verify the MCUBoot config sidebar is visible
    const mcubootSidebar = await UIUtils.findWebElement(view, sidebar);
    expect(
      await mcubootSidebar.isDisplayed(),
      "MCUBoot config sidebar should be visible",
    ).to.be.true;

    // And: I verify the application package summary is visible
    const appPackSummary = await UIUtils.findWebElement(
      view,
      applicationPackageSummary,
    );
    expect(
      await appPackSummary.isDisplayed(),
      "MCUBoot application package summary should be visible",
    ).to.be.true;
  }).timeout(60000);

  /*
   * Scenario: Existing application packages are rendered in the sidebar
   *     Given the MCUBoot config screen is already open
   *     Then I verify the sidebar contains the expected application packages from the config file
   */
  it("Should render existing application packages from the config file in the sidebar @regression", async function () {
    // Given: The MCUBoot config screen is already open from the previous test
    const sidebarElement = await UIUtils.findWebElement(view, sidebar);

    // Then: I verify the sidebar lists contain all expected app packs
    const expectedPackageNames = [
      "New App Pack 1",
      "New App Pack 2",
      "New App Pack 3",
      "New App Pack 4",
      "New App Pack demo",
    ];

    const listItems = await sidebarElement.findElements(appPackItems);

    expect(
      listItems.length,
      `Sidebar should have ${expectedPackageNames.length} application packages`,
    ).to.equal(expectedPackageNames.length);

    // And: Verify each expected package name is rendered
    for (const expectedName of expectedPackageNames) {
      const matchingItem = await sidebarElement.findElement(
        By.xpath(`.//*[contains(text(), "${expectedName}")]`),
      );
      expect(
        await matchingItem.isDisplayed(),
        `Application package "${expectedName}" should be visible in sidebar`,
      ).to.be.true;
    }
  }).timeout(60000);

  /*
   * Scenario: Adding a new application package via the sidebar plus button
   *     Given the MCUBoot config screen is already open
   *     When I click the add application package button
   *     Then a new application package is added to the sidebar
   */
  it("Should add a new application package when clicking the plus button on the sidebar @regression", async function () {
    // Given: Count the current number of app packs in the sidebar
    const sidebarElement = await UIUtils.findWebElement(view, sidebar);

    const initialItems = await sidebarElement.findElements(appPackItems);
    const initialCount = initialItems.length;

    // When: I click the add application package button
    await UIUtils.clickElement(view, addAppPackButton);

    // Then: A new application package is added to the sidebar
    await UIUtils.sleep(1000);
    const updatedItems = await sidebarElement.findElements(appPackItems);

    expect(
      updatedItems.length,
      "Sidebar should have one more application package after clicking add",
    ).to.equal(initialCount + 1);

    // And: The new package has the expected default name
    const newPackageName = await sidebarElement.findElement(
      By.xpath(`.//*[contains(text(), "New App Pack 5")]`),
    );
    expect(
      await newPackageName.isDisplayed(),
      'New application package "New App Pack 5" should be visible in sidebar',
    ).to.be.true;
  }).timeout(60000);

  /*
   * Scenario: Deleting the previously added application package via the delete button
   *     Given the MCUBoot config screen is already open with "New App Pack 5" added
   *     When I select the newly added application package
   *     And I click the delete button
   *     And I confirm the deletion in the warning dialog
   *     Then the deleted application package should not be present in the sidebar
   */
  it("Should remove the previously added application package when clicking the delete button and confirming @regression", async function () {
    // Given: Select the newly added app pack "New App Pack 5" in the sidebar
    const sidebarElement = await UIUtils.findWebElement(view, sidebar);

    const newAppPackItem = await sidebarElement.findElement(
      By.xpath(`.//*[contains(text(), "New App Pack 5")]`),
    );
    await newAppPackItem.click();
    await UIUtils.sleep(1000);

    // Count items before deletion
    const itemsBeforeDeletion = await sidebarElement.findElements(appPackItems);
    const countBeforeDeletion = itemsBeforeDeletion.length;

    // When: I click the delete button
    await UIUtils.clickElement(view, removeAppPackButton);
    await UIUtils.sleep(1000);

    // And: I confirm the deletion in the warning dialog
    await UIUtils.clickElement(view, deleteAppPackConfirmButton);
    await UIUtils.sleep(1000);

    // Then: The deleted application package should not be present in the sidebar
    const itemsAfterDeletion = await sidebarElement.findElements(appPackItems);

    expect(
      itemsAfterDeletion.length,
      "Sidebar should have one less application package after deletion",
    ).to.equal(countBeforeDeletion - 1);

    // And: "New App Pack 5" should no longer be visible in the sidebar
    const remainingTexts = await Promise.all(
      itemsAfterDeletion.map((item) => item.getText()),
    );
    const deletedPackStillPresent = remainingTexts.some((text) =>
      text.includes("New App Pack 5"),
    );
    expect(
      deletedPackStillPresent,
      '"New App Pack 5" should not be present in the sidebar after deletion',
    ).to.be.false;
  }).timeout(60000);
});
