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
 * //////
 *
 */

/**
 * These tests cover the peripheral assignment of Signals in a CFS configuration file
 * ? more *test details are written below
 */

// Feature: Pin assignment and unassignment in configuration UI
// Ticket: CFSIO-6370; CFSIO-6371;

//   Background:
//     Given VS Code is open with the CodeFusion Studio extension loaded
//     And the workbench is ready
//     And the user has opened the configuration file "manual32690.cfsconfig" in the UI
//     And all notifications are dismissed

//   Scenario: Assign and unassign pins PT13 and SPI0
//     When the user navigates to the Pin Menu
//     And the user selects the "Available" filter
//     And the user assigns pin "PT13"
//     And the user assigns pin "SPI0"
//     And the user applies the "Conflict" filter
//     Then pins "PT13" and "SPI0" should be visible as assigned
//     And the user saves the configuration

//     Then the configuration file should persist pin assignment:
//       | Pin | Peripheral | Signal |
//       | 3   | SPI0       | MISO   |
//       | 3   | PT13       | PT13   |

//     When the user reopens the configuration file
//     And the user navigates to the Pin Menu
//     And the user applies the "Conflict" filter
//     And the user unassigns pin "PT13"
//     And the user applies the "Assigned" filter
//     And the user unassigns pin "SPI0"
//     And the user saves the configuration

//     Then the configuration file should persist with no assigned pins for "PT13" and "SPI0"

//     Given VS Code is open with the CodeFusion Studio extension loaded
//     And the workbench is ready
//     And the user has opened the configuration file "manual32690.cfsconfig" in the UI
//     And all notifications are dismissed
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
  getConfigPathForFile,
  parseJSONFile,
} from "../config-tools-utility/cfsconfig-utils";
import {
  pinTab,
  availableFilterControl,
  assignedFilterControl,
  conflictFilterControl,
} from "../page-objects/main-menu";
import {
  pinDropdown,
  pinToggle,
} from "../page-objects/pin-config-section/pin-config-screen";

