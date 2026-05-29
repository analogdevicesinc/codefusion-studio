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
 * These tests cover building workspace for Single Core TrustZone SOCs
 */

import { expect } from "chai";
import { WebView, Workbench, By, VSBrowser } from "vscode-extension-tester";

import { Locatorspaths } from "../pageElements/pageobjects";
import {
  verifyTrustZoneBadges,
  armCoreDefaultSelection,
  dataActiveStepCircle,
  verifyProjectCount,
} from "../pageElements/sidePanel";
import { UIUtils } from "../../ui-test-utils/ui-utils";
import { TextData } from "../pageElements/text-data";
import * as os from "os";
import { existsSync } from "node:fs";
import * as fs from "fs";
import * as path from "path";

/*
 * Feature: Workspace creation for MAX32XXX with TrustZone Single Core SOC
 *     As a CodeFusion Studio user
 *     I want to create workspace working with TrustZone Single Core SOCs
 *     So that I can develop secure and non-secure applications
 *
 * Background:
 *     Given VS Code is open with the CodeFusion Studio extension loaded
 *     And all editors are closed
 *     And all notifications are dismissed
 *
 * Scenario: Create new workspace for MAX32XXX with TrustZone Single Core SOC and check side panel for projects
 *     Given I run the workbench command "cfs create workspace"
 *     And I wait for the webview to load
 *     Then I switch to the webview frame
 *     And I verify the active step circle for soc selection screen
 *     And select SOC as "MAX32XXX" on soc selection screen by selecting radio button
 *     And click on continue button
 *     And I verify the active step circle for board selection screen
 *     Then I select the EVKit as "EvKit_V1___WLP"
 *     And I click on continue button
 *     Then I choose the "MANUALLY CONFIGURED TEMPLATE" option further clicking on continue button
 *     And I check if single core is selected by default for ARM Core
 *     And I check the project count is shown as 1 for cores and configuration
 *     And I enable TrustZone for ARM Core
 *     And check the non-secure/secure badge is shown
 *     Then I again see the project count is updated for cores and configuration
 *     And I deselect the secure checkbox for Arm core
 *     And  click on back button to return to cores and configuration screen
 *     And I deselect the non secure checkbox for Arm core & select secure
 *     Then I click on continue button
 *     Then  I see the project count is updated for cores and configuration as 1
 *
 *
 * Scenario: Check the workspace creation with required plugin(zephyr) for MAX32XXX with TrustZone Single Core SOC
 *     Given I am on Core and configuration selection screen
 *     And I click on continue button
 *     And I select the required plugin as "Zephyr Plugin" and verify its selection
 *     And I verify the build system
 *     And I verify the platform option boardName
 *     And I click on continue button
 *     And I land on workspace location and name screen
 *     And I enter the workspace name
 *     And I set the workspace location to default path
 *     Then I click on create workspace button and verify the name entered
 *
 *
 *  Scenario: Verify the persistence of the workspace created for MAX32XXX with TrustZone Single Core SOC in directory
 *     Given the create workspace button has been clicked
 *     When  workspace is created in the default location
 *     And I verify the json for workpsace with correct soc, board, cores and configuration
 */

