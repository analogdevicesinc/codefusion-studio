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
import { UIUtils } from "../utility-workspace/workspace-utils";
import { TextData } from "../pageElements/text-data";
import * as os from "os";
import { existsSync } from "node:fs";
import * as fs from "fs";
import * as path from "path";

/**
 * Test building a MAX32690 MSDK project manually configured
 */

describe("Workspace MAX32690 creation manual configuration MSDK", () => {
  const locatorspath = new Locatorspaths();
  let workbench: Workbench;
  let browser: VSBrowser;
  let view: WebView;

  after(async () => {
    await view.switchBack();
    await UIUtils.sleep(2000);
    console.log("Switched back to close editors");
    await workbench.executeCommand("view: close all editors");
    await UIUtils.sleep(2000);
    console.log("Closed all editors");
  });

  it("Create new workspace manually(riscv/arm) configured MAX32690", async () => {
    console.log(
      "Starting workspace creation for MAX32690 using arm/riscv cores",
    );
    workbench = new Workbench();
    browser = VSBrowser.instance;
    await workbench.executeCommand("cfs create workspace");
    console.log("new workspace command executed");
    await UIUtils.sleep(5000);
    await UIUtils.dismissAllNotifications(workbench, browser);
    console.log("Dismissed all notifications");

    view = new WebView();
    console.log("WebView instance created");
    await view.switchToFrame();

    // SOC Screen Selection
    console.log("Creating new workspace for MAX32690");
    await UIUtils.clickElement(view, locatorspath.selectorSoc);

    console.log("Clicked on select SOC");

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

    console.log("Clicked on radiobuttonsoc");

    await UIUtils.clickElement(view, locatorspath.continueButton);

    console.log("Clicked on continue button");
    // Kit Selection Screen
    console.log("KIT SELECTION SCREEN");

    expect(
      await (
        await UIUtils.findWebElement(
          view,
          locatorspath.kitSelect("EvKit_V1___TQFN"),
        )
      ).getText(),
    ).to.include(TextData.evKitText);

    console.log("evkit text is included in the kitselect");
    const kitName = await (
      await UIUtils.findWebElement(
        view,
        locatorspath.kitSelect("EvKit_V1___TQFN"),
      )
    ).getText();
    console.log("kitname:", kitName);
    UIUtils.sleep(3000);
    await UIUtils.clickElement(view, locatorspath.kitSelect("EvKit_V1___TQFN"));

    console.log("Clicked on kitselect");
    UIUtils.sleep(5000);
    await UIUtils.clickElement(view, locatorspath.continueButton);
    console.log("Clicked on continue button");

    await UIUtils.sleep(2000);
    // Manual Template Configuration Screen
    console.log("TEMPLATE SELECTION SCREEN - MANUAL CONFIGURATION");
    console.log("Waiting for manual configure option");
    const manualConfigure = await UIUtils.dataTest(
      view,
      "workspaceOptions:card:manualConfig",
    );
    await UIUtils.sleep(2000);
    console.log("Found manual configure option");
    const templateName = await manualConfigure.getAttribute("id");
    console.log("Template name:", templateName);
    expect(templateName).to.include("custom");
    manualConfigure.click();

    await UIUtils.sleep(2000);

    console.log(
      "Clicked on manual configure option and clicking on continue button",
    );
    await UIUtils.clickElement(view, locatorspath.continueButton);
    // Selection of arm cortex on riscv  and  cores Screen
    console.log("Clicked on continue button for arm cores");
    const armCores = await UIUtils.waitForElement(
      view,
      By.css(
        `[data-test='coresSelection:card:corepart_01jrdgezrce69rsqvja125h3v2']`,
      ),
      2000,
    );
    console.log("Found arm cores element");
    const armCoreName = await armCores.getText();
    expect(await armCores.getText()).to.include("Arm Cortex-M4");
    console.log("Clicked on arm cores element");
    const riscvCores = await UIUtils.waitForElement(
      view,
      By.xpath("//*[@id='corepart_01jrdgezrce6a8zq3xaqac6wkg']"),
      10000,
    );
    console.log("riscvcores element found");
    const riscvCoresName = await riscvCores.getText();
    expect(await riscvCores.getText()).to.include("RISC-V");
    console.log("riscvcores text is included in the riscvcores element");
    riscvCores.click();
    console.log("Clicked on riscv cores element");

    await UIUtils.clickElement(view, locatorspath.continueButton);
    UIUtils.sleep(2000);

    console.log("PLUGIN SELECTION SCREEN - ARM CORES");

    const msdk = await UIUtils.waitForElement(
      view,
      By.css(`[data-test='coreConfig:card:com.analog.project.msdk.plugin']`),
      2000,
    );
    const pluginid = await msdk.getAttribute("id");
    expect(pluginid).to.include("com.analog.project.msdk.plugin");

    msdk.click();
    console.log("Clicked on msdk plugin selection");

    await UIUtils.sleep(2000);
    const boarddefaultname = await UIUtils.findWebElement(
      view,
      By.xpath(
        `//*[@id='control-input' and @current-value='${TextData.evKitText}']`,
      ),
    );
    boarddefaultname.click();
    console.log("Clicked on board default name input");
    const boardname = await boarddefaultname.getAttribute("current-value");
    console.log("Board name arm cortex is: " + boardname);
    expect(boardname).to.equal(TextData.evKitText);

    const applybutton = await UIUtils.findWebElement(
      view,
      By.xpath("//*[@data-test='wrksp-footer:continue-btn']"),
    );
    await UIUtils.sleep(2000);
    applybutton.click();
    console.log("Clicked on Apply button");
    UIUtils.sleep(3000);
    // MSDK Plugin Selection for RISCV cores
    const msdkRiscv = await UIUtils.dataTest(
      view,
      "coreConfig:card:com.analog.project.msdk.plugin",
    );
    const pluginIdRiscv = await msdkRiscv.getAttribute("id");
    expect(pluginIdRiscv).to.include("com.analog.project.msdk.plugin");

    UIUtils.sleep(2000);
    msdkRiscv.click();
    console.log("Clicked on msdk plugin selection for riscv");
    UIUtils.sleep(2000);
    const boardNameRiscv = await UIUtils.findWebElement(
      view,
      By.xpath(
        `//*[@id='control-input' and @current-value='${TextData.evKitText}']`,
      ),
    );
    boardNameRiscv.click();
    console.log("Clicked on board default name input");
    const getBoardNameRiscv =
      await boardNameRiscv.getAttribute("current-value");
    console.log("Board name riscv is: " + getBoardNameRiscv);
    await UIUtils.sleep(2000);
    const applyButtonRiscv = await UIUtils.findWebElement(
      view,
      By.xpath("//*[@data-test='wrksp-footer:continue-btn']"),
    );
    await UIUtils.sleep(2000);
    applyButtonRiscv.click();
    await UIUtils.sleep(2000);
    console.log("Clicked on apply button");

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
      "max32690-msdk-manual",
    );

    console.log(
      `input current-value: ${await pathInput.getAttribute("current-value")}`,
    );
    const workspaceName = await pathInput.getAttribute("current-value");

    console.log("Sent workspace name to input element");

    const createwsBtn = await view.findWebElement(
      By.xpath('//*[@id="root"]/div/div[3]/div/div/vscode-button[2]'),
    );

    console.log("Found create workspace button");
    await createwsBtn.click();
    console.log("Clicked on create workspace button");
    await UIUtils.sleep(5000);
    // Assert that the workspace is created successfully
    const userHome = os.homedir();
    const location = `${userHome}/cfs/${TextData.cfsidevesrion}`;
    console.log(`location is ${location}`);
    const workspacePath = `${location}/${workspaceName}`;
    UIUtils.sleep(5000);
    console.log(`workspacePath is ${workspacePath}`);
    expect(existsSync(workspacePath)).to.be.true;
    console.log(`Workspace created at: ${workspacePath}`);
    const cfsWorkspaceFile = path.join(workspacePath, ".cfs", ".cfsworkspace");
    console.log("cfsWorkspaceFile =", cfsWorkspaceFile);
    // Read the workspace file to verify the SOC and other details
    const fileContent = fs.readFileSync(cfsWorkspaceFile, "utf-8");
    // Parsing json content to verify the SOC
    const workspaceData = JSON.parse(fileContent);
    await UIUtils.sleep(3000);
    console.log("Parsed workspace data: below");
    // Assertions of Persistance of workspace data and schema verification
    if (!workspaceData) throw new Error("workspaceData is undefined or null");
    expect(workspaceData.Soc).to.equal(socName);
    expect(workspaceData.Board).to.equal(kitName.slice(0, 8));
    expect(workspaceData.WorkspaceName).to.equal(workspaceName);
    expect(workspaceData.Projects[0].PluginId).to.equal(pluginid);
    expect(workspaceData.Projects[0].Name).to.equal(armCoreName.slice(0, 14));
    expect(workspaceData.Projects[1].Name).to.equal(riscvCoresName.slice(0, 6));
    expect(workspaceData.Projects[1].PluginId).to.equal(pluginIdRiscv);

    expect(workspaceData.Projects[0].PlatformConfig.MsdkBoardName).to.equal(
      boardname,
    );
    expect(workspaceData.Projects[1].PlatformConfig.MsdkBoardName).to.equal(
      getBoardNameRiscv,
    );
    expect(workspaceData.Location).to.equal(location);
    console.log("Workspace data verified successfully");
  }).timeout(120000);
});
