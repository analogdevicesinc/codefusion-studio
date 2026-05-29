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
 * These tests cover building workspace for MAX32XXX with externally managed core
 */

import { expect, assert } from "chai";
import { WebView, Workbench, By, VSBrowser } from "vscode-extension-tester";

import { Locatorspaths } from "../pageElements/pageobjects";
import {
  dataActiveStepCircle,
  verifyActiveStepCircle,
} from "../pageElements/sidePanel";
import { UIUtils } from "../../ui-test-utils/ui-utils";
import { parseJSONFile } from "../../ui-test-config-tools/config-tools-utility/cfsconfig-utils";
import { peripheralTab } from "../../ui-test-config-tools/page-objects/main-menu";
import { TextData } from "../pageElements/text-data";
import * as os from "os";
import { existsSync } from "node:fs";
import * as fs from "fs";
import * as path from "path";

/*
 * Feature: Workspace creation for MAX32XXX with externally managed core
 *     As a CodeFusion Studio user
 *     I want to create workspace working with externally managed cores
 *     So that I can see the externally managed label in cfsconfig file and UI
 *
 * Background:
 *     Given VS Code is open with the CodeFusion Studio extension loaded
 *     And all editors are closed
 *     And all notifications are dismissed
 *
 * Scenario: Create new workspace for MAX32XXX with externally managed core by selecting only primary core
 *     Given I run the workbench command "cfs create workspace"
 *     And I wait for the webview to load
 *     And dismiss all notifications
 *     Then I switch to the webview frame
 *     And I verify the active step circle for soc selection screen
 *     And select SOC as "MAX32XXX" on soc selection screen by selecting radio button
 *     And click on continue button
 *     And I verify the active step circle for board selection screen
 *     Then I select the EVKit as "EvKit_V1___TQFN" on evkit selection screen
 *     And I click on continue button
 *     Then I choose the "MANUALLY CONFIGURED TEMPLATE" option further clicking on continue button
 *     And I verify the active step circle for Cores and Configuration screen
 *     And I check if ARM core is selected by default
 *     Then I click on continue button.
 *
 *
 * Scenario: Check the workspace creation with required plugin(zephyr) for MAX32XXX with only primary core selected
 *     Given I am on Core and configuration selection screen
 *     And I click on continue button
 *     And I select the required plugin as "Zephyr Plugin" and verify its selection
 *     And I verify the build system
 *     And I verify the platform option boardName
 *     And I click on continue button
 *     And I land on workspace location and name screen
 *     And I enter the workspace name
 *     And I verify the active step circle for workspace location and name screen
 *     And I set the workspace location to default path
 *     Then I click on create workspace button and verify the name entered
 *
 *
 * Scenario: Verify the persistence of the workspace created for MAX32XXX with externally managed core
 *     Given the create workspace button has been clicked
 *     When  workspace is created in the default location
 *     Then I verify the json for workpsace with correct soc, board, disabled core and workspace name
 *
 * Scenario: Verify the externally managed label on UI in cfsconfig file
 *    Given I open the generated cfsconfig file from the created workspace
 *    When I switch to the webview frame to see loaded cfsconfig file
 *    And I click on peripheral tab on cfsconfig file webview
 *    Then I check for externally managed label on peripheral card container for other core on UI(RISC-V)
 *
 *
 * Scenario: Verify the generated cfsconfig have externally managed attribute in persistence
 *    Given I have parsed the cfsconfig file from the created workspace
 *    When I check the Projects array for RISC-V core
 *    Then check for externally managed attribute is true in persistence for RISC-V core
 */

