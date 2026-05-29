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

// Feature: Peripheral Allocation for Single Core Projects
//   As a developer working with single-core microcontrollers
//   I want to allocate peripheral signals and configure pins
//   So that I can properly configure hardware peripherals for my project

// Background:
//   Given VS Code is open with the CodeFusion Studio extension loaded
//   And all editors are closed
//   And the configuration file "max32650-tqfp.cfsconfig" is available

// Scenario: Verify core selection button is not present for single-core projects
//   Given I open the configuration file "max32650-tqfp.cfsconfig"
//   When I navigate to the Peripheral Allocation tab
//   And I expand the GPIO0 peripheral accordion
//   And I click the assign chevron for signal P0.1
//   Then the core selection button should not be present

// Scenario: Verify sidebar opens with correct title and sections
//   Given the assign chevron has been clicked
//   When the sidebar opens
//   Then the sidebar title should display "GPIO0 P0.1"
//   And the sidebar sections should be correct

// Scenario: Enable pin assignment without errors
//   Given the sidebar is open for GPIO0 P0.1
//   When I enable the pin assignment toggle
//   Then the pin should be enabled without errors
//   And the assigned pin should appear in the core card
//   And the error message should be cleared

// Scenario: Verify selected signal is highlighted in core project card
//   Given the pin has been assigned
//   When I expand the GPIO0 peripheral in the core card
//   Then the GPIO0 signal should be highlighted
//   And the P0.1 pin should be highlighted

// Scenario: Configure signal using left panel configure button
//   Given the sidebar is closed
//   When I hover over the GPIO0 signal accordion
//   And I click the configure button on the left panel
//   Then the sidebar should open for GPIO0
//   And the plugin section should be displayed

// Scenario: Configure signal using core card configure button
//   Given the sidebar is closed
//   When I click the configure button on the core card signal
//   Then the sidebar should open for GPIO0
//   And the plugin section should be displayed

// Scenario: Delete assigned pin and verify state restoration
//   Given the pin has been assigned to P0.1
//   When I click the delete icon for the pin
//   Then the pin should be removed
//   And the delete button should no longer be present
//   And the initial state should be restored

import {
  By,
  EditorView,
  VSBrowser,
  WebDriver,
  WebView,
  Workbench,
} from "vscode-extension-tester";
import { expect } from "chai";
import { UIUtils } from "../../ui-test-utils/ui-utils";
import { getConfigPathForFile } from "../config-tools-utility/cfsconfig-utils";
import { peripheralTab } from "../page-objects/main-menu";
import {
  cardPinAssignmentInfo,
  clickOnSidebarCloseButton,
  coreCardSignalConfigBtn,
  coreExpandBtn,
  highlightedCoreCardPin,
  highlightedCoreCardSignal,
  peripheralError,
  pinAssignmentInfo,
  pinAssignmentToggle,
  pinDeleteIcon,
  sidebarChecks,
  signalAccordion,
  signalAssignChevron,
  signalAssignContainer,
  signalAssignmentError,
  signalConfigBtn,
  verifyPluginSection,
} from "../page-objects/peripheral-allocation-section/peripheral-allocation-screen";

