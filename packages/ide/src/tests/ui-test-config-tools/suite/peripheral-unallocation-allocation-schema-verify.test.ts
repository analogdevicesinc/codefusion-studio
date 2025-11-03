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
 * These tests cover the peripheral assignment of Signals in a CFS configuration file.
 */

import { expect } from "chai";
import {
  EditorView,
  ModalDialog,
  VSBrowser,
  WebDriver,
  WebView,
  Workbench,
} from "vscode-extension-tester";

import { UIUtils } from "../config-tools-utility/config-utils";
import { getConfigPathForFile, parseJSONFile } from "../config-tools-utility/cfsconfig-utils";
import {
  allocateArm,
  allocateRiscv,
  signalAccordion,
  signalAssignChevron,
  signalAssignContainer,
  signalDeleteButton,
} from "../page-objects/peripheral-allocation-section/peripheral-allocation-screen";
import { peripheralTab } from "../page-objects/main-menu";

/**
 * Test for Peripheral assignment of Signals and unallocating them as well in a CFS configuration file
 */

describe("System Planner Peripheral Verification allocation/unallocation", () => {
  const configPath = getConfigPathForFile("manual32690.cfsconfig");
  let workbench: Workbench;
  let browser: VSBrowser;
  let driver: WebDriver;
  let view: WebView;
  let editor: EditorView;
  browser = VSBrowser.instance;

  before(async function () {
    this.timeout(10000);
    browser = VSBrowser.instance;
    driver = browser.driver;
    editor = new EditorView();
    await editor.closeAllEditors();
    await UIUtils.sleep(3000);
  });

  it("Should check the peripheral assignment of Signals to multiple Cores", async () => {
    await browser.openResources(configPath);
    workbench = new Workbench();

    // This for Peripheral Allocation for GPIO signals to pins

    console.log("Opened the cfsconfig file");
    await UIUtils.dismissAllNotifications(workbench, browser);
    await UIUtils.sleep(5000);
    console.log("Waiting for the element to be located in the DOM");
    view = new WebView();
    await view.switchToFrame();
    await UIUtils.clickElement(view, peripheralTab);

    // Clicking on GPIO0 Peripheral Signal and doing Assertion
    const gpio0Signal = await UIUtils.findWebElement(view, await signalAccordion("GPIO0"));
    const gpio0SignalText = await gpio0Signal.getText();
    expect(gpio0SignalText).to.include("GPIO0");
    await gpio0Signal.click(); // (This has been for clicking on GPIO0 Peripheral Signal)

    // Clicked on GPIO0 peripheral container to assign to RISCV Core
    await UIUtils.clickElement(
      view,
      await signalAssignChevron("P0.7"),
    );

    // This locator is for locating the RISCV core to GPIO0 peripheral Signal
    await UIUtils.clickElement(view, allocateRiscv);
    // Assignining GPIO0 which further have pins and assigning one of them P0.8 to Arm core
    await UIUtils.clickElement(
      view,
      await signalAssignChevron("P0.8"),
    );

    // This allocateArm locator is used to assign the GPIO0 P0.8 signal to Arm Cortex M4 core
    await UIUtils.clickElement(view, allocateArm);
    await view.switchBack();
    await workbench.executeCommand("view: close all editors");
    const dialog = new ModalDialog();
    await dialog.pushButton("Save");

    console.log("Saved the configuration file");
    await UIUtils.sleep(200);

    //  Verify the persistence schema of the saved changes in the configuration file
    console.log("Config path:", configPath);
    const peripheralData = parseJSONFile(configPath);

    // Assert that Pins number with signals exist in schema after changes done on cfsconfig file
    // CM4 project Verification
    const RVProject = peripheralData.Projects.find(
      (proj: any) => proj.CoreId === "RV",
    );
    // Assert that the project exists fro RV core with peripheral Name
    const peripheralNameRV = RVProject.Peripherals.map((p: any) => p.Name);
    expect(peripheralNameRV).to.include(gpio0SignalText);

    // CM4 Project should exist
    const CM4Project = peripheralData.Projects.find(
      (proj: any) => proj.CoreId === "CM4",
    );

    const peripheralNameCM4 = CM4Project.Peripherals.map((p: any) => p.Name);
    expect(peripheralNameCM4).to.include(gpio0SignalText);

    // Assert GPIO0 P0.7 signals
    const gpio0Name = RVProject.Peripherals.find(
      (p: any) => p.Name === "GPIO0",
    );
    const gpio0NameCM4 = CM4Project.Peripherals.find(
      (p: any) => p.Name === "GPIO0",
    );
    expect(gpio0Name, "GPIO0 peripheral should exist").to.exist;

    // Attributes from config schema like phandle for GPIO0 P0.7 and dt_name for GPIO0 P0.7
    expect(gpio0Name.Signals[0].Config).to.include({
      PHANDLE: gpio0Name.Signals[0].Config.PHANDLE,
      DT_NAME: gpio0Name.Signals[0].Config.DT_NAME,
    });
    expect(gpio0NameCM4.Signals[0].Config).to.include({
      PHANDLE: gpio0NameCM4.Signals[0].Config.PHANDLE,
      DT_NAME: gpio0NameCM4.Signals[0].Config.DT_NAME,
    });
  }).timeout(90000);

  it("Should Delete the Signals and Pin Configuration and verify persistance schema", async () => {
    await browser.openResources(configPath);
    workbench = new Workbench();

    // This for Peripheral Allocation for GPIO signals to pins

    console.log("Opened the cfsconfig file");
    await UIUtils.dismissAllNotifications(workbench, browser);
    await UIUtils.sleep(10000);
    view = new WebView();
    await view.switchToFrame();
    await UIUtils.clickElement(view, peripheralTab);

    const gpio0Signal = await UIUtils.findWebElement(view, await signalAccordion("GPIO0"));
    gpio0Signal.click();

    // Hover over the signal container to reveal delete button
    const signalContainer = await UIUtils.findWebElement(view,
      await signalAssignContainer("P0.8"),
    );
    await driver.actions().move({ origin: signalContainer }).perform();
    await UIUtils.clickElement(view, await signalDeleteButton("P0.8"));

    await view.switchBack();
    await workbench.executeCommand("view: close all editors");
    const dialog = new ModalDialog();
    await dialog.pushButton("Save");
    console.log("Saved the configuration file");
    await UIUtils.sleep(200);

    // Verifying the persistence schema of the saved changes
    console.log("Config path:", configPath);
    const peripheralData = parseJSONFile(configPath);
    const CM4Project = peripheralData.Projects.find(
      (proj: any) => proj.CoreId === "CM4",
    );
    // Assert that the project exists for CM4 core with no peripheral Assigned
    const peripheralRemovalGPIO = CM4Project.Peripherals.map(
      (p: any) => p.Name,
    );

    expect(peripheralRemovalGPIO).to.not.include("GPIO0");
  }).timeout(90000);
});
