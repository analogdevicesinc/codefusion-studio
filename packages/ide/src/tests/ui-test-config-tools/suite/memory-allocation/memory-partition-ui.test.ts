/**
 *
 * Copyright (c) 2025-2026 Analog Devices, Inc.
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

// Feature: Editing a partition and validating base block value retention and pattern plugin validation
//   As a user
//   I want to verify the base block value is retained if not edited when editing a partition and its validation with pattern plugin
//   So that the partition properties are updated correctly

//   Background:
//     Given VS Code is open
//     And all editors are closed
//     And the CFS configuration file "max32657-wlp-trustzone.cfsconfig" exists

import {
  By,
  VSBrowser,
  EditorView,
  WebView,
  Workbench,
} from "vscode-extension-tester";
import { Locatorspaths } from "../../pageObjectsConfig/memory-page-objects";
import { UIUtils } from "../../../ui-test-utils/ui-utils";
import { getConfigPathForFile } from "../../config-tools-utility/cfsconfig-utils";
import {
  memoryTypeDropdown,
  memoryTypeSelector,
  partitionNameTextBox,
  assignCores,
  baseBlockDropdown,
  createConfiguredPartition,
  sizeStepper,
} from "../../page-objects/memory-allocation-section/create-partition-sidebar";

import {
  getBaseBlockOption,
  chosenControlInput,
  partitionSidebarCloseButton,
  pluginOptionsHeader,
} from "../../page-objects/memory-allocation-section/memory-allocation-screen";
import { expect } from "chai";

describe("Verifying the base block value retention on clicking edit partition and pattern plugin validation", () => {
  const locatorspath = new Locatorspaths();
  const configPath = getConfigPathForFile("max32657-wlp-trustzone.cfsconfig");
  const baseBlockName = "sysram2";

  let workbench: Workbench;
  let browser: VSBrowser;
  let view: WebView;

  before(async () => {
    browser = VSBrowser.instance;
    workbench = new Workbench();

    await new EditorView().closeAllEditors();
    await UIUtils.sleep(3000);
  });

  after(async () => {
    if (view) {
      await view.switchBack();
      await new Workbench().executeCommand("revert and close editor");
    }
  });

  //   Scenario: Edit a  partition and validate base block value is retained if not edited
  //     When I open the configuration file "max32657-wlp-trustzone.cfsconfig"
  //     And I dismiss all notifications
  //     And I switch to the webview frame
  //     And I click on the Memory menu
  //     And I click on create partition button
  //     And I select "RAM" from the memory type dropdown
  //     And I verify the memory type dropdown value is "RAM"
  //     And I set the partition name to "testpartition"
  //     And I click on assigned cores dropdown and select "CM33 secure"
  //     And I click on base block dropdown and select "sysram2" option
  //     And I set the size to "64"
  //     And I click the "Create Configured Partition" button
  //     And I expand the partition details for partition index 1
  //     And I expand the partition dropdown
  //     And I click the  edit button
  //     And I verify the base block dropdown value is "sysram2"

  it("Verify that the base block value is retained when editing a partition along with pattern plugin validation", async () => {
    // Scenario 1: Edit a partition and validate base block value is retained if not edited.
    //   When I open the configuration file "max32657-wlp-trustzone.cfsconfig"
    await browser.openResources(configPath);
    console.log("Opened the cfsconfig file");

    //   And I dismiss all notifications
    await UIUtils.dismissAllNotifications(workbench, browser);
    view = new WebView();
    view = await view.wait();
    console.log("max32657-wlp-trustzone UI loaded");

    //   And I switch to the webview frame
    await view.switchToFrame();

    //   And I click on the Memory menu
    await UIUtils.clickElement(view, locatorspath.memoryMenu);

    //   And I click on create partition button
    await UIUtils.clickElement(view, locatorspath.createPartitionButton);

    //   And I select "RAM" from the memory type dropdown
    await UIUtils.selectOptionFromDropdown(
      view,
      memoryTypeDropdown,
      await memoryTypeSelector("RAM"),
    );

    //   And I verify the memory type dropdown value is "RAM"
    const memoryValue = await UIUtils.getAttributeFromWebElement(
      await UIUtils.findWebElement(view, memoryTypeDropdown),
      "current-value",
    );
    expect(memoryValue).to.equal("RAM");

    //   And I set the partition name to "testpartition"
    await UIUtils.clickElement(view, partitionNameTextBox);
    await UIUtils.sendKeysToElements(
      view,
      partitionNameTextBox,
      "testpartition",
    );

    //   And I click on assigned cores dropdown and select "CM33 secure" option
    const cores: string[] = ["multiselect-option-CM33-secure"];
    await assignCores(view, cores);

    //   And I click on base block dropdown and select "sysram2" option
    await UIUtils.selectOptionFromDropdown(
      view,
      baseBlockDropdown,
      await getBaseBlockOption(baseBlockName),
    );

    //   And I set the size to "64"
    await UIUtils.sendKeysToElements(view, sizeStepper, "64");

    //   And I click the "Create Configured Partition" button
    await UIUtils.clickElement(view, createConfiguredPartition);

    //   And I expand the partition details for partition index 1
    await UIUtils.clickElement(view, locatorspath.partitionDetailsChevron(1));

    //   And I click the edit button
    await UIUtils.clickElement(view, locatorspath.getEditPartitionButton(1));

    //   And I verify the base block dropdown value is "sysram2"
    await UIUtils.clickElement(view, baseBlockDropdown);
    const valuebase = await UIUtils.getAttributeFromWebElement(
      await UIUtils.findWebElement(view, baseBlockDropdown),
      "current-value",
    );
    expect(valuebase).to.equal(baseBlockName);

    console.log(
      " For ticket CFSIO-5173-Add Pattern plugin validation on Memory config ",
    );
    //   Scenario: Edit a  partition and validate base block value is retained if not edited
    //     When I click on partition sidebar close button
    //     And I click the edit button for the existing partition
    //     And I enter "Test space not allowed" in the core name input field in edit partition form
    //     And I dismiss all notifications
    //     And I switch to the webview frame
    //     And I click on the Memory menu
    //     And I enter "Test space not allowed" in the core name input field in edit partition form
    //      | CoreName              |
    //    | Test space not allowed |
    //     And I click the "Update Partition" button
    //     Then an error message should be displayed indicating invalid format for core name
    //     And user should remain on the same edit partition sidebar

    //     And I close the current partition sidebar
    await UIUtils.clickElement(view, partitionSidebarCloseButton);
    // await UIUtils.clickElement(view, locatorspath.partitionDetailsChevron(1));

    //     And I click the edit button for the existing partition
    await UIUtils.clickElement(view, locatorspath.getEditPartitionButton(1));

    //     And I enter "Test space not allowed" in the core name input field in edit partition form
    await UIUtils.clickElement(view, chosenControlInput);
    await UIUtils.sendKeysToElements(
      view,
      chosenControlInput,
      "Test space not allowed",
    );

    //     Then an error message should be displayed indicating invalid format for core name
    const errorElement = await UIUtils.findWebElement(
      view,
      By.css("[data-test='plugin-options-form:control-CHOSEN-error']"),
    );
    const isErrorDisplayed = await errorElement.isDisplayed();
    expect(isErrorDisplayed).to.be.true;
    console.log("Error message displayed for invalid input");

    //     And I click the "Update Partition" button
    await UIUtils.clickElement(view, createConfiguredPartition);

    //     And user should remain on the same edit partition sidebar
    const editFormStillVisible = await UIUtils.findWebElement(
      view,
      chosenControlInput,
    );
    expect(
      await editFormStillVisible.isDisplayed(),
      "Expected edit partition sidebar to remain visible after invalid input",
    ).to.be.true;
    console.log("User remains on the same edit partition sidebar");
  });

  it("Verify secure and non-secure badges are displayed when the pattern plugin is applied", async () => {
    //   Scenario: Create a partition, verify secure and non-secure badges are displayed when the pattern plugin is applied, and validate the same in partition details view
    //     And I click on close partition sidebar button
    //     And I click on create partition button
    //     And I select "RAM" from the memory type dropdown
    //     And I verify the memory type dropdown value is "RAM"
    //     And I setthe partition name to "testpartitionnew"
    //     And I click on assigned cores dropdown and select "CM33 secure" option and "CM33 non secure" options
    //     Then I verify the secure and non-secure badges are displayed for plugin options
    //     And I click on base block dropdown and select "sysram1" option
    //     And I set the size to "32"
    //     And I click the "Create Configured Partition" button
    //     Then I verify the secure and non-secure badges are displayed in partition details view for both projects

    //     And I click on close partition sidebar button
    await UIUtils.clickElement(view, partitionSidebarCloseButton);
    // await UIUtils.clickElement(view, locatorspath.partitionDetailsChevron(1));

    //   And I click on create partition button
    await UIUtils.clickElement(view, locatorspath.createPartitionButton);

    //   And I select "RAM" from the memory type dropdown
    await UIUtils.selectOptionFromDropdown(
      view,
      memoryTypeDropdown,
      await memoryTypeSelector("RAM"),
    );

    //   And I verify the memory type dropdown value is "RAM"
    const memoryValue = await UIUtils.getAttributeFromWebElement(
      await UIUtils.findWebElement(
        view,
        By.css("[data-test='memory-type-dropdown']"),
      ),
      "current-value",
    );
    expect(memoryValue).to.equal("RAM");

    //   And I set the partition name to "testpartition"
    await UIUtils.clickElement(view, partitionNameTextBox);
    await UIUtils.sendKeysToElements(
      view,
      partitionNameTextBox,
      "testpartitionnew",
    );

    //   And I click on assigned cores dropdown and select "CM33 secure" option
    const cores: string[] = [
      "multiselect-option-CM33-secure",
      "multiselect-option-CM33-nonsecure",
    ];
    await assignCores(view, cores);
    //     Then I verify the secure and non-secure badges are displayed for plugin options

    const securePlugin = await UIUtils.findWebElement(
      view,
      await pluginOptionsHeader(1),
    );

    const getSecureBadge = await securePlugin.findElement(
      By.css("vscode-badge"),
    );

    const secureBadgeText = await getSecureBadge.getText();
    expect(secureBadgeText).to.include("S");

    const nonSecurePlugin = await UIUtils.findWebElement(
      view,
      await pluginOptionsHeader(2),
    );
    const getNonSecureBadge = await nonSecurePlugin.findElement(
      By.css("vscode-badge"),
    );
    const nonSecureBadgeText = await getNonSecureBadge.getText();
    expect(nonSecureBadgeText).to.include("NS");

    //   And I click on base block dropdown and select "sysram1" option
    await UIUtils.selectOptionFromDropdown(
      view,
      baseBlockDropdown,
      await getBaseBlockOption("sysram1"),
    );

    //   And I set the size to "32"
    await UIUtils.sendKeysToElements(view, sizeStepper, "32");

    //   And I click the "Create Configured Partition" button
    await UIUtils.clickElement(view, createConfiguredPartition);

    //     Then I verify the secure and non-secure badges are displayed in partition details view for both projects
    const driver = view.getDriver();

    const badges = await driver.findElements(
      By.css("#memoryCardContainer section > div:nth-child(2) vscode-badge"),
    );
    expect(
      badges.length,
      "Expected secure and non-secure badges to be displayed in partition details view",
    ).to.be.at.least(2);

    const sBadge = await badges[0].getText();
    const nsBadge = await badges[1].getText();

    //     And I validate secure/non-secure badge values in partition details view
    expect(sBadge).to.include("(S)");
    expect(nsBadge).to.include("(NS)");

    console.log(
      "Secure and Non Secure badges are displayed as expected in partition details view when pattern plugin is applied and under Plugin options as well",
    );
  });
});

describe("Verifying SHARC-FX partition size validation", () => {
  const locatorspath = new Locatorspaths();
  const configPath2 = getConfigPathForFile("sharcfx_core.cfsconfig");

  let workbench: Workbench;
  let browser: VSBrowser;
  let view: WebView;

  before(async () => {
    browser = VSBrowser.instance;
    workbench = new Workbench();
    await new EditorView().closeAllEditors();
  });

  after(async () => {
    if (view) {
      await view.switchBack();
      await new Workbench().executeCommand("revert and close editor");
    }
  });

  //   Scenario: Create a partition, verify the memory size exceeds should not allow the user to create partition
  //     When I open the configuration file "sharcfx_core.cfsconfig"
  //     And I dismiss all notifications
  //     And I switch to the webview frame
  //     And I click on the Memory menu
  //     And I click on create partition button
  //     And I select "RAM" from the memory type dropdown
  //     And I verify the memory type dropdown value is "RAM"
  //     And I set the partition name to "sharcfxpartition"
  //     And I click on assigned cores project as "SHARC-FX"
  //     And I click on base block dropdown and select "SHARC_FX_L1_DRAM" option
  //     And I set the size to "2048"
  //     And I click the "Create Configured Partition" button
  //     Then an error message should be displayed indicating memory size exceeds available memory for the selected base block
  //     And user should remain on the same partition sidebar

  it("Verify that partition size exceeds available memory should not allow the user to create partition", async () => {
    //   When I open the configuration file "sharcfx_core.cfsconfig"
    await browser.openResources(configPath2);
    console.log("Opened the sharcfx_core.cfsconfig file");

    //   And I dismiss all notifications
    await UIUtils.dismissAllNotifications(workbench, browser);
    view = new WebView();
    view = await view.wait();

    //   And I switch to the webview frame
    await view.switchToFrame();

    //   And I click on the Memory menu
    await UIUtils.clickElement(view, locatorspath.memoryMenu);

    //   And I click on create partition button
    await UIUtils.clickElement(view, locatorspath.createPartitionButton);

    //   And I select "RAM" from the memory type dropdown
    await UIUtils.selectOptionFromDropdown(
      view,
      memoryTypeDropdown,
      await memoryTypeSelector("RAM"),
    );

    //   And I verify the memory type dropdown value is "RAM"
    const memoryValue = await UIUtils.getAttributeFromWebElement(
      await UIUtils.findWebElement(view, memoryTypeDropdown),
      "current-value",
    );
    expect(memoryValue).to.equal("RAM");

    //   And I set the partition name to "sharcfxpartition"
    await UIUtils.clickElement(view, partitionNameTextBox);
    await UIUtils.sendKeysToElements(
      view,
      partitionNameTextBox,
      "sharcfxpartition",
    );

    //   And I click on assigned cores dropdown and select "SHARC-FX" option
    const cores: string[] = ["multiselect-option-FX"];
    await assignCores(view, cores);

    //   And I verify the permission label is displayed for SHARC-FX
    const permissionLabelSharcFx = await UIUtils.findWebElement(
      view,
      By.css("[data-test='permission-label-FX']"),
    );
    expect(await permissionLabelSharcFx.isDisplayed()).to.be.true;

    //   And I click on base block dropdown and select "SHARC_FX_L1_DRAM" option
    await UIUtils.selectOptionFromDropdown(
      view,
      baseBlockDropdown,
      await getBaseBlockOption("SHARC_FX_L1_DRAM"),
    );

    //   And I set the size to "2048"
    await UIUtils.sendKeysToElements(view, sizeStepper, "2048");

    //   And I click the "Create Configured Partition" button
    await UIUtils.clickElement(view, createConfiguredPartition);

    //   Then an error message should be displayed indicating memory size exceeds available memory for the selected base block
    const errorElement = await UIUtils.findWebElement(
      view,
      By.css("[data-test='size-stepper-error']"),
    );
    expect(await errorElement.isDisplayed()).to.be.true;

    //   And user should remain on the same partition sidebar
    const createPartitionTitle = await UIUtils.findWebElement(
      view,
      By.css("[data-test='partition-title']"),
    );
    expect(
      await createPartitionTitle.isDisplayed(),
      "Expected partition sidebar to remain visible after invalid input",
    ).to.be.true;
    console.log("User remains on the partition sidebar");
  });
});