describe("Workspace MAX32XXX creation for trustzone single core soc", () => {
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

  it("Create new workspace manually configured MAX326XXXX trustzone singlecore @smoke", async () => {
    workbench = new Workbench();
    browser = VSBrowser.instance;

    //--- Given I run the workbench command "cfs create workspace"---
    await workbench.executeCommand("cfs create workspace");
    console.log("new workspace command executed");
    await UIUtils.sleep(3000);
    //--- And I wait for the webview to load---

    await UIUtils.dismissAllNotifications(workbench, browser);

    view = new WebView();
    console.log("WebView instance created");

    //--- Then I switch to the webview frame---
    await view.switchToFrame();

    console.log("Creating new workspace for MAX326XX");

    //--- And I verify the active step circle for soc selection screen ---
    console.log("SELECT YOUR SOC SCREEN");
    await UIUtils.clickElement(view, locatorspath.selectorSoc);
    console.log("Waiting for selectorsoc");
    const verifySocScreen = await UIUtils.clickElement(
      view,
      dataActiveStepCircle,
    );
    expect(await verifySocScreen.getAttribute("data-active")).to.include(
      "true",
    );
    console.log("Verified active step circle for soc selection screen");

    // ---  And select SOC as "MAX32XXX" on soc selection screen by selecting radio button ---
    await UIUtils.sendKeysToElements(
      view,
      locatorspath.selectorSoc,
      "MAX32657",
    );

    const socSelection = await UIUtils.clickElement(
      view,
      locatorspath.getRadiobuttonSoc("32657"),
    );
    const socName = await socSelection.getAttribute("id");
    console.log(`Selected SOC: ${socName}`);
    expect(socName).to.include("MAX32657");

    // --- And I click on continue button ---

    await UIUtils.clickElement(view, locatorspath.continueButton);
    // --- And I verify the active step circle for board selection screen---

    console.log("SELECT YOUR BOARD AND PACKAGE SELECTION SCREEN");
    const verifyBoardScreen = await UIUtils.clickElement(
      view,
      dataActiveStepCircle,
    );
    expect(await verifyBoardScreen.getAttribute("data-active")).to.include(
      "true",
    );
    console.log("Verified active step circle for board selection screen");

    // --- Then I select the EVKit as "EvKit_V1___WLP" on evkit selection screen---
    const kitName = await UIUtils.getAttributeFromWebElement(
      await UIUtils.findWebElement(
        view,
        locatorspath.kitSelect("EvKit_V1___WLP"),
      ),
      "id",
    );
    expect(kitName).to.include(TextData.evKitText);
    await UIUtils.clickElement(view, locatorspath.kitSelect("EvKit_V1___WLP"));

    //---And I click on continue button---
    await UIUtils.clickElement(view, locatorspath.continueButton);

    //---And I verify the workspace options screen---
    console.log("TEMPLATE SELECTION SCREEN - MANUALLY CONFIGURED TEMPLATE");

    const verifyWorkspaceOptionsScreen = await UIUtils.clickElement(
      view,
      dataActiveStepCircle,
    );
    expect(
      await verifyWorkspaceOptionsScreen.getAttribute("data-active"),
    ).to.include("true");
    console.log("Verified active step circle for Workspace Options screen");

    //---Then I choose the "MANUALLY CONFIGURED TEMPLATE" option further clicking on continue button---

    const manualConfigure = await UIUtils.clickElement(
      view,
      "workspaceOptions:card:manualConfig",
    );
    const templateName = await manualConfigure.getAttribute("id");
    expect(templateName).to.include("custom");

    //---And I verify the cores and configuration options screen---
    console.log("TEMPLATE SELECTION SCREEN - MANUALLY CONFIGURED TEMPLATE");

    const verifyCoresConfigurationScreen = await UIUtils.clickElement(
      view,
      dataActiveStepCircle,
    );
    expect(
      await verifyCoresConfigurationScreen.getAttribute("data-active"),
    ).to.include("true");
    console.log(
      "Verified active step circle for Cores and Configuration screen",
    );

    // --- And I check if single core is selected by default for ARM Core---
    await UIUtils.clickElement(view, locatorspath.continueButton);

    const armCoreDefaultSelectionElement =
      await UIUtils.getAttributeFromWebElement(
        await UIUtils.findWebElement(view, armCoreDefaultSelection),
        "current-value",
      );
    expect(armCoreDefaultSelectionElement).to.equal("true");

    //--- And I check the project count is shown as 1 for cores and configuration---
    await verifyProjectCount(view, 1);

    // --- Then I enable TrustZone for ARM Core---
    await UIUtils.waitForElementToBeVisible(view, locatorspath.trustZoneToggle);

    await UIUtils.clickElement(view, locatorspath.trustZoneToggle);
    //---And check the non-secure/secure badge is shown---

    await verifyTrustZoneBadges(view, "NS");
    await verifyTrustZoneBadges(view, "S");

    //--- Then I again see the project count is updated for cores and configuration---

    await verifyProjectCount(view, 2);

    //--- And I deselect the secure checkbox for Arm core---
    console.log("Deselecting secure TrustZone for ARM Core project");

    await UIUtils.waitForElement(view, locatorspath.secureCheckBox);
    await UIUtils.clickElement(view, locatorspath.secureCheckBox);
    console.log("Deselected secure TrustZone for ARM Core");

    //--- And again I see the project count is updated for cores and configuration as 1 ---
    await verifyProjectCount(view, 1);

    //---And I click on continue button---
    await UIUtils.clickElement(view, locatorspath.continueButton);

    //--- And click on back button to return to cores and configuration screen ---
    await UIUtils.clickElement(view, locatorspath.backButton);

    // ---And  deselect the non secure checkbox for Arm core & select secure---
    await UIUtils.clickElement(view, locatorspath.nonSecureCheckBox);
    await UIUtils.clickElement(view, locatorspath.secureCheckBox);

    //---And I click on continue button---
    await UIUtils.clickElement(view, locatorspath.continueButton);

    // --- And I select the required plugin as "Zephyr Plugin"---

    console.log("PLUGIN SELECTION SCREEN - ARM CORES");
    const pluginId = await (
      await UIUtils.clickElement(
        view,
        "coreConfig:card:com.analog.project.zephyr.mock.plugin",
      )
    ).getAttribute("id");

    expect(pluginId).to.include("com.analog.project.zephyr.mock.plugin");

    //--- And I verify the platform option boardName---
    const buildSystemValue = await UIUtils.getAttributeFromWebElement(
      await UIUtils.findWebElement(view, locatorspath.buildSystem),
      "current-value",
    );
    expect(buildSystemValue).to.equal(TextData.buildSystemValue);

    //--- And i verify the build system---
    const boardDefaultName = await UIUtils.getAttributeFromWebElement(
      await UIUtils.findWebElement(view, locatorspath.boardDefaultName),
      "current-value",
    );
    expect(boardDefaultName).to.equal(TextData.evkitname326XX);

    // --- And I click on continue button---

    await UIUtils.clickElement(view, locatorspath.continueButton);

    //---And I land on workspace location and name screen---
    console.log("WORKSPACE NAME DETAILS SCREEN");

    //---And I enter the workspace name as "max326XXX_trustzone_singlecore"
    await UIUtils.sendKeysToElements(
      view,
      By.xpath('//*[@id="control-input"]'),
      TextData.workspaceName,
    );

    //--Then I click on create workspace button and verify the name entered---
    const workspaceName = await UIUtils.getAttributeFromWebElement(
      await UIUtils.findWebElement(view, locatorspath.workspaceNameInput),
      "current-value",
    );

    console.log("workspaceName:", workspaceName);
    expect(workspaceName).to.equal(TextData.workspaceName);
    console.log("Sent workspace name to input element");

    console.log("Found create workspace button");
    await UIUtils.clickElement(view, locatorspath.createworkspacebutton);
    await UIUtils.sleep(200);

    //--- Given the create workspace button has been clicked---
    //---When  workspace is created in the default location---
    //---And I verify the json for workpsace with correct soc, board, cores and configuration---

    const userHome = os.homedir();
    const location = `${userHome}/cfs/${TextData.cfsideversion}`;
    console.log(`location is ${location}`);
    const workspacePath = `${location}/${workspaceName}`;
    await UIUtils.sleep(200);
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
    console.log("Content of .cfsworkspace:\n", fileContent);

    //---Parsing json content to verify the SOC---
    const workspaceData = JSON.parse(fileContent);
    await UIUtils.sleep(300);
    console.log("Parsed workspace data: below and verifying the schema");

    //--- Persistance assertions and verification of schema of workspaceData---
    if (!workspaceData) throw new Error("workspaceData is undefined or null");

    expect(
      workspaceData.Soc,
      `SOC validation failed: Expected '${socName}' but workspace data contains '${workspaceData.Soc}'`,
    ).to.equal(socName);
    console.log("SOC verified successfully");
    expect(workspaceData.Projects[0].IsTrustZoneSupported).to.be.true;
    console.log("TrustZone verified successfully");

    expect(workspaceData.Projects[0].Secure).to.be.true;
    console.log("Secure verified successfully");

    // Find and verify the non-secure project is disabled
    const nonSecureProject = workspaceData.Projects.find(
      (p: any) => p.Secure === false,
    );
    expect(nonSecureProject).to.exist;
    expect(nonSecureProject.IsEnabled).to.be.false;
    console.log("Non-secure project is correctly disabled");

    expect(
      workspaceData.Board,
      `Board validation failed: Expected '${workspaceData.Board}' to contain '${kitName}'`,
    ).to.equal("EvKit_V1");
    console.log("Board verified successfully");

    expect(
      workspaceData.WorkspaceName,
      `Workspace name validation failed: Expected '${workspaceName}' but workspace data contains '${workspaceData.WorkspaceName}'`,
    ).to.equal(workspaceName);
    console.log("Workspace data verified successfully");
  }).timeout(120000);
});
