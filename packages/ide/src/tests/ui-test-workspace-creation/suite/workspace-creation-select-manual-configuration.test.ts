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
 * These tests cover building workspace for MAX32690.
 */

import { expect } from "chai";
import { WebView, Workbench, By, VSBrowser } from "vscode-extension-tester";

import { Locatorspaths } from "../pageElements/pageobjects";
import { UIUtils } from "../../ui-test-utils/ui-utils";
import { TextData } from "../pageElements/text-data";
import * as os from "os";
import { existsSync } from "node:fs";
import * as fs from "fs";
import * as path from "path";

/**
 * Test building a MAX32690 zephyr project manually configured
 */

describe("Workspace MAX32690 creation manual configuration", () => {
  const locatorspath = new Locatorspaths();
  let workbench: Workbench;
  let browser: VSBrowser;
  let view: WebView;

  after(async () => {
    try {
      if (view) await view.switchBack();
      await UIUtils.sleep(2000);
      if (workbench)
        await workbench.executeCommand("View: Revert and Close Editor");
      await UIUtils.sleep(2000);
    } catch (error) {
      console.error("Error in after() hook:", error);
    }
  });

  it("Create new workspace manually(riscv/arm) configured MAX32690", async () => {
    console.log(
      "Starting workspace creation for MAX32690 using arm/riscv cores",
    );
    workbench = new Workbench();
    browser = VSBrowser.instance;
    await workbench.executeCommand("cfs create workspace");
    console.log("new workspace command executed");
    await UIUtils.dismissAllNotifications(workbench, browser);
    console.log("Dismissed all notifications");

    view = new WebView();
    console.log("WebView instance created");
    await view.switchToFrame();

    // SOC Screen Selection
    console.log("Creating new workspace for MAX32690");
    await UIUtils.clickElement(view, locatorspath.selectorSoc);

    await UIUtils.sendKeysToElements(
      view,
      locatorspath.selectorSoc,
      "MAX32690",
    );

    const socSelection = await UIUtils.clickElement(
      view,
      locatorspath.getRadiobuttonSoc("32690"),
    );
    const socName = await socSelection.getAttribute("id");
    console.log(`Selected SOC: ${socName}`);

    expect(socName).to.include(TextData.socNameSelect);

    await UIUtils.dismissAllNotifications(workbench, browser);

    await UIUtils.clickElement(view, locatorspath.continueButton);
    // Kit Selection Screen
    console.log("KIT SELECTION SCREEN");
    const kitSelect = await UIUtils.findWebElement(
      view,
      locatorspath.kitSelect("EvKit_V1___TQFN"),
    );
    const kitSelectText = await kitSelect.getText();
    expect(kitSelectText).to.include(TextData.evKitText);

    console.log("evkit text is included in the kitselect");
    const kitName = await (
      await UIUtils.findWebElement(
        view,
        locatorspath.kitSelect("EvKit_V1___TQFN"),
      )
    ).getText();
    console.log("kitname:", kitName);
    const kitClick = await UIUtils.findWebElement(
      view,
      locatorspath.kitSelect("EvKit_V1___TQFN"),
    );

    await UIUtils.clickElement(view, kitClick);

    await UIUtils.clickElement(view, locatorspath.continueButton);

    // Manual Template Configuration Screen
    console.log("TEMPLATE SELECTION SCREEN - MANUAL CONFIGURATION");
    console.log("Waiting for manual configure option");
    const manualConfigure = By.xpath(
      "//*[@data-test='workspaceOptions:card:manualConfig']",
    );
    const manualConfigureElement = await UIUtils.findWebElement(
      view,
      manualConfigure,
    );
    await UIUtils.waitForElementToBeVisible(view, manualConfigure);
    console.log("Found manual configure option");
    const templateName = await manualConfigureElement.getAttribute("id");
    console.log("Template name:", templateName);
    expect(templateName).to.include("custom");
    await UIUtils.clickElement(view, manualConfigure);

    await UIUtils.waitForElementToBeVisible(view, locatorspath.continueButton);

    await UIUtils.clickElement(view, locatorspath.continueButton);
    // Selection of arm cortex on riscv  and  cores Screen
    const armCores = await UIUtils.dataTest(
      view,
      "coresSelection:card:corepart_01jrdgezrce69rsqvja125h3v2",
    );
    await console.log("Found arm cores element");
    const armcorename = await armCores.getText();
    expect(await armCores.getText()).to.include("Arm Cortex-M4");
    console.log("Clicked on arm cores element");
    const riscvCoresDataTestId =
      "coresSelection:card:corepart_01jrdgezrce6a8zq3xaqac6wkg";
    const riscvCores = await UIUtils.dataTest(view, riscvCoresDataTestId);
    await UIUtils.waitForElementToBeVisible(
      view,
      By.css(`[data-test='${riscvCoresDataTestId}']`),
    );
    console.log("riscvcores element found");
    const riscvCoresName = await riscvCores.getText();
    expect(await riscvCores.getText()).to.include("RISC-V");
    console.log("riscvcores text is included in the riscvcores element");
    await UIUtils.clickElement(view, riscvCores);
    await UIUtils.waitForElementToBeVisible(view, locatorspath.continueButton);

    await UIUtils.clickElement(view, locatorspath.continueButton);

    console.log("PLUGIN SELECTION SCREEN - ARM CORES");
    const zephyrSel = await UIUtils.waitForElement(
      view,
      By.css(
        `[data-test='coreConfig:card:com.analog.project.zephyr.mock.plugin']`,
      ),
      2000,
    );
    const pluginId = await zephyrSel.getAttribute("id");
    expect(pluginId).to.include("com.analog.project.zephyr.mock.plugin");

    await UIUtils.clickElement(view, zephyrSel);

    const boardDefaultName = await UIUtils.findWebElement(
      view,
      By.xpath(
        `//*[@id='control-input' and @current-value='${TextData.evkitName32690}']`,
      ),
    );
    await UIUtils.clickElement(view, boardDefaultName);
    const boardName = await boardDefaultName.getAttribute("current-value");
    console.log("Board name arm cortex is: " + boardName);
    expect(boardName).to.equal(TextData.evkitName32690);

    await UIUtils.clickElement(view, locatorspath.continueButton);
    // MSDK Plugin Selection for RISCV cores
    const msdkSelRiscv = await UIUtils.waitForElement(
      view,
      By.css(
        `[data-test='coreConfig:card:com.analog.project.msdk.mock.plugin']`,
      ),
      2000,
    );
    const pluginIdRiscv = await msdkSelRiscv.getAttribute("id");
    expect(pluginIdRiscv).to.include("com.analog.project.msdk.mock.plugin");
    await UIUtils.clickElement(view, msdkSelRiscv);
    const boardNameRiscv = await UIUtils.findWebElement(
      view,
      By.xpath(
        `//*[@id='control-input' and @current-value='${TextData.evKitText}']`,
      ),
    );
    await UIUtils.clickElement(view, boardNameRiscv);
    const getBoardNameRiscv =
      await boardNameRiscv.getAttribute("current-value");
    console.log("Board name riscv is: " + getBoardNameRiscv);
    await UIUtils.clickElement(view, locatorspath.continueButton);

    // Workspace Input Screen
    console.log("WORKSPACE NAME DETAILS SCREEN");

    const pathInput = await UIUtils.dataTest(
      view,
      "confirmation-screen:workspace-name:text-field-control-input",
    );

    console.log("Found path input element");

    await UIUtils.sendKeysToElements(
      view,
      By.xpath('//*[@id="control-input"]'),
      "max32690-blinky-manual",
    );

    console.log(
      `input current-value: ${await pathInput.getAttribute("current-value")}`,
    );
    const workspaceName = await pathInput.getAttribute("current-value");

    console.log("Sent workspace name to input element");

    console.log("Found create workspace button");
    await UIUtils.clickElement(view, locatorspath.createworkspacebutton);

    // Assert that the workspace is created successfully
    const userHome = os.homedir();
    const location = `${userHome}/cfs/${TextData.cfsideversion}`;
    console.log(`location is ${location}`);
    const workspacePath = `${location}/${workspaceName}`;
    if (workspacePath === undefined || workspacePath === null)
      throw new Error("workspacePath is undefined or null");
    console.log(`workspacePath is ${workspacePath}`);
    await VSBrowser.instance.driver.wait(
      () => existsSync(workspacePath),
      10000,
      `Workspace was not created at expected location: ${workspacePath}`,
    );
    const workspaceExists = existsSync(workspacePath);
    expect(workspaceExists).to.equal(true);
    console.log(`Workspace created at: ${workspacePath}`);
    const cfsWorkspaceFile = path.join(workspacePath, ".cfs", ".cfsworkspace");
    console.log("cfsWorkspaceFile =", cfsWorkspaceFile);
    const fileContent = fs.readFileSync(cfsWorkspaceFile, "utf-8");
    // Parsing json content to verify the SOC
    const workspaceData = JSON.parse(fileContent);
    console.log("Parsed workspace data: below");
    // Assertions of Persistance of workspace data and schema verification
    if (!workspaceData) throw new Error("workspaceData is undefined or null");
    expect(workspaceData.Soc).to.equal(socName);
    expect(workspaceData.Board).to.equal(kitName.slice(0, 8));
    expect(workspaceData.WorkspaceName).to.equal(workspaceName);
    expect(workspaceData.Projects[0].PluginId).to.equal(pluginId);
    expect(workspaceData.Projects[0].Name).to.equal(armcorename.slice(0, 14));
    expect(workspaceData.Projects[1].Name).to.equal(riscvCoresName.slice(0, 6));
    expect(workspaceData.Projects[1].PluginId).to.equal(pluginIdRiscv);

    expect(workspaceData.Projects[0].PlatformConfig.ZephyrBoardName).to.equal(
      boardName,
    );
    expect(workspaceData.Projects[1].PlatformConfig.MsdkBoardName).to.equal(
      getBoardNameRiscv,
    );
    expect(workspaceData.Location).to.equal(location);
  }).timeout(120000);
});
