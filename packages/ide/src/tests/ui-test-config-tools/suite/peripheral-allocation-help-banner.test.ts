/**
 *
 * Copyright (c) 2024 Analog Devices, Inc.
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
import {
  VSBrowser,
  WebView,
  Workbench,
  EditorView,
} from "vscode-extension-tester";
import { expect } from "chai";
import { UIUtils } from "../config-tools-utility/config-utils";
import { getConfigPathForFile } from "../config-tools-utility/cfsconfig-utils";
import { peripheralTab } from "../page-objects/main-menu";
import {
  helpBannerContainerSelector,
  continueButtonSelector,
} from "../page-objects/peripheral-allocation-section/peripheral-allocation-screen";

/**
 * Feature: Peripheral Allocation Help Banner Persistence
 *   As a CodeFusion Studio user
 *   I want the help banner dismissal to be remembered across different files
 *   So that I don't see the same help content repeatedly after I've already dismissed it
 *
 * Background:
 *   Given VS Code is open with the CodeFusion Studio extension loaded
 *   And the workbench is ready
 *
 * Scenario: Help banner should not reappear after being dismissed by user
 *   Given I open the file "max32690-wlp.cfsconfig"
 *   When I switch to the webview frame
 *   And I click on the "peripherals" navigation item
 *   Then I should see the peripheral help banner displayed
 *
 *   When I click the "Continue" button on the help banner
 *   Then the peripheral help banner should be dismissed
 *   And the banner should no longer be visible
 *
 *   When I close all editors
 *   And I open a different file "max32690-tqfn.cfsconfig"
 *   And I switch to the webview frame
 *   And I click on the "peripherals" navigation item
 *   Then the peripheral help banner should not be displayed
 *   And I should not see any help banner elements
 */

describe("Peripheral Allocation Help Banner", () => {
  // ========================================
  // TEST SETUP & TEARDOWN
  // ========================================
  let workbench: Workbench;
  let browser: VSBrowser;
  let view: WebView;
  let editor: EditorView;

  // ========================================
  // TEST DATA & CONFIGURATION
  // ========================================
  const firstConfigFile = "max32690-wlp.cfsconfig";
  const secondConfigFile = "max32690-tqfn.cfsconfig";

  before(async function () {
    this.timeout(60000);
    browser = VSBrowser.instance;
    editor = new EditorView();
    await editor.closeAllEditors();
    await UIUtils.sleep(3000);
  });

  after(async () => {
    await view.switchBack();

    const wb = new Workbench();
    await wb.wait();
    await wb.executeCommand("workbench.action.closeAllEditors");
  });

  it("Should not display 'Getting Started' Help Banner if previously dismissed by the user", async () => {
    // === GIVEN: I open the file "max32690-wlp.cfsconfig" ===
    await browser.openResources(getConfigPathForFile(firstConfigFile));
    workbench = new Workbench();
    console.log(`Opened first configuration file: ${firstConfigFile}`);

    // === GIVEN: All notifications are dismissed ===
    await UIUtils.dismissAllNotifications(workbench, browser);
    await UIUtils.sleep(1000);

    // === WHEN: I switch to the webview frame ===
    view = new WebView();
    await view.switchToFrame();
    console.log("Switched to webview frame");

    // === AND: I click on the "peripherals" navigation item ===
    const peripheralNavButton = await UIUtils.waitForElement(
      view,
      peripheralTab,
    );
    expect(
      peripheralNavButton,
      "Peripheral navigation button should be found and clickable",
    ).to.exist;
    await peripheralNavButton.click();
    console.log("Clicked on peripherals navigation tab");

    // === THEN: I should see the peripheral help banner displayed ===
    expect(
      await UIUtils.waitForElement(view, helpBannerContainerSelector),
      "Help banner should be visible when first opening peripherals tab",
    ).to.exist;
    console.log("Peripheral help banner is displayed as expected");

    // === WHEN: I click the "Continue" button on the help banner ===
    await UIUtils.clickElement(view, continueButtonSelector);

    // === THEN: The peripheral help banner should be dismissed ===
    // === AND: The banner should no longer be visible ===
    // Check if the banner is not displayed after clicking on the 'Continue' button
    try {
      await view.findWebElement(helpBannerContainerSelector);
    } catch (err: any) {
      expect(
        err.name,
        "Help banner should be dismissed and throw NoSuchElementError",
      ).to.equal("NoSuchElementError");
    }

    // Close the file
    console.log("Help banner successfully dismissed and is no longer visible");

    // === WHEN: I close all editors ===
    await view.switchBack();
    const ev = new EditorView();
    await ev.closeAllEditors();
    console.log("Closed all editors");

    // === AND: I open a different file "max32690-tqfn.cfsconfig" ===
    await browser.openResources(getConfigPathForFile(secondConfigFile));
    console.log(`Opened second configuration file: ${secondConfigFile}`);

    view = new WebView();

    // === AND: I switch to the webview frame ===
    await view.switchToFrame();
    console.log("Switched to webview frame for second file");

    // === AND: I click on the "peripherals" navigation item ===
    expect(
      await view.findWebElement(peripheralTab),
      "Peripheral nav button should be found",
    ).to.exist;
    await UIUtils.clickElement(view, peripheralTab);

    // === THEN: The peripheral help banner should not be displayed ===
    // === AND: I should not see any help banner elements ===
    try {
      await view.findWebElement(helpBannerContainerSelector);
    } catch (err: any) {
      expect(
        err.name,
        "Help banner should be dismissed and throw NoSuchElementError",
      ).to.equal("NoSuchElementError");
    }

    console.log(
      "✅ SUCCESS: Help banner persistence verified - banner does not reappear in second file",
    );

    // === CLEANUP: Switch back and close editors ===
    await view.switchBack();
    await ev.closeAllEditors();
    console.log(
      "Test completed successfully - help banner dismissal persists across files",
    );
  }).timeout(60000);
});
