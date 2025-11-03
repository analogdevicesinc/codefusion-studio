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
 * These tests cover the persistence schema of the clock configuration
 */

import { expect } from "chai";
import {
  By,
  EditorView,
  ModalDialog,
  VSBrowser,
  WebView,
  Workbench,
} from "vscode-extension-tester";

import { getConfigPathForFile, parseJSONFile } from "../config-tools-utility/cfsconfig-utils";
import { UIUtils } from "../config-tools-utility/config-utils";
import { clockTab } from "../page-objects/main-menu";
import {
  accordion,
  backButton,
  muxType,
  option,
  toggle,
} from "../page-objects/clock-config-section/clock-config-screen";

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
 * Scenario: Allocate MUX(multiplexer)node to select ERFO Mux as the configuration
     *     Given I open the configuration file "manual32690.cfsconfig"
     *     And I wait for the webview to load
     *     Then I switch to the webview frame
     *     And I click on the "clock" navigation tab
     *     Then I click on Multiplexer(MUX) node to select input as ERFO Mux from the side panel
     *     Then choose "External clock on HFXIN" from the dropdown,verify the selected value
     *     And I click on Back button to reach to main Panel
     *
 * Scenario: Allocate Divider node to select PreScaler as configuration with value as 'Divider by 4'
     *     Then I configure Divider node with PRESCALER as "Divider by 4
     *     And the selected divider value is present
     *
 * Scenario: Allocate Pin Input to select PO.9 as configuration with value as '1000mhz'
     *     Then I click on Pin Input node to select input as PO.9
     *     And I enter value as "1000mhz" in the textBox for pin input frequency
     *     Then verifying the entered value is present in textbox

 * Scenario: Allocate Bluetooth as Peripheral for clock configuration
     *     Then I click on Bluetooth node from Peripheral to turn the toggle ON
     *     And the toggle gets ON

 * Scenario: Verify the persistence schema of the config file after changes being saved
     *     Then I close the file to save the changes
     *     When I read the configuration file content
     *     Then I should see a value as "0" for pin P0.23 which was not given invalid value in Pin Input
     *     Then Assert the names of the clockNodes along with values of the clockNodes
     *
 */

