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

/**
 * These tests cover the persistence schema of the already configured clock configuration
 */

import { expect } from "chai";
import {
  EditorView,
  ModalDialog,
  VSBrowser,
  WebView,
  Workbench,
} from "vscode-extension-tester";

import { UIUtils } from "../config-tools-utility/config-utils";
import {
  accordion,
  backButton,
  muxType,
  option,
  pinInputBox,
  toggle,
} from "../page-objects/clock-config-section/clock-config-screen";
import { clockTab } from "../page-objects/main-menu";
import { getConfigPathForFile, parseJSONFile } from "../config-tools-utility/cfsconfig-utils";

/*
  * Feature: System Planner clock configuration diagram for frequencies used by different peripherals
     *     As a CodeFusion Studio user
     *     I want to allocate clock nodes to different clock sources
     *     So that I can ensure proper clock frequency distribution
     *
  * Background:
     *     Given VS Code is open with the CodeFusion Studio extension loaded
     *     And all editors are closed
     *     And all notifications are dismissed
     *
  * Scenario: User has loaded clock configurations from previously loaded cfsconfig file
     *     Given the existing cfsconfig file with USBHS peripheral with PIN CLKNEXT configured which further configures Pin Input frequency for external clock is opened
     *     Then dismiss all notifications ,wait for the webview to load
     *     Then switch to frame
     *     And I click on the "clock" navigation tab
     *     Then click on the MUX accordion and select the LPM node
     *     And verify that the value in the dropdown is "SYS_CLK_DIV_2"
     *     And I verify the value in DMA toggle selected
     *     Then verify the value of clock frequency PinInput entered as 1000 for P0.27, navigating back

  * Scenario: User modifies existing clock configurations in the loaded file, saves them, and verifies correctness
     *     And I click on MUX accordion to select node values for LPM MUX from "SYS_CLK_DIV_2" to "SYS_CLK_DIV_2_ISO",verify the new value
     *     Then I click on back button
     *     Then I click on DMA node from peripheral, switching the toggle ON , verifying new value
     *     And click on back button
     *     Then change the Pin Input Value of P0.27 Pin as "2222", verify it
     *     And close the file, save the changes
     *     Then Verify the persistence schema of the config file after changes being saved
     *     Then Assert the names of the clockNodes with their values of the clockNodes
     *
 *
 */

