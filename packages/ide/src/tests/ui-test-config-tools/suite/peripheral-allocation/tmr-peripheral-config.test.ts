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

// Feature: Timer peripheral allocation and configuration on single-core SoC
//   As a developer configuring a timer peripheral
//   I want to allocate TMR0 and verify its configuration options
//   So that I can confirm the timer mode dropdown contains the expected values

// Background:
//   Given VS Code is open with the CodeFusion Studio extension loaded
//   And all editors are closed
//   And the configuration file "max32672-tqfn40.cfsconfig" is available

// Scenario: Allocate TMR0 and verify One-Shot Mode is available in Mode dropdown
//   Given I open the configuration file "max32672-tqfn40.cfsconfig"
//   When I navigate to the Peripheral Allocation tab
//   And I expand the TMR0 peripheral accordion
//   And I click the assign chevron for TMR0
//   Then TMR0 should be assigned to the Arm core (auto-assigned on single-core)
//   And the configuration sidebar should open automatically
//   And the "Mode for Single Timer or Timer A" dropdown should contain "One-Shot Mode"

import { By, VSBrowser, WebDriver, WebView } from "vscode-extension-tester";
import { expect } from "chai";
import { UIUtils } from "../../../ui-test-utils/ui-utils";
import { getConfigPathForFile } from "../../config-tools-utility/cfsconfig-utils";
import { peripheralTab } from "../../page-objects/main-menu";
import {
  signalAssignChevron,
  signalPeripheralBlock,
  peripheralListContainer,
} from "../../page-objects/peripheral-allocation-section/peripheral-allocation-screen";

describe("Timer Peripheral Configuration", () => {
  let browser: VSBrowser;
  let view: WebView;
  let driver: WebDriver;
  const configPath = getConfigPathForFile("max32672-tqfn40.cfsconfig");
  const peripheral = "TMR0";

  before(async function () {
    this.timeout(60000);
    ({ browser } = await UIUtils.setupTestSuite({ waitForWorkbench: true }));
    driver = browser.driver;
  });

  after(async function () {
    this.timeout(60000);
    await UIUtils.teardownTestSuite(view, configPath);
  });

  /**
   * Scenario: Allocate TMR0 and verify One-Shot Mode is available in Mode dropdown
   */
  it("Should allocate TMR0 to the Arm core and verify One-Shot Mode option exists @regression", async function () {
    this.timeout(90000);

    // Given I open the configuration file
    await browser.openResources(configPath);
    await UIUtils.sleep(5000);

    view = new WebView();
    await view.switchToFrame();

    // When I navigate to the Peripheral Allocation tab
    const navItem = await UIUtils.findWebElement(view, peripheralTab);
    expect(navItem, "Peripheral tab not found").to.exist;
    await navItem.click();
    await UIUtils.sleep(3000);

    // And I scroll the peripheral list to find TMR0
    const listContainer = await UIUtils.findWebElement(
      view,
      peripheralListContainer,
    );

    const peripheralBlockSelector = await signalPeripheralBlock(peripheral);
    const maxScrollAttempts = 15;
    let found = false;
    for (let i = 0; i < maxScrollAttempts; i++) {
      const elements = await view.findWebElements(peripheralBlockSelector);
      if (elements.length > 0) {
        found = true;
        break;
      }
      await driver.executeScript(
        "arguments[0].scrollTop += 200",
        listContainer,
      );
      await UIUtils.sleep(500);
    }

    expect(found, "TMR0 not found after scrolling peripheral list").to.be.true;

    const tmr0Block = await UIUtils.findWebElement(
      view,
      peripheralBlockSelector,
    );
    await driver.executeScript(
      "arguments[0].scrollIntoView({block: 'center'})",
      tmr0Block,
    );
    await UIUtils.sleep(1000);

    // And I click the assign chevron for TMR0 (auto-assigns on single-core)
    const chevron = await UIUtils.findWebElement(
      view,
      await signalAssignChevron(peripheral),
    );
    await chevron.click();
    await UIUtils.sleep(3000);

    // Then the peripheral should be assigned (sidebar opens automatically after allocation)
    const actionButtons = await UIUtils.findWebElement(
      view,
      By.css(`[data-test='assignable-item:checkmark:${peripheral}']`),
    );
    expect(
      actionButtons,
      "Action buttons for TMR0 should be present after allocation",
    ).to.exist;

    // The allocation handler opens the config sidebar automatically — wait for the MODE_A dropdown
    const modeDropdownSelector = By.css(
      "[data-test='peripheral-config:form:control-MODE_A']",
    );
    await driver.wait(
      async () => {
        const elements = await view.findWebElements(modeDropdownSelector);
        return elements.length > 0;
      },
      15000,
      "MODE_A dropdown did not appear within 15s",
    );
    const modeDropdown = await view.findWebElement(modeDropdownSelector);
    expect(
      modeDropdown,
      "'Mode for Single Timer or Timer A' dropdown should be present",
    ).to.exist;

    // Verify the dropdown contains "One-Shot Mode" option by clicking it open
    await modeDropdown.click();
    await UIUtils.sleep(1000);

    const oneShotOption = await UIUtils.findWebElement(
      view,
      By.css("[data-test='peripheral-config:form:control-MODE_A:ONE_SHOT']"),
    );
    expect(
      oneShotOption,
      "'One-Shot Mode' option should exist in the Mode for Single Timer or Timer A dropdown",
    ).to.exist;

    const oneShotText = await oneShotOption.getText();
    expect(oneShotText.trim()).to.equal("One-Shot Mode");
  });
});