describe("Peripheral Allocation Single Core", () => {
  let browser: VSBrowser;
  let view: WebView;
  let driver: WebDriver;
  let editor: EditorView;
  const configPath = getConfigPathForFile("max32650-tqfp.cfsconfig");
  const coreSelector = By.xpath(
    "//div[@data-test='core-CM4']//ancestor::vscode-button",
  );
  const signal = "GPIO0";
  const subSignal = "P0.1";

  before(async function () {
    this.timeout(60000);
    browser = VSBrowser.instance;
    driver = browser.driver;
    editor = new EditorView();
    await editor.closeAllEditors();
    await browser.waitForWorkbench();
  });

  after(async function () {
    this.timeout(60000);
    await view.switchBack();
    const wb = new Workbench();
    await wb.wait();
    await wb.executeCommand("View: revert and close editor");
    // Restore fixture file after all tests complete
    await UIUtils.restoreFixtureFileFromGit(
      getConfigPathForFile("max32650-tqfp.cfsconfig"),
    );
  });

  /**
   * Scenario: Verify core selection button is not present for single-core projects
   *   Given I open the configuration file "max32650-tqfp.cfsconfig"
   *   When I navigate to the Peripheral Allocation tab
   *   And I expand the GPIO0 peripheral accordion
   *   And I click the assign chevron for signal P0.1
   *   Then the core selection button should not be present
   */
  it("Verify that the core selection button is not present", async () => {
    await browser.openResources(configPath);
    await UIUtils.sleep(5000);

    view = new WebView();
    //await view.wait(60000);
    await view.switchToFrame();

    expect(
      await UIUtils.findWebElement(view, peripheralTab),
      "Peripheral tab not found.",
    ).to.exist;

    const navItem = await UIUtils.findWebElement(view, peripheralTab);
    await UIUtils.sleep(3000);
    await navItem.click().then(async () => {
      await UIUtils.sleep(3000);
      const peripheral = await UIUtils.findWebElement(
        view,
        await signalAccordion(signal),
      );
      await peripheral.click().then(async () => {
        // Assert peripheral expanded
        expect(
          await UIUtils.findWebElement(
            view,
            await signalAssignContainer(subSignal),
          ),
        ).to.exist;
        await UIUtils.sleep(2000);
        await UIUtils.clickElement(view, await signalAssignChevron(subSignal));

        const coreSelectors = await view.findWebElements(coreSelector);
        expect(
          coreSelectors.length,
          "Project selection button should not be present",
        ).to.equal(0);
      });
    });
  });

  /**
   * Scenario: Verify sidebar opens with correct title and sections
   *   Given the assign chevron has been clicked
   *   When the sidebar opens
   *   Then the sidebar title should display "GPIO0 P0.1"
   *   And the sidebar sections should be correct
   */
  it("Verify that the sidebar is open, title and following sections are correct", async () => {
    await UIUtils.sleep(3000);
    await sidebarChecks(view, signal, subSignal);
  });

  /**
   * Scenario: Verify expand and collapse buttons are not present for single-core projects
   *   Given the sidebar is open for GPIO0 P0.1
   *   When I check for expand and collapse buttons
   *   Then the expand button should not be present
   *   And the collapse button should not be present
   */
  //Skipping this test for now - Will be uncommented once CFSIO-14853 is fixed
  // it("Verify that the expand and collapse buttons are not present", async () => {
  //   const expandButton = By.xpath(
  //     "//span[contains(text(),'Expand')]//parent::div/vscode-button",
  //   );
  //   const collapseButton = By.xpath(
  //     "//span[contains(text(),'Collapse')]//parent::div/vscode-button",
  //   );
  //   const expandButtons = await view.findWebElements(expandButton);
  //   const collapseButtons = await view.findWebElements(collapseButton);

  //   //Verify Expand and Collapse icons should not be present
  //   expect(
  //     expandButtons.length,
  //     "Expand button should not be present",
  //   ).to.equal(0);
  //   expect(
  //     collapseButtons.length,
  //     "Collapse button should not be present",
  //   ).to.equal(0);
  // });

  /**
   * Scenario: Enable pin assignment without errors
   *   Given the sidebar is open for GPIO0 P0.1
   *   When I enable the pin assignment toggle
   *   Then the pin should be enabled without errors
   *   And the assigned pin should appear in the core card
   *   And the error message should be cleared
   */
  it("On enabling the pin, no error is displayed", async () => {
    await UIUtils.sleep(2000);
    const pinAssignmentError = await UIUtils.findWebElement(
      view,
      await signalAssignmentError(),
    );
    const toggleElement = await UIUtils.findWebElement(
      view,
      await pinAssignmentToggle(signal, subSignal),
    );
    if ((await pinAssignmentError.getText()).length != 0) {
      await toggleElement.click().then(async () => {
        await UIUtils.sleep(2000);
        expect(
          toggleElement.getAttribute("data-checked"),
          "Pin should be enabled",
        ).to.equal("true");

        const pinOnsidebar = await UIUtils.findWebElement(
          view,
          await pinAssignmentInfo(subSignal),
        );

        const pinOnCoreCard = await UIUtils.findWebElement(
          view,
          await cardPinAssignmentInfo(signal, subSignal),
        );

        //Verify that enabled pin shows on the core card
        expect(await pinOnCoreCard.getText()).to.equal(
          await pinOnsidebar.getText(),
        );

        const errorElements = await view.findWebElements(
          await peripheralError(),
        );

        //Verify that the error on top of the side bar is cleared
        expect(
          errorElements.length,
          "Error message should be cleared",
        ).to.equal(0);
      });
    }
  });

  /**
   * Scenario: Verify selected signal is highlighted in core project card
   *   Given the pin has been assigned
   *   When I expand the GPIO0 peripheral in the core card
   *   Then the GPIO0 signal should be highlighted
   *   And the P0.1 pin should be highlighted
   */
  it("Verify that the selected accordion is highlighted in core project card", async () => {
    const expandClick = await UIUtils.findWebElement(
      view,
      await coreExpandBtn(signal),
    );
    await expandClick.click();
    await UIUtils.sleep(2000);
    const coresignalOnCoreCard = await UIUtils.findWebElement(
      view,
      await highlightedCoreCardSignal(signal),
    );
    const pinOnCoreCard = await UIUtils.findWebElement(
      view,
      await highlightedCoreCardPin(subSignal),
    );
    expect(await coresignalOnCoreCard.getAttribute("class")).to.include(
      "highlight",
    );
    expect(await pinOnCoreCard.getAttribute("class")).to.include("highlight");
  });

  /**
   * Scenario: Configure signal using left panel configure button
   *   Given the sidebar is closed
   *   When I hover over the GPIO0 signal accordion
   *   And I click the configure button on the left panel
   *   Then the sidebar should open for GPIO0
   *   And the plugin section should be displayed
   */
  it("Verify the flow using configure button on the left panel signal", async () => {
    await UIUtils.sleep(2000);
    await clickOnSidebarCloseButton(view);
    await UIUtils.sleep(2000);

    const signalElement = await UIUtils.findWebElement(
      view,
      await signalAccordion(signal),
    );
    await driver.actions().move({ origin: signalElement }).perform();
    await UIUtils.sleep(1000);
    await UIUtils.findWebElement(view, await signalConfigBtn(signal)).then(
      async (btn) => {
        await btn.click();
        await UIUtils.sleep(2000);
        await sidebarChecks(view, signal, "");
        await verifyPluginSection(view);
      },
    );
  });

  /**
   * Scenario: Configure signal using core card configure button
   *   Given the sidebar is closed
   *   When I click the configure button on the core card signal
   *   Then the sidebar should open for GPIO0
   *   And the plugin section should be displayed
   */
  it("Verify the flow using configure button on the core card signal", async () => {
    await UIUtils.sleep(2000);
    await clickOnSidebarCloseButton(view);
    await UIUtils.sleep(2000);
    const configBtn = await UIUtils.findWebElement(
      view,
      await coreCardSignalConfigBtn(signal),
    );
    await configBtn.click().then(async () => {
      await UIUtils.sleep(2000);
      await sidebarChecks(view, signal, "");
      await verifyPluginSection(view);
    });
  });

  /**
   * Scenario: Delete assigned pin and verify state restoration
   *   Given the pin has been assigned to P0.1
   *   When I click the delete icon for the pin
   *   Then the pin should be removed
   *   And the delete button should no longer be present
   *   And the initial state should be restored
   */
  it("Delete the assigned pin and verify the initial state restored", async () => {
    await UIUtils.sleep(2000);
    await clickOnSidebarCloseButton(view);
    await UIUtils.sleep(2000);
    const pinDelete = await UIUtils.findWebElement(
      view,
      await pinDeleteIcon(subSignal),
    );
    await UIUtils.sleep(2000);
    await pinDelete.click().then(async () => {
      await UIUtils.sleep(2000);
      const deleteButtons = await view.findWebElements(
        await pinDeleteIcon(subSignal),
      );
      expect(
        deleteButtons.length,
        "Delete button should not be present",
      ).to.equal(0);
    });
  });
});
