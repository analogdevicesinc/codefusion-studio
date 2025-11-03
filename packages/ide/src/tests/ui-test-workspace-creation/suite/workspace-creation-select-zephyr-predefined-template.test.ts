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
 * These tests cover building workspace for MAX78XXX.
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
 * Test building a MAX78XXX zephyr project
 */

describe("Workspace MAX78XXX creation using predefined template", () => {
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

  it("Create new workspace for MAX78XXX using predefined template zephyr @smoke", async () => {
    workbench = new Workbench();
    browser = VSBrowser.instance;

    await workbench.executeCommand("cfs create workspace");

    console.log("new workspace command executed");

    await UIUtils.sleep(5000);

    await UIUtils.dismissAllNotifications(workbench, browser);

    view = new WebView();
    console.log("WebView instance created");

    await view.switchToFrame();

    console.log(
      "Creating new workspace for MAX78XXX using predefined template",
    );
    // SOC Screen Selection
    console.log("SELECT YOUR SOC SCREEN");

    await UIUtils.clickElement(view, locatorspath.selectorSoc);

    console.log("Waiting for selectursoc");
    await UIUtils.sendKeysToElements(
      view,
      locatorspath.selectorSoc,
      TextData.soc78XXX,
    );
    console.log("Waiting for SOC radio button...");
    await UIUtils.waitForElement(
      view,
      locatorspath.getRadiobuttonSoc("78002"),
      10000,
    );
    console.log("Clicking SOC radio button...");

    const socSelection = await UIUtils.clickElement(
      view,
      locatorspath.getRadiobuttonSoc("78002"),
    );
    const socName = await socSelection.getAttribute("id");
    console.log(`Selected SOC: ${socName}`);

    expect(socName).to.include(TextData.soc78XXX);

    console.log("Clicked on radiobuttonsoc");

    await UIUtils.clickElement(view, locatorspath.continueButton);

    console.log("Waiting for EV kit Selection Screen");

    // EVKit Selection Screen

    console.log("SELECT YOUR BOARD AND PACKAGE SELECTION SCREEN");

    console.log("evkit text is included in the kitselect");
    const kitName = await (
      await UIUtils.dataTest(view, "boardSelection:card:EvKit_V1___CSBGA")
    ).getText();
    console.log("kitname:", kitName);

    expect(kitName).to.include(TextData.evKitText);

    await UIUtils.clickElement(
      view,
      locatorspath.kitSelect("EvKit_V1___CSBGA"),
    );
    console.log("Clicked on kitselect");

    await UIUtils.clickElement(view, locatorspath.continueButton);

    // Predefined template option already selected TEMPLATE SELECTION SCREEN - PREDEFINED TEMPLATE
    console.log("TEMPLATE SELECTION SCREEN - PREDEFINED TEMPLATE");
    await UIUtils.sleep(2000);

    await UIUtils.clickElement(view, locatorspath.continueButton, 5000);

    // Plugin Selection Screen
    console.log("PLUGIN SELECTION SCREEN");
    const blinkyTemplate = await UIUtils.dataTest(
      view,
      "templateSelection:card:com.analog.zephyr.workspace.blinky",
    );
    console.log("Found blinky template");
    const templateName = await blinkyTemplate.getAttribute("id");
    console.log("Template name:", templateName);
    expect(templateName).to.include("com.analog.zephyr.workspace.blinky");

    // Scroll plugins cards into view
    await browser.driver.executeScript(
      "arguments[0].scrollIntoView({block: 'center'});",
      blinkyTemplate,
    );

    await blinkyTemplate.click();
    console.log("Clicked on blinky template");
    await await UIUtils.sleep(3000);

    await UIUtils.clickElement(
      view,
      By.xpath('//*[@id="root"]/div/div[3]/div/div/vscode-button[2]'),
    );
    console.log("Waiting for confirmation screen");
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
      "max_78000_blinky",
    );

    console.log(
      `input current-value: ${await pathInput.getAttribute("current-value")}`,
    );
    const workspaceName = await pathInput.getAttribute("current-value");

    const createwsBtn = await view.findWebElement(
      By.xpath('//*[@id="root"]/div/div[3]/div/div/vscode-button[2]'),
    );

    console.log("Found create workspace button");
    await createwsBtn.click();
    console.log("Clicked on create workspace button");
    UIUtils.sleep(5000);

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
    // Parsing json content to verify the SOC
    const workspaceData = JSON.parse(fileContent);
    UIUtils.sleep(3000);
    console.log("Parsed workspace data: below and verifying the schema");
    // Persistance assertions and verification of schema of workspaceData
    if (!workspaceData) throw new Error("workspaceData is undefined or null");
    expect(workspaceData.Soc).to.equal(socName);
    expect(workspaceData.WorkspacePluginId).to.equal(templateName);
    expect(workspaceData.Board).to.equal(kitName.slice(0, 8));
    expect(workspaceData.WorkspaceName).to.equal(workspaceName);
    expect(workspaceData.Location).to.equal(location);
    console.log("Workspace data verified successfully");
  }).timeout(80000);
});
