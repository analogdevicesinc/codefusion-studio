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
 * Test building a MAX78XXX zephyr project manually configured
 */

describe("Workspace MAX78XXX creation manual configuration", () => {
  const locatorspath = new Locatorspaths();
  let workbench: Workbench;
  let browser: VSBrowser;
  let view: WebView;

  after(async () => {
    await view.switchBack();
    await UIUtils.sleep(2000);
    console.log("Switched back to close editors");
    await workbench.executeCommand("View: Revert and Close Editor");
    await UIUtils.sleep(2000);
    console.log("Closed all editors");
  });

  it("Create new workspace manually(riscv/arm) configured MAX78XXX", async () => {
    console.log(
      "Starting workspace creation for MAX78XXX using arm/riscv cores",
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
    console.log("Creating new workspace for MAX78XXX");
    await UIUtils.clickElement(view, locatorspath.selectorSoc);
    await UIUtils.sendKeysToElements(
      view,
      locatorspath.selectorSoc,
      TextData.soc78XXX,
    );

    const socSelection = await UIUtils.clickElement(
      view,
      locatorspath.getRadiobuttonSoc("78002"),
    );
    const socName = await socSelection.getAttribute("id");
    console.log(`Selected SOC: ${socName}`);

    expect(socName).to.include(TextData.soc78XXX);

    await UIUtils.clickElement(view, locatorspath.continueButton);

    // Kit Selection Screen
    console.log("KIT SELECTION SCREEN");

    expect(
      await (
        await UIUtils.findWebElement(
          view,
          locatorspath.kitSelect("EvKit_V1___CSBGA"),
        )
      ).getText(),
    ).to.include(TextData.evKitText);

    console.log("evkit text is included in the kitselect");
    const kitName = await (
      await UIUtils.findWebElement(
        view,
        locatorspath.kitSelect("EvKit_V1___CSBGA"),
      )
    ).getText();
    console.log("kitname:", kitName);

    await UIUtils.clickElement(
      view,
      locatorspath.kitSelect("EvKit_V1___CSBGA"),
    );

    await UIUtils.clickElement(view, locatorspath.continueButton);

    await UIUtils.sleep(2000);
    // Manual Template Configuration Screen
    console.log("TEMPLATE SELECTION SCREEN - MANUAL CONFIGURATION");
    console.log("Waiting for manual configure option");
    const manualConfigure = await UIUtils.findWebElement(
      view,
      By.xpath("//*[@data-test='workspaceOptions:card:manualConfig']"),
    );
    await UIUtils.sleep(2000);
    console.log("Found manual configure option");
    const templateName = await manualConfigure.getAttribute("id");
    console.log("Template name:", templateName);
    expect(templateName).to.include("custom");
    await UIUtils.clickElement(view, manualConfigure);

    await UIUtils.sleep(2000);

    await UIUtils.clickElement(view, locatorspath.continueButton);
    // Selection of arm cortex on riscv  and  cores Screen
    console.log("Waiting to find Arm Cores ");
    const armCores = await UIUtils.findWebElement(
      view,
      By.xpath(
        "//*[@data-test='coresSelection:card:corepart_01jrdgezphe4na53xk7nwssdg7']",
      ),
    );
    await UIUtils.sleep(2000);
    console.log("Found arm cores element");
    const armCoreName = await armCores.getText();
    expect(await armCores.getText()).to.include("Arm Cortex-M4F");
    console.log("Clicked on arm cores element");
    await UIUtils.sleep(2000);

    const riscvCores = await UIUtils.findWebElement(
      view,
      By.xpath("//*[@id='corepart_01jrdgezphe4ntw1y97qj3qn92']"),
    );
    console.log("riscvcores element found");
    const riscvCoresName = await riscvCores.getText();
    expect(await riscvCores.getText()).to.include("RISC-V");
    console.log("riscvcores text is included in the riscvcores element");
    await UIUtils.clickElement(view, riscvCores);

    await UIUtils.clickElement(view, locatorspath.continueButton);

    console.log("PLUGIN SELECTION SCREEN - ARM CORES");
    const zephyrSel = await UIUtils.dataTest(
      view,
      "coreConfig:card:com.analog.project.zephyr.mock.plugin",
    );

    const pluginId = await zephyrSel.getAttribute("id");
    expect(pluginId).to.include("com.analog.project.zephyr.mock.plugin");

    await UIUtils.sleep(2000);
    await UIUtils.clickElement(view, zephyrSel);

    const buildSystem = await UIUtils.dataTest(
      view,
      "core-config:dynamic-form:control-BuildSystem",
    );
    const buildSystemValue = await buildSystem.getAttribute("current-value");
    console.log("Build system value is: " + buildSystemValue);
    expect(buildSystemValue).to.equal(TextData.buildSystemValue);

    await UIUtils.sleep(2000);
    const boardDefaultName = await UIUtils.findWebElement(
      view,
      By.xpath(
        `//*[@id='control-input' and @current-value='${TextData.evkitname78XXX}']`,
      ),
    );
    await UIUtils.clickElement(view, boardDefaultName);
    const boardName = await boardDefaultName.getAttribute("current-value");
    console.log("Board name arm cortex is: " + boardName);
    expect(boardName).to.equal(TextData.evkitname78XXX);

    await UIUtils.sleep(2000);
    await UIUtils.clickElement(view, locatorspath.continueButton);

    // MSDK Plugin Selection for RISCV cores
    const msdkSelRiscv = await UIUtils.dataTest(
      view,
      "coreConfig:card:com.analog.project.msdk.mock.plugin",
    );
    const pluginIdRiscv = await msdkSelRiscv.getAttribute("id");

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
    console.log("Board name ricv is: " + getBoardNameRiscv);
    await UIUtils.sleep(2000);
    await UIUtils.clickElement(view, locatorspath.continueButton);
    await UIUtils.sleep(2000);

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
      "max78xxx-blinky-manual",
    );

    console.log(
      `input current-value: ${await pathInput.getAttribute("current-value")}`,
    );
    const workspaceName = await pathInput.getAttribute("current-value");

    console.log("Found create workspace button");
    await UIUtils.clickElement(view, locatorspath.createworkspacebutton);
    await UIUtils.sleep(5000);
    // Assert that the workspace is created successfully
    const userHome = os.homedir();
    const location = `${userHome}/cfs/${TextData.cfsideversion}`;
    console.log(`location is ${location}`);
    const workspacePath = `${location}/${workspaceName}`;
    console.log(`workspacePath is ${workspacePath}`);
    await VSBrowser.instance.driver.wait(
      () => existsSync(workspacePath),
      10000,
      `Workspace was not created at expected location: ${workspacePath}`,
    );
    expect(existsSync(workspacePath)).to.be.true;
    console.log(`Workspace created at: ${workspacePath}`);
    const cfsWorkspaceFile = path.join(workspacePath, ".cfs", ".cfsworkspace");
    console.log("cfsWorkspaceFile =", cfsWorkspaceFile);
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
    expect(workspaceData.Projects[0].PluginId).to.equal(pluginId);
    expect(workspaceData.Projects[0].Name).to.equal(armCoreName.slice(0, 14));
    expect(workspaceData.Projects[1].Name).to.equal(riscvCoresName.slice(0, 6));
    expect(workspaceData.Projects[1].PluginId).to.equal(pluginIdRiscv);

    expect(workspaceData.Projects[0].PlatformConfig.ZephyrBoardName).to.equal(
      boardName,
    );
    expect(workspaceData.Projects[1].PlatformConfig.MsdkBoardName).to.equal(
      getBoardNameRiscv,
    );
    expect(workspaceData.Location).to.equal(location);
    console.log("Workspace data verified successfully");
  }).timeout(120000);
});
