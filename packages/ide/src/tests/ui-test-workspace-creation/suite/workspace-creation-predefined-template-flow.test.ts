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
import * as path from "node:path";
import * as fs from "node:fs";

/**
 * Test building a MAX32690 zephyr project
 */

describe("Workspace MAX32690 creation", () => {
  const locatorspath = new Locatorspaths();
  let workbench: Workbench;
  let browser: VSBrowser;
  let view: WebView;

  after(async () => {
    try {
      if (view) await view.switchBack();
      await UIUtils.sleep(2000);
      if (workbench) await workbench.executeCommand("view: close all editors");
      await UIUtils.sleep(2000);
    } catch (error) {
      console.error("Error in after() hook:", error);
    }
  });

  it("Create new workspace manually configured MAX32690 @smoke", async () => {
    workbench = new Workbench();
    browser = VSBrowser.instance;

    await workbench.executeCommand("cfs create workspace");

    console.log("new workspace command executed");

    await UIUtils.sleep(5000);

    await UIUtils.dismissAllNotifications(workbench, browser);

    view = new WebView();
    console.log("WebView instance created");

    await view.switchToFrame();

    console.log("Creating new workspace for MAX32690");
    // SOC Screen Selection
    console.log("SELECT YOUR SOC SCREEN");

    await UIUtils.clickElement(view, locatorspath.selectorSoc);

    console.log("Waiting for selectorsoc");
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

    // EVKit Selection Screen

    console.log("SELECT YOUR BOARD AND PACKAGE SELECTION SCREEN");

    console.log("evkit text is included in the kitselect");
    const kitName = await (
      await UIUtils.findWebElement(
        view,
        locatorspath.kitSelect("EvKit_V1___TQFN"),
      )
    ).getText();
    console.log("kitname:", kitName);

    expect(kitName).to.include(TextData.evKitText);

    await UIUtils.clickElement(view, locatorspath.kitSelect("EvKit_V1___TQFN"));
    console.log("Clicked on kitselect");

    await UIUtils.clickElement(view, locatorspath.continueButton);
    console.log("Clicked on continue button");

    // Predefined template option already selected TEMPLATE SELECTION SCREEN - PREDEFINED TEMPLATE
    console.log("TEMPLATE SELECTION SCREEN - PREDEFINED TEMPLATE");
    await UIUtils.sleep(2000);

    await UIUtils.clickElement(view, locatorspath.continueButton, 5000);
    console.log("Clicked on continue button for predefined template");

    // Plugin Selection Screen
    console.log("PLUGIN SELECTION SCREEN");
    const blinkyTemplate = await UIUtils.dataTest(
      view,
      "templateSelection:card:com.analog.zephyr.workspace.blinky",
    );
    console.log("Found blinky template");
    // Scroll plugins cards into view
    await browser.driver.executeScript(
      "arguments[0].scrollIntoView({block: 'center'});",
      blinkyTemplate,
    );
    const templateName = await blinkyTemplate.getAttribute("id");
    console.log("Template name:", templateName);
    expect(templateName).to.include("com.analog.zephyr.workspace.blinky");

    await blinkyTemplate.click();
    console.log("Clicked on blinky template");
    await UIUtils.sleep(3000);

    await UIUtils.clickElement(
      view,
      By.xpath('//*[@id="root"]/div/div[3]/div/div/vscode-button[2]'),
    );
    console.log("Clicked on continue button for template");

    const pluginDescription = await UIUtils.dataTest(
      view,
      "confirmation-screen:summary:template",
    );

    console.log(
      `Plugin description text: ${await pluginDescription.getText()}`,
    );

    expect(await pluginDescription.getText()).to.include(TextData.plugintext);

    console.log("plugin text is included in the selectpluginzephyr");

    const pathInput = await UIUtils.dataTest(
      view,
      "confirmation-screen:workspace-name:text-field-control-input",
    );

    console.log("Found path input element");

    // Workspace Input Screen
    console.log("WORKSPACE NAME DETAILS SCREEN");

    await UIUtils.sendKeysToElements(
      view,
      By.xpath('//*[@id="control-input"]'),
      "max_32690_blinky",
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
    await UIUtils.sleep(5000);
    console.log(`workspacePath is ${workspacePath}`);
    expect(existsSync(workspacePath)).to.be.true;
    console.log(`Workspace created at: ${workspacePath}`);
    const cfsWorkspaceFile = path.join(workspacePath, ".cfs", ".cfsworkspace");
    console.log("cfsWorkspaceFile =", cfsWorkspaceFile);
    const fileContent = fs.readFileSync(cfsWorkspaceFile, "utf-8");
    console.log("Content of .cfsworkspace:\n", fileContent);
    // Parsing json content to verify the SOC
    const workspaceData = JSON.parse(fileContent);
    await UIUtils.sleep(3000);
    console.log("Parsed workspace data: below and verifying the schema");
    // Persistance assertions and verification of schema of workspaceData
    if (!workspaceData) throw new Error("workspaceData is undefined or null");
    expect(workspaceData.Soc).to.equal(socName);
    expect(workspaceData.WorkspacePluginId).to.equal(templateName);
    expect(workspaceData.Board).to.equal(kitName.slice(0, 8));
    expect(workspaceData.WorkspaceName).to.equal(workspaceName);
    expect(workspaceData.Location).to.equal(location);
    console.log("Workspace data verified successfully");
  }).timeout(90000);
});