describe("Pin Assignment and Unassignment Persistence Test", () => {
  let workbench: Workbench;
  let browser: VSBrowser;
  let view: WebView;
  let editor: EditorView;
  browser = VSBrowser.instance;

  before(async function () {
    this.timeout(10000);
    browser = VSBrowser.instance;
    editor = new EditorView();
    await editor.closeAllEditors();
    await UIUtils.sleep(3000);
  });

  after(async function () {
    this.timeout(60000);
    await view.switchBack();
    const wb = new Workbench();
    await wb.wait();
    await wb.executeCommand("revert and close editor");
  });

  it("Pin-assign-unassign", async () => {
    const configPath = getConfigPathForFile("manual32690.cfsconfig");
    await browser.openResources(configPath);
    workbench = new Workbench();

    console.log("Opened the cfsconfig file");
    await UIUtils.dismissAllNotifications(workbench, browser);
    await UIUtils.sleep(5000);
    console.log("Waiting for the element to be located in the DOM");
    view = new WebView();
    await view.switchToFrame();

    //     When the user navigates to the Pin Menu
    await UIUtils.clickElement(view, pinTab);

    //     And the user selects the "Available" filter
    await UIUtils.clickElement(view, availableFilterControl);

    //     And the user assigns pin "PT13"
    await UIUtils.clickElement(view, await pinDropdown("PT13"));
    await UIUtils.clickElement(view, await pinToggle("PT13", "PT13"));

    //     And the user assigns pin "SPI0"
    await UIUtils.clickElement(view, await pinDropdown("SPI0"));
    await UIUtils.clickElement(view, await pinToggle("SPI0", "MISO"));

    //     And the user applies the "Conflict" filter
    await UIUtils.clickElement(view, conflictFilterControl);

    //     AND the assigned conflicted pins are visible
    let isPT13dropDownDisplayed = await (
      await UIUtils.waitForElement(view, await pinDropdown("PT13"))
    ).isDisplayed();

    expect(isPT13dropDownDisplayed, "PT13 dropdown is not displayed").to.be
      .true;

    let isSPI0dropDownDisplayed = await (
      await UIUtils.waitForElement(view, await pinDropdown("SPI0"))
    ).isDisplayed();

    expect(isSPI0dropDownDisplayed, "SPI0 dropdown is not displayed").to.be
      .true;

    //     And the user saves the configuration
    console.log("Save the configuration file changes");
    await view.switchBack();
    await workbench.executeCommand("view: close all editors");
    const dialog = new ModalDialog();
    await dialog.pushButton("Save");
    console.log("Saved the configuration file");
    await UIUtils.sleep(7000);

    //     Then the configuration file should persist pin assignment:
    //       | Pin | Peripheral | Signal |
    //       | 3   | SPI0       | MISO   |
    //       | 3   | PT13       | PT13   |
    console.log("Config path:", configPath);
    const peripheralData = parseJSONFile(configPath);
    const spi0Pins = peripheralData.Pins.filter(
      (pin: any) => pin.Peripheral === "SPI0",
    );

    expect(spi0Pins, "spi0Pins is empty or missing").to.not.be.empty;
    expect(
      spi0Pins,
      "spi0Pins do not have the correct values or missing",
    ).to.deep.equal([
      {
        Pin: "3",
        Peripheral: "SPI0",
        Signal: "MISO",
      },
    ]);

    const PT13Pins = peripheralData.Pins.filter(
      (pin: any) => pin.Peripheral === "PT13",
    );

    expect(PT13Pins, "PT13Pins is empty or missing").to.not.be.empty;
    expect(
      PT13Pins,
      "PT13Pins do not have the correct values or missing",
    ).to.deep.equal([
      {
        Pin: "3",
        Peripheral: "PT13",
        Signal: "PT13",
      },
    ]);

    //     When the user reopens the configuration file
    await browser.openResources(configPath);
    workbench = new Workbench();

    console.log("Opened the cfsconfig file");
    await UIUtils.dismissAllNotifications(workbench, browser);
    await UIUtils.sleep(5000);
    console.log("Waiting for the element to be located in the DOM");
    view = new WebView();
    await view.switchToFrame();

    //     And the user navigates to the Pin Menu
    await UIUtils.clickElement(view, pinTab);

    //     And the user applies the "Conflict" filter
    await UIUtils.clickElement(view, conflictFilterControl);

    //     And the user unassigns pin "PT13"
    isPT13dropDownDisplayed = await (
      await UIUtils.waitForElement(view, await pinDropdown("PT13"))
    ).isDisplayed();

    expect(isPT13dropDownDisplayed, "PT13 Dropdown is not displayed").to.be
      .true;

    isSPI0dropDownDisplayed = await (
      await UIUtils.waitForElement(view, await pinDropdown("SPI0"))
    ).isDisplayed();

    expect(isSPI0dropDownDisplayed, "SPI0 Dropdown is not displayed").to.be
      .true;

    await UIUtils.clickElement(view, await pinDropdown("PT13"));
    await UIUtils.clickElement(view, await pinToggle("PT13", "PT13"));

    //     And the user applies the "Assigned" filter
    await UIUtils.clickElement(view, assignedFilterControl);

    //     And the user unassigns pin "SPI0"
    await UIUtils.clickElement(view, await pinDropdown("SPI0"));
    await UIUtils.clickElement(view, await pinToggle("SPI0", "MISO"));

    //     And the user saves the configuration
    console.log("Save the configuration file changes");
    await view.switchBack();
    await workbench.executeCommand("view: close all editors");
    const dialog1 = new ModalDialog();
    await dialog1.pushButton("Save");
    console.log("Saved the configuration file");
    await UIUtils.sleep(7000);

    //     Then the configuration file should persist with no assigned pins for "PT13" and "SPI0"
    const peripheralData1 = parseJSONFile(configPath);
    console.log("Parsed peripheral data:", peripheralData1);

    const spi0Pins1 = peripheralData1.Pins.filter(
      (pin: any) => pin.Peripheral === "SPI0",
    );

    expect(spi0Pins1, "spi0Pins were not empty").to.be.empty;

    const PT13Pins1 = peripheralData1.Pins.filter(
      (pin: any) => pin.Peripheral === "PT13",
    );

    expect(PT13Pins1, "PT13Pins were not empty").to.be.empty;
  }).timeout(150000);
});