describe("Workspace MAX32XXX creation for externally managed core and verifying its persistence", () => {
  const locatorspath = new Locatorspaths();
  let workbench: Workbench;
  let browser: VSBrowser;
  let view: WebView;
  let workspacePath: string;
  let workspaceName: string;
  let cfsConfigFile: string;

  afterEach(async () => {
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

  it("Create new workspace manually configured MAX326XXXX externally managed core", async () => {
    workbench = new Workbench();
    browser = VSBrowser.instance;

    //--- Given I run the workbench command "cfs create workspace"---
    await workbench.executeCommand("cfs create workspace");
    console.log("new workspace command executed");
    await UIUtils.sleep(2000);
    //--- And dismiss all notifications---

    await UIUtils.dismissAllNotifications(workbench, browser);
    //--- And I wait for the webview to load---

    view = new WebView();
    console.log("WebView instance created");

    //--- Then I switch to the webview frame---
    await view.switchToFrame();
    console.log("Creating new workspace for MAX326XX");

    //--- And I verify the active step circle for soc selection screen ---
    console.log("SELECT YOUR SOC SCREEN");
    await UIUtils.clickElement(view, locatorspath.selectorSoc);
    console.log("Waiting for selectorsoc");

    //--- And I verify the active step circle for soc selection screen ---
    await verifyActiveStepCircle(
      view,
      dataActiveStepCircle,
      "soc selection screen",
    );

    // ---  And select SOC as "MAX32XXX" on soc selection screen by selecting radio button ---
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
    expect(socName).to.include("MAX32690");

    // --- And I click on continue button ---
    await UIUtils.clickElement(view, locatorspath.continueButton);

    //--- And I verify the active step circle for board selection screen---

    console.log("SELECT YOUR BOARD AND PACKAGE SELECTION SCREEN");
    await verifyActiveStepCircle(
      view,
      dataActiveStepCircle,
      "board selection screen",
    );

    // --- Then I select the EVKit as "EvKit_V1___TQFN" on evkit selection screen---
    const kitName = await UIUtils.getAttributeFromWebElement(
      await UIUtils.findWebElement(
        view,
        locatorspath.kitSelect("EvKit_V1___TQFN"),
      ),
      "id",
    );
    expect(kitName).to.include(TextData.evKitText);
    await UIUtils.clickElement(view, locatorspath.kitSelect("EvKit_V1___TQFN"));

    //---And I click on continue button---
    await UIUtils.clickElement(view, locatorspath.continueButton);

    //---And I verify the workspace options screen---
    console.log("TEMPLATE SELECTION SCREEN - MANUALLY CONFIGURED TEMPLATE");

    await verifyActiveStepCircle(
      view,
      dataActiveStepCircle,
      "Workspace Options screen",
    );

    //---Then I choose the "MANUALLY CONFIGURED TEMPLATE" option further clicking on continue button---

    const manualConfigure = await UIUtils.clickElement(
      view,
      "workspaceOptions:card:manualConfig",
    );
    const templateName = await manualConfigure.getAttribute("id");
    expect(templateName).to.include("custom");
    await UIUtils.clickElement(view, locatorspath.continueButton);

    //--- And I verify the active step circle for Cores and Configuration screen ---
    console.log("TEMPLATE SELECTION SCREEN - MANUALLY CONFIGURED TEMPLATE");

    await verifyActiveStepCircle(
      view,
      dataActiveStepCircle,
      "Cores and Configuration screen",
    );

    // -- Then I check if ARM core is selected by default ---

    const armCoreSelectionElement = await UIUtils.getAttributeFromWebElement(
      await UIUtils.findWebElement(
        view,
        locatorspath.coreSelectionCard("corepart_01jrdgezrce69rsqvja125h3v2"),
      ),
      "data-active",
    );
    expect(armCoreSelectionElement).to.equal("true");

    console.log("Verified ARM single core is selected by default");

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
    expect(boardDefaultName).to.equal(TextData.evkitName32690);

    // --- And I click on continue button---

    await UIUtils.clickElement(view, locatorspath.continueButton);

    //---And I land on workspace location and name screen---
    //---And I enter the workspace name as "max326XX_externally"---
    await UIUtils.sendKeysToElements(
      view,
      By.xpath('//*[@id="control-input"]'),
      "max326XX_externally",
    );
    //---And I verify the active step circle for workspace location and name screen---
    console.log("WORKSPACE NAME DETAILS SCREEN");
    await verifyActiveStepCircle(
      view,
      dataActiveStepCircle,
      "Workspace Location and Name screen",
    );

    //--Then I click on create workspace button and verify the name entered---
    const workspaceNameValue = await UIUtils.getAttributeFromWebElement(
      await UIUtils.findWebElement(view, locatorspath.workspaceNameInput),
      "current-value",
    );

    console.log("workspaceName:", workspaceNameValue);
    expect(workspaceNameValue).to.equal("max326XX_externally");
    console.log("Sent workspace name to input element");

    //--Assign to shared variables--
    workspaceName = workspaceNameValue;
    console.log("DEBUG: Assigned workspaceName =", workspaceName);

    await UIUtils.clickElement(view, locatorspath.createworkspacebutton);
    await UIUtils.sleep(200);

    //--- Given the create workspace button has been clicked
    //--- When  workspace is created in the default location
    //--- Then I verify the json for workpsace with correct soc, board, disabled core and workspace name---

    const userHome = os.homedir();
    const location = `${userHome}/cfs/${TextData.cfsideversion}`;
    console.log(`location is ${location}`);
    workspacePath = `${location}/${workspaceName}`;
    console.log("DEBUG: Assigned workspacePath =", workspacePath);
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

    expect(
      workspaceData.Board,
      `Board validation failed: Expected '${workspaceData.Board}' to contain '${kitName}'`,
    ).to.equal("EvKit_V1");
    console.log("Board verified successfully");

    //--- Find and verify the disabled externally managed project (RV)---
    const disabledProject = workspaceData.Projects.find(
      (p: any) => p.IsEnabled === false,
    );
    assert.exists(
      disabledProject,
      "Failed to find disabled project in workspace data",
    );
    assert.equal(
      disabledProject?.CoreId,
      "RV",
      `CoreId validation failed: Expected 'RV' but got '${disabledProject?.CoreId}'`,
    );
    assert.equal(
      disabledProject?.Name,
      "RISC-V",
      `Name validation failed: Expected 'RISC-V' but got '${disabledProject?.Name}'`,
    );
    assert.equal(
      disabledProject?.IsPrimary,
      false,
      `IsPrimary validation failed: Expected false but got '${disabledProject?.IsPrimary}'`,
    );
    assert.equal(
      disabledProject?.IsEnabled,
      false,
      `IsEnabled validation failed: Expected false but got '${disabledProject?.IsEnabled}'`,
    );

    console.log("Disabled externally managed project verified successfully");

    expect(
      workspaceData.WorkspaceName,
      `Workspace name validation failed: Expected '${workspaceName}' but workspace data contains '${workspaceData.WorkspaceName}'`,
    ).to.equal(workspaceName);
    console.log("Workspace data verified successfully");
  });

  it("Verify externally managed label on UI in cfsconfig file", async () => {
    //--- Given I open the generated cfsconfig file from the created workspace---
    cfsConfigFile = path.join(
      workspacePath,
      ".cfs",
      `${workspaceName}.cfsconfig`,
    );
    console.log("cfsconfig =", cfsConfigFile);

    await browser.openResources(path.join(cfsConfigFile));
    console.log("Opened .cfsconfig file in editor");
    //view = new WebView();

    //---  When I switch to the webview frame to see loaded cfsconfig file---
    await view.switchToFrame();
    await UIUtils.sleep(200);

    //--- When I click on peripheral tab on cfsconfig file webview---
    await UIUtils.clickElement(view, peripheralTab);

    //--- Then I check for externally managed label on peripheral card container for other core on UI(RISC-V)---
    const externallyManagedBadge = await UIUtils.findWebElement(
      view,
      locatorspath.externallyManagedLabel,
    );
    expect(await externallyManagedBadge.getText()).to.include(
      "Externally managed",
    );
    console.log(
      "Externally managed label is present on peripheral card container for other core",
    );
  });

  it("Verify the externally managed is present in persistence of cfsconfig file", async () => {
    // --- Given I have parsed the cfsconfig file from the created workspace---
    const cfsConfigData = parseJSONFile(cfsConfigFile);

    // --- When I check the Projects array for RISC-V core---
    // --- Then check for externally managed attribute is true in persistence for RISC-V core---
    cfsConfigData.Projects.forEach((project: any) => {
      if (project.CoreId === "RV") {
        expect(project.ExternallyManaged).to.be.true;
        console.log(
          "Verified IsExternallyManaged is true for RV core in cfsconfig file",
        );
      }
    });
  });
}).timeout(120000);