describe("System Planner clock configuration for already loaded pins", () => {
  // === Given the existing cfsconfig file with USBHS peripheral with PIN CLKNEXT configured which further configures Pin Input frequency for external clock is opened===
  const configFile = "max32690-wlp.cfsconfig";
  const configPath = getConfigPathForFile(configFile);

  // ===Test Setup===
  let workbench: Workbench;
  let browser: VSBrowser;
  let view: WebView;
  let editor: EditorView;
  browser = VSBrowser.instance;

  before(async () => {
    browser = VSBrowser.instance;
    editor = new EditorView();
    await editor.closeAllEditors();
    await UIUtils.sleep(3000);
  });

  it("1.Should display the clock screen correctly for a pre-configured file", async () => {
    await browser.openResources(configPath);
    workbench = new Workbench();
    view = new WebView();
    await view.wait(4000);

    // === Then dismiss all notifications ,wait for the webview to load===
    await UIUtils.dismissAllNotifications(workbench, browser);

    // ===Then switch to frame===
    console.log("Switched to the WebView frame");
    await view.switchToFrame(5000);
    expect(
      await (await UIUtils.waitForElement(view, clockTab)).isDisplayed(),
      "Clock tab should be visible after loading the WebView",
    ).to.be.true;

    // ===And I click on the "clock" navigation tab===
    await UIUtils.clickElement(view, clockTab);

    // === Then click on the MUX accordion and select the LPM node===
    await UIUtils.clickElement(view, accordion("MUX"));
    await UIUtils.clickElement(view, muxType("LPM"));

    // === And I verify the value in the dropdown is "SYS_CLK_DIV_2"===
    const LPMNodeValue = await (
      await UIUtils.clickElement(view, muxType("MUX-LPM"))
    ).getAttribute("current-value");
    expect(LPMNodeValue, "The clock source value should be matched").to.equal(
      "SYS_CLK_DIV_2",
    );

    await UIUtils.clickElement(view, backButton);

    // ===And I verify the value in DMA toggle selected====
    await UIUtils.clickElement(view, accordion("PERIPHERAL"));
    await UIUtils.clickElement(view, "DMA");
    const DMAPeripheralValue = await UIUtils.findWebElement(
      view,
      toggle("DMA"),
    );
    expect(
      await DMAPeripheralValue.getAttribute("data-checked"),
      "The toggle for DMA should be ON",
    ).to.equal("true");
    await UIUtils.clickElement(view, backButton);

    // ===Then verify the value of clock frequency PinInput entered as 1000 for P0.27, further navigating back====
    await UIUtils.clickElement(view, accordion("PIN INPUT"));
    await UIUtils.clickElement(view, "P0.27");
    const pinValue = await (
      await UIUtils.findWebElement(view, pinInputBox)
    ).getAttribute("current-value");
    expect(pinValue, "The pin value for P0.27 should be matched").to.include(
      "1000",
    );
    await UIUtils.clickElement(view, backButton);
  });

  it("2.Should update and save clock configurations correctly", async () => {
    // ===Then I click on MUX accordion to select node values for LPM MUX from "SYS_CLK_DIV_2" to "SYS_CLK_DIV_2_ISO",verify the new value===
    await UIUtils.clickElement(view, accordion("MUX"));
    await UIUtils.clickElement(view, muxType("LPM"));
    await UIUtils.clickElement(view, muxType("MUX-LPM"));
    const MUXNodeValue = await (
      await UIUtils.clickElement(view, option("SYS_CLK_DIV_2_ISO"))
    ).getAttribute("value");
    expect(MUXNodeValue, "The MUX node value should be matched").to.include(
      "SYS_CLK_DIV_2_ISO",
    );

    // ===And I click on the back button===
    await UIUtils.clickElement(view, backButton);

    // ===Then I click on DMA node from peripheral, switching the toggle ON , verifying new value===
    await UIUtils.clickElement(view, accordion("PERIPHERAL"));
    await UIUtils.clickElement(view, "DMA");
    const checkedCanValue = await UIUtils.clickElement(view, toggle("DMA"));
    expect(
      await checkedCanValue.getAttribute("data-checked"),
      "The toggle for DMA should be OFF",
    ).to.equal("false");

    // ===And I click on the back button===
    await UIUtils.clickElement(view, backButton);

    // ===Then change the Pin Input Value of P0.27 Pin as "2222", verify it===
    await UIUtils.clickElement(view, accordion("PIN INPUT"));
    await UIUtils.clickElement(view, "P0.27");
    const pinValue = await (
      await UIUtils.sendKeysToElements(view, pinInputBox, "2222")
    ).getAttribute("value");
    expect(
      pinValue,
      "The pin value for P0.27 should be matched after change",
    ).to.include("2222");

    // ===And close the file, save the changes===
    await view.switchBack();
    await workbench.executeCommand("view: close all editors");
    const dialog = new ModalDialog();
    await dialog.pushButton("Save");
    console.log("Saved the configuration file");
    await UIUtils.sleep(200);

    // ===Then Verify the persistence schema of the config file after changes being saved===
    const config = await parseJSONFile(configPath);

    // ===Then Assert the names of the clockNodes with their values of the clockNodes===
    const clockNodeNamesAndValues = config.ClockNodes.map((node: any) => ({
      name: node.Name,
      value: node.Value,
    }));
    console.log("Include the values and data");
    expect(
      clockNodeNamesAndValues,
      "The MUX name and value are matched",
    ).to.deep.include({
      name: "LPM Mux",
      value: "SYS_CLK_DIV_2_ISO",
    });
    expect(
      clockNodeNamesAndValues,
      "The Pin Input values are matched with Pin name",
    ).to.deep.include({
      name: "P0.27",
      value: "2222",
    });
    expect(
      clockNodeNamesAndValues.filter((node: any) => node.name === "DMA"),
      "DMA peripheral is not present in config",
    ).to.be.empty;
  }).timeout(120000);
});