describe("System Planner clock configuration diagram for frequencies used by different peripherals", () => {
  // ===NODE VALUES ===
  const nodeValues = {
    ERFOMUXValue: "ERFO_CLK",
    dividerValue: "4",
    PinInput: "1000",
  };
  // ===Locator===
  const textBox = By.css(`[data-test='P0_9_FREQ-P0.9-control-input']`);
  const configFile = "manual32690.cfsconfig";

  const configPath = (file: string) => getConfigPathForFile(file);

  // ===Test Setup===
  let workbench: Workbench;
  let browser: VSBrowser;
  let view: WebView;
  let editor: EditorView;
  browser = VSBrowser.instance;

  before(async function () {
    this.timeout(8000);
    browser = VSBrowser.instance;
    editor = new EditorView();
    await editor.closeAllEditors();
    await UIUtils.sleep(3000);
  });

  it("Enabling the clock nodes under clock configuration", async () => {
    // ===Given I open the configuration file "manual32690.cfsconfig"===
    await browser.openResources(configPath(configFile));
    workbench = new Workbench();
    console.log("Opened the cfsconfig file");

    // ===And all notifications are dismissed===
    await UIUtils.dismissAllNotifications(workbench, browser);
    await UIUtils.sleep(5000);
    console.log("Waiting for the element to be located in the DOM");

    // ===And I wait for the webview to load===
    view = new WebView();

    // ===When I switch to the webview frame===
    await view.switchToFrame();
    expect(await (await UIUtils.waitForElement(view, clockTab)).isDisplayed())
      .to.be.true;
    console.log("Switched to the WebView frame");

    // ===And I click on the "clock" navigation tab===
    await UIUtils.clickElement(view, clockTab);

    // ===Then I configure the Multiplexer (MUX) node by selecting "ERFO Mux" input===
    await UIUtils.clickElement(view, accordion("MUX"));
    await UIUtils.clickElement(view, muxType("ERFO"));
    await UIUtils.clickElement(view, muxType("MUX-ERFO"));

    // === Then choose "External clock on HFXIN" from the dropdown, verify the selected value====
    const MUXnodeOValue = await (
      await UIUtils.clickElement(view, option("ERFO_CLK"))
    ).getAttribute("value");
    expect(MUXnodeOValue).to.include(nodeValues.ERFOMUXValue);

    // ===And I click on the back button===
    await UIUtils.clickElement(view, backButton);

    // ===Then I configure Divider node with PRESCALER as "Divider by 4"===
    await UIUtils.clickElement(view, accordion("DIVIDER"));
    await UIUtils.clickElement(view, "PRESCALER");
    await UIUtils.clickElement(view, "DIV-PRESCALER");
    const dividerValue = await (
      await UIUtils.clickElement(view, option("4"))
    ).getAttribute("value");

    // ===And the selected divider value is present===
    expect(dividerValue).to.include(nodeValues.dividerValue);
    await UIUtils.clickElement(view, backButton);

    // ===Then I click on the Pin Input node and select input as P0.9===
    await UIUtils.clickElement(view, accordion("PIN INPUT"));
    await UIUtils.clickElement(view, "P0.9");
    await UIUtils.clickElement(view, textBox);

    // ===And then I enter value as "1000mhz" in the textBox for pin input frequency===
    const pinInputValue = await (
      await UIUtils.sendKeysToElements(view, textBox, nodeValues.PinInput)
    ).getAttribute("value");

    // ===Then verifying the entered value is present in textbox===
    expect(pinInputValue).to.include(nodeValues.PinInput);
    await UIUtils.clickElement(view, backButton);

    // ===Then I click on Bluetooth node from Peripheral and turn the toggle ON===
    await UIUtils.clickElement(view, accordion("PERIPHERAL"));
    await UIUtils.clickElement(view, "Bluetooth");
    const checkedBluetoothValue = await UIUtils.clickElement(
      view,
      toggle("Bluetooth"),
    );

    // ===And the toggle gets ON===
    expect(await checkedBluetoothValue.getAttribute("data-checked")).to.equal(
      "true",
    );

    // ===Close the File and save the changes after making changes===
    await view.switchBack();
    await workbench.executeCommand("view: close all editors");
    const dialog = new ModalDialog();
    await dialog.pushButton("Save");
    console.log("Saved the configuration file");
    await UIUtils.sleep(200);

    // ===Then Verify the persistence schema of the config file after changes being saved===
    const config = await parseJSONFile(configPath(configFile));
    const clockNodeNamesAndValues = config.ClockNodes.map((node: any) => ({
      name: node.Name,
      value: node.Value,
    }));

    // ===Then I should see a value as "0" for pin P0.23 which was given invalid value in Pin Input===
    expect(
      config.ClockFrequencies["P0.23"],
      "the error for pin is expected to have invalid value as '0",
    ).to.equal(0);

    // ===Then Assert the names of the clockNodes along with values of the clockNodes===
    console.log("Include the values and datas");
    expect(
      clockNodeNamesAndValues,
      "MUX name and values are expected to match",
    ).to.deep.include({ name: "ERFO Mux", value: MUXnodeOValue });
    expect(
      clockNodeNamesAndValues,
      "Divider name and values are expected to match",
    ).to.deep.include({ name: "PRESCALER", value: dividerValue });
    expect(
      clockNodeNamesAndValues,
      "Pin Input name and values are expected to match",
    ).to.deep.include({ name: "P0.9", value: pinInputValue });
    expect(
      clockNodeNamesAndValues,
      "Peripheral name and values are expected to match",
    ).to.deep.include({ name: "Bluetooth", value: "TRUE" });
  });
});
