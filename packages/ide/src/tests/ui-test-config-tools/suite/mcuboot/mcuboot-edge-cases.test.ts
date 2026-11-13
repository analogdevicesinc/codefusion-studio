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
import { VSBrowser, WebView, Workbench } from "vscode-extension-tester";

import { UIUtils } from "../../../ui-test-utils/ui-utils";
import {
  getConfigPathForFile,
  parseJSONFile,
} from "../../config-tools-utility/cfsconfig-utils";
import {
  navTab,
  sidebar,
  addImageButton,
  removeAppPackButton,
  deleteAppPackConfirmButton,
  addAppPackButton,
  appPackItems,
  getImageTitleByName,
  getAppPackItemByName,
} from "../../page-objects/mcuboot-section/mcuboot-screen";

/*
 * Feature: MCUBoot Maximum Application Package Limits
 *     As a CodeFusion Studio user
 *     I want to understand the limits of application packages
 *     So that I can create the maximum number of packages supported by the system
 *
 * Background:
 *     Given VS Code is open with the CodeFusion Studio extension loaded
 *     And all editors are closed
 *     And all notifications are dismissed
 */

describe("MCUBoot Maximum Application Package Limits", () => {
  const configFile = "mcuboot-config.cfsconfig";
  const configPath = getConfigPathForFile(configFile);

  let workbench: Workbench;
  let browser: VSBrowser;
  let view: WebView;

  before(async function () {
    ({ browser, workbench } = await UIUtils.setupTestSuite());
  });

  afterEach(async () => {
    await UIUtils.teardownTestSuiteKeepingChanges(view);
  });

  after(async function () {
    // Teardown - reset cfsconfig file to original state
    await UIUtils.teardownTestSuite(view, configPath);
  });

  /**
   * Helper function to set up the MCUBoot config view
   */
  async function setupMCUBootView(): Promise<void> {
    await browser.openResources(configPath);
    view = new WebView();
    await view.wait(8000);
    await UIUtils.dismissAllNotifications(workbench, browser);
    await view.switchToFrame(5000);

    // Navigate to MCUBoot Config tab
    await UIUtils.clickElement(view, navTab);
    await UIUtils.sleep(2000);
  }

  /**
   * Helper function to count application packages in the sidebar
   */
  async function countPackagesInSidebar(): Promise<number> {
    const sidebarElement = await UIUtils.findWebElement(view, sidebar);
    const packageItems = await sidebarElement.findElements(appPackItems);
    return packageItems.length;
  }

  /**
   * Helper function to add a new application package
   */
  async function addNewPackage(): Promise<void> {
    const addButton = await UIUtils.findWebElement(view, addAppPackButton);
    expect(addButton, "Add package button should exist").to.exist;
    await UIUtils.clickElement(view, addAppPackButton);
    await UIUtils.sleep(1000);
  }

  /**
   * Helper function to save and close the editor
   */
  async function saveAndCloseEditor(): Promise<void> {
    await view.switchBack();
    await workbench.executeCommand("workbench.action.files.save");
    await workbench.executeCommand("revert and close editor");
    await UIUtils.sleep(1000);
  }

  /*
   * Scenario: Verify initial package count
   *     Given the MCUBoot config file is opened
   *     When I navigate to the MCUBoot Config tab
   *     Then I should see 5 existing application packages
   *     And the JSON file should contain 5 ApplicationPackages
   */
  it("Should verify initial package count matches fixture", async function () {
    this.timeout(60000);

    // Given the MCUBoot config file is opened
    await setupMCUBootView();

    // When I count the packages in the sidebar
    const packageCount = await countPackagesInSidebar();
    console.log(`Initial package count in sidebar: ${packageCount}`);

    // Then I should see 5 existing application packages
    expect(
      packageCount,
      "Should have 5 packages initially (from fixture)",
    ).to.equal(5);

    // When I read the JSON file
    const config = await parseJSONFile(configPath);

    // Then ApplicationPackages should exist in the JSON
    expect(
      config.ApplicationPackages,
      "ApplicationPackages should exist in JSON",
    ).to.exist;

    // And the JSON file should contain 5 ApplicationPackages
    expect(
      config.ApplicationPackages.length,
      "JSON should contain 5 packages",
    ).to.equal(5);
  });

  /*
   * Scenario: Add packages up to maximum core count
   *     Given the MCUBoot config file is opened with 5 existing packages
   *     When I add packages until I have one for each core (4 cores total)
   *     Then the system should allow adding packages beyond the core count
   *     And I should be able to create at least 10 packages total
   *     And all packages should be saved correctly in the JSON
   */
  it("Should allow creating packages beyond core count", async function () {
    this.timeout(120000);

    // Given the MCUBoot config file is opened
    await setupMCUBootView();

    // And I get the initial package count
    const initialCount = await countPackagesInSidebar();
    console.log(`Starting with ${initialCount} packages`);

    // When I add 5 more packages (to reach 10 total)
    const packagesToAdd = 5;
    for (let i = 0; i < packagesToAdd; i++) {
      console.log(`Adding package ${i + 1} of ${packagesToAdd}...`);

      // And I add a new package
      await addNewPackage();

      // Then the count should increase by 1
      const currentCount = await countPackagesInSidebar();
      expect(
        currentCount,
        `Package count should be ${initialCount + i + 1} after adding ${i + 1} package(s)`,
      ).to.equal(initialCount + i + 1);
    }

    // Then the final count should be 10 packages
    const finalCount = await countPackagesInSidebar();
    console.log(`Final package count in sidebar: ${finalCount}`);
    expect(finalCount, "Should have 10 packages after adding 5 more").to.equal(
      10,
    );

    // When I save the file
    await saveAndCloseEditor();

    // Then the JSON file should contain 10 packages
    const config = await parseJSONFile(configPath);
    expect(
      config.ApplicationPackages.length,
      "JSON should contain 10 packages",
    ).to.equal(10);

    // And the packages should have the expected names
    const expectedNames = [
      "New App Pack 1",
      "New App Pack 2",
      "New App Pack 3",
      "New App Pack 4",
      "New App Pack demo",
      "New App Pack 5",
      "New App Pack 6",
      "New App Pack 7",
      "New App Pack 8",
      "New App Pack 9",
    ];

    // And each package name should match the expected name
    config.ApplicationPackages.forEach(
      (pkg: { Name: string }, index: number) => {
        expect(
          pkg.Name,
          `Package ${index + 1} should have correct name`,
        ).to.equal(expectedNames[index]);
      },
    );
  });

  /*
   * Scenario: Delete packages added in previous test and verify persistence
   *     Given the MCUBoot config file is opened with packages 1-8 and demo
   *     When I delete "New App Pack 7"
   *     And I confirm the deletion in the warning modal
   *     And I delete "New App Pack 8"
   *     And I confirm the deletion in the warning modal
   *     And I save the file
   *     Then the JSON file should no longer contain "New App Pack 7"
   *     And the JSON file should no longer contain "New App Pack 8"
   *     And the remaining packages should persist correctly
   */
  it("Should delete New App Pack 7 and 8 and verify persistence", async function () {
    this.timeout(90000);

    // Given the MCUBoot config file is opened
    await setupMCUBootView();

    // And I get the initial package count
    const initialCount = await countPackagesInSidebar();
    console.log(`Initial package count: ${initialCount}`);

    // And the sidebar is visible
    const sidebarElement = await UIUtils.findWebElement(view, sidebar);

    // When I find and select "New App Pack 7"
    const pack7Selector = await getAppPackItemByName("New App Pack 7");
    const pack7Item = await sidebarElement.findElement(pack7Selector);
    expect(pack7Item, "Package 7 should exist").to.exist;
    expect(await pack7Item.isDisplayed(), "Package 7 should be visible").to.be
      .true;
    expect(await pack7Item.isEnabled(), "Package 7 should be enabled").to.be
      .true;

    // And I click on it to select it
    await pack7Item.click();
    await UIUtils.sleep(1000);
    console.log("Selected New App Pack 7");

    // And I find the delete button
    let deleteButton = await UIUtils.findWebElement(view, removeAppPackButton);
    expect(deleteButton, "Delete button should exist").to.exist;
    expect(await deleteButton.isEnabled(), "Delete button should be enabled").to
      .be.true;

    // When I click the delete button
    await UIUtils.clickElement(view, removeAppPackButton);
    await UIUtils.sleep(500);

    // Then a confirmation modal should appear
    const confirmButton7 = await UIUtils.findWebElement(
      view,
      deleteAppPackConfirmButton,
    );
    expect(confirmButton7, "Delete confirm button should exist").to.exist;
    expect(
      await confirmButton7.isDisplayed(),
      "Confirm button should be visible",
    ).to.be.true;

    // And I confirm the deletion
    await UIUtils.clickElement(view, deleteAppPackConfirmButton);
    await UIUtils.sleep(1000);
    console.log("Deleted New App Pack 7");

    // Then the package count should decrease by 1
    let currentCount = await countPackagesInSidebar();
    expect(
      currentCount,
      "Should have one less package after deleting Pack 7",
    ).to.equal(initialCount - 1);

    // When I find and select "New App Pack 8"
    const pack8Selector = await getAppPackItemByName("New App Pack 8");
    const pack8Item = await sidebarElement.findElement(pack8Selector);
    expect(pack8Item, "Package 8 should exist").to.exist;
    expect(await pack8Item.isDisplayed(), "Package 8 should be visible").to.be
      .true;
    expect(await pack8Item.isEnabled(), "Package 8 should be enabled").to.be
      .true;

    // And I click on it to select it
    await pack8Item.click();
    await UIUtils.sleep(1000);
    console.log("Selected New App Pack 8");

    // And I find the delete button again
    deleteButton = await UIUtils.findWebElement(view, removeAppPackButton);
    expect(deleteButton, "Delete button should exist").to.exist;
    expect(await deleteButton.isEnabled(), "Delete button should be enabled").to
      .be.true;

    // When I click the delete button
    await UIUtils.clickElement(view, removeAppPackButton);
    await UIUtils.sleep(500);

    // Then a confirmation modal should appear
    const confirmButton8 = await UIUtils.findWebElement(
      view,
      deleteAppPackConfirmButton,
    );
    expect(confirmButton8, "Delete confirm button should exist").to.exist;
    expect(
      await confirmButton8.isDisplayed(),
      "Confirm button should be visible",
    ).to.be.true;

    // And I confirm the deletion
    await UIUtils.clickElement(view, deleteAppPackConfirmButton);
    await UIUtils.sleep(1000);
    console.log("Deleted New App Pack 8");

    // Then the package count should decrease by 2 total
    currentCount = await countPackagesInSidebar();
    expect(
      currentCount,
      "Should have two less packages after deleting both Pack 7 and 8",
    ).to.equal(initialCount - 2);

    // When I save the file
    await saveAndCloseEditor();

    // Then the JSON file should no longer contain the deleted packages
    const config = await parseJSONFile(configPath);
    const packageNames = config.ApplicationPackages.map(
      (pkg: { Name: string }) => pkg.Name,
    );

    console.log("Package names after deletion:", packageNames);
    console.log(`Total packages in JSON: ${config.ApplicationPackages.length}`);

    // And "New App Pack 7" should not be in the list
    expect(
      packageNames,
      "Should not contain New App Pack 7 after deletion",
    ).to.not.include("New App Pack 7");

    console.log("Verified New App Pack 7 is deleted from JSON");

    // And "New App Pack 8" should not be in the list
    expect(
      packageNames,
      "Should not contain New App Pack 8 after deletion",
    ).to.not.include("New App Pack 8");

    console.log("Verified New App Pack 8 is deleted from JSON");

    // And the remaining packages should persist correctly
    const expectedRemainingPackages = [
      "New App Pack 1",
      "New App Pack 2",
      "New App Pack 3",
      "New App Pack 4",
      "New App Pack demo",
      "New App Pack 5",
      "New App Pack 6",
      "New App Pack 9",
    ];

    console.log("Expected remaining packages:", expectedRemainingPackages);
    console.log("Actual remaining packages:", packageNames);

    // Then all expected packages should still exist
    expect(
      config.ApplicationPackages.length,
      "Should have 7 packages remaining",
    ).to.equal(expectedRemainingPackages.length);

    console.log(
      "Verified remaining package count is correct: 7 packages remain",
    );

    expectedRemainingPackages.forEach((expectedName) => {
      expect(packageNames, `Should contain ${expectedName}`).to.include(
        expectedName,
      );
    });

    console.log(
      "✓ Verified deletion persistence: Packages 7 and 8 successfully removed",
    );
  });
  /*
   * Scenario: Add images to an application package
   *     Given the MCUBoot config file is opened
   *     When I navigate to the MCUBoot Config tab
   *     And I create a new application package
   *     And I click the "Add Image" button
   *     Then "Image 1" title should appear in the UI
   *     When I click the "Add Image" button again
   *     Then "Image 2" title should appear in the UI
   *     And the JSON file should reflect both new images
   *     And each image should have the correct default properties
   */
  it("Should add images to an application package when clicking add button", async function () {
    this.timeout(90000);

    // Given the MCUBoot config file is opened
    await setupMCUBootView();

    // And I get the initial package count
    const initialCount = await countPackagesInSidebar();
    console.log(`Initial package count: ${initialCount}`);

    // And the sidebar is visible
    const sidebarElement = await UIUtils.findWebElement(view, sidebar);
    expect(sidebarElement, "Sidebar should exist").to.exist;

    // When I find the "Add Image" button
    const addImage = await UIUtils.findWebElement(view, addImageButton);

    console.log("Clicking add image button for first image...");
    expect(addImage, "Add image button should exist").to.exist;

    // And I click the "Add Image" button
    await UIUtils.clickElement(view, addImageButton);

    console.log("Clicked add image button - first image");
    await UIUtils.sleep(1500);

    // Then "Image 1" title should appear in the UI
    const image1TitleSelector = await getImageTitleByName("Image 1");
    const image1Title = await UIUtils.findWebElement(view, image1TitleSelector);
    expect(image1Title, "Image 1 title should exist in UI").to.exist;
    expect(await image1Title.isDisplayed(), "Image 1 title should be visible")
      .to.be.true;

    // And the title text should be "Image 1"
    const image1Text = await image1Title.getText();
    expect(image1Text, "Image 1 title should be 'Image 1'").to.equal("Image 1");
    expect(
      image1Text.length,
      "Image 1 title should not be empty",
    ).to.be.greaterThan(0);

    console.log("✓ Verified Image 1 title in UI");

    // When I click the "Add Image" button again to add second image
    const addImage2 = await UIUtils.findWebElement(view, addImageButton);
    expect(addImage2, "Add image button should exist").to.exist;
    await UIUtils.clickElement(view, addImageButton);
    await UIUtils.sleep(1500);

    console.log("Clicked add image button - second image");

    // Then "Image 2" title should appear in the UI
    const image2TitleSelector = await getImageTitleByName("Image 2");
    const image2Title = await UIUtils.findWebElement(view, image2TitleSelector);
    expect(image2Title, "Image 2 title should exist in UI").to.exist;
    expect(await image2Title.isDisplayed(), "Image 2 title should be visible")
      .to.be.true;

    // And the title text should be "Image 2"
    const image2Text = await image2Title.getText();
    expect(image2Text, "Image 2 title should be 'Image 2'").to.equal("Image 2");
    expect(
      image2Text.length,
      "Image 2 title should not be empty",
    ).to.be.greaterThan(0);

    console.log("✓ Verified Image 2 title in UI");

    await saveAndCloseEditor();
  });
});
