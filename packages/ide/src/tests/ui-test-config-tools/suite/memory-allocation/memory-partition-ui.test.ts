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

import { By, VSBrowser, WebView, Workbench } from "vscode-extension-tester";
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
  getBaseBlockOption,
  createPartitionButton,
  physicalStartAddress,
  setPhysicalStartAddress,
} from "../../page-objects/memory-allocation-section/create-partition-sidebar";

import {
  chosenControlInput,
  partitionSidebarCloseButton,
  pluginOptionsHeader,
  physicalStartAddressError,
  cm33SecureAddressError,
  sizeStepperError,
  partitionDetailsChevron,
  getEditPartitionButton,
} from "../../page-objects/memory-allocation-section/memory-allocation-screen";
import { memoryAllocationTab } from "../../page-objects/main-menu";
import { expect } from "chai";

describe("Verifying the base block value retention on clicking edit partition and pattern plugin validation", () => {
  const configPath = getConfigPathForFile("max32657-wlp-trustzone.cfsconfig");
  const baseBlockName = "sysram2";

  let workbench: Workbench;
  let browser: VSBrowser;
  let view: WebView;

  before(async () => {
    browser = VSBrowser.instance;
    workbench = new Workbench();

    await new Workbench().executeCommand("workbench.action.closeAllEditors");
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
    await UIUtils.clickElement(view, memoryAllocationTab);

    //   And I click on create partition button
    await UIUtils.clickElement(view, createPartitionButton);

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
    await UIUtils.clickElement(view, await partitionDetailsChevron(1));

    //   And I click the edit button
    await UIUtils.clickElement(view, await getEditPartitionButton(1));

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
    // await UIUtils.clickElement(view, await partitionDetailsChevron(1));

    //     And I click the edit button for the existing partition
    await UIUtils.clickElement(view, await getEditPartitionButton(1));

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
    // await UIUtils.clickElement(view, await partitionDetailsChevron(1));

    //   And I click on create partition button
    await UIUtils.clickElement(view, createPartitionButton);

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
  const configPath2 = getConfigPathForFile("sharcfx_core.cfsconfig");

  let workbench: Workbench;
  let browser: VSBrowser;
  let view: WebView;

  before(async () => {
    browser = VSBrowser.instance;
    workbench = new Workbench();
    await new Workbench().executeCommand("workbench.action.closeAllEditors");
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
    await UIUtils.clickElement(view, memoryAllocationTab);

    //   And I click on create partition button
    await UIUtils.clickElement(view, createPartitionButton);

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

    const startAddressBlock1 = await UIUtils.findWebElement(
      view,
      physicalStartAddress,
    );
    console.log("Start address input field is displayed");

    const startAddressValueBlock1 = await UIUtils.getAttributeFromWebElement(
      startAddressBlock1,
      "value",
    );
    expect(
      startAddressValueBlock1,
      "Physical start address should be auto-populated after selecting a base block",
    ).to.not.be.empty;

    const startAddressValueBlock2 = await UIUtils.findWebElement(
      view,
      By.css("[data-test*='software-start-address-FX-SHARC_FX_L1_DRAM'] input"),
    );

    const softwareStartAddressValue =
      await startAddressValueBlock2.getAttribute("value");

    expect(
      softwareStartAddressValue,
      "Software start address should be auto-populated after selecting a base block",
    ).to.not.be.empty;

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

describe("Verifying the memory partition cannot be created with overlapping addresses", () => {
  const configPath = getConfigPathForFile("max32657-wlp-trustzone.cfsconfig");
  const flashBaseBlockName = "flash0";
  const ramBaseBlockName = "sysram0";

  let workbench: Workbench;
  let browser: VSBrowser;
  let view: WebView;

  before(async function () {
    browser = VSBrowser.instance;
    workbench = new Workbench();
    view = new WebView();
    await new Workbench().executeCommand("workbench.action.closeAllEditors");
  });

  after(async function () {
    await view.switchBack();
    const wb = new Workbench();
    await wb.wait();
    await wb.executeCommand("revert and close editor");
  });

  // Scenario: Prevent creating a Flash partition when its address range overlaps an existing partition
  //   Given I open the configuration file "max32657-wlp-trustzone.cfsconfig"
  //   And I dismiss all notifications
  //   And I wait for the memory allocation webview to load
  //   When I switch to the webview frame
  //   And I click on the Memory menu
  //   And I click on the create partition button
  //   And I select "Flash" from the memory type dropdown
  //   And I verify the memory type dropdown value is "Flash"
  //   And I set the partition name to "testpartition"
  //   And I assign the core "CM33 secure"
  //   And I select base block "flash0"
  //   And I set the size to "64"
  //   And I click the "Create Configured Partition" button
  //   And I click on the create partition button again
  //   And I select "Flash" from the memory type dropdown
  //   And I verify the memory type dropdown value is "Flash"
  //   And I set the partition name to "testpartition2"
  //   And I assign the core "CM33 secure"
  //   And I select base block "flash0"
  //   And I overwrite the physical start address with "1000000"
  //   And I set the size to "64"
  //   And I click the "Create Configured Partition" button
  //   Then the physical start address error should be "Address overlaps with another partition"
  //   And the CM33 secure address error should be "Address overlaps with another partition"
  //   And the size error should be "Size extends into existing partition"

  it("Verify that error message is displayed when creating partition with overlapping addresses - Memory Type Flash", async () => {
    await browser.openResources(configPath);
    console.log("Opened the cfsconfig file");

    //   And I dismiss all notifications
    await UIUtils.dismissAllNotifications(workbench, browser);
    view = new WebView();
    view = await view.wait();

    //   And I switch to the webview frame
    await view.switchToFrame();

    //   And I click on the Memory menu
    await UIUtils.clickElement(view, memoryAllocationTab);

    //   And I click on create partition button
    await UIUtils.clickElement(view, createPartitionButton);

    //   And I select "Flash" from the memory type dropdown
    await UIUtils.selectOptionFromDropdown(
      view,
      memoryTypeDropdown,
      await memoryTypeSelector("Flash"),
    );

    //   And I verify the memory type dropdown value is "Flash"
    const memoryValue = await UIUtils.getAttributeFromWebElement(
      await UIUtils.findWebElement(view, memoryTypeDropdown),
      "current-value",
    );
    expect(memoryValue).to.equal("Flash");

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
      await getBaseBlockOption(flashBaseBlockName),
    );

    //   And I set the size to "64"
    await UIUtils.sendKeysToElements(view, sizeStepper, "64");

    //   And I click the "Create Configured Partition" button
    await UIUtils.clickElement(view, createConfiguredPartition);

    // Create another partition with same address
    await UIUtils.clickElement(view, createPartitionButton);

    //   And I select "Flash" from the memory type dropdown
    await UIUtils.selectOptionFromDropdown(
      view,
      memoryTypeDropdown,
      await memoryTypeSelector("Flash"),
    );

    //   And I verify the memory type dropdown value is "Flash"
    const memoryValueSelect = await UIUtils.getAttributeFromWebElement(
      await UIUtils.findWebElement(view, memoryTypeDropdown),
      "current-value",
    );
    expect(memoryValueSelect).to.equal("Flash");

    //   And I set the partition name to "testpartition"
    await UIUtils.clickElement(view, partitionNameTextBox);
    await UIUtils.sendKeysToElements(
      view,
      partitionNameTextBox,
      "testpartition2",
    );

    //   And I click on assigned cores dropdown and select "CM33 secure" option
    await assignCores(view, cores);

    //   And I click on base block dropdown and select "sysram2" option
    await UIUtils.selectOptionFromDropdown(
      view,
      baseBlockDropdown,
      await getBaseBlockOption(flashBaseBlockName),
    );

    //   And I overwrite the physical start address with "1000000"
    await setPhysicalStartAddress(view, "1000000");

    //   And I set the size to "64"
    await UIUtils.sendKeysToElements(view, sizeStepper, "64");

    //   And I click the "Create Configured Partition" button
    await UIUtils.clickElement(view, createConfiguredPartition);

    const physicalAddressErrorElement = await UIUtils.findWebElement(
      view,
      physicalStartAddressError,
    );
    const cm33SecureAddressErrorElement = await UIUtils.findWebElement(
      view,
      cm33SecureAddressError,
    );
    const sizeErrorElement = await UIUtils.findWebElement(
      view,
      sizeStepperError,
    );

    // Validating the error messages for overlapping addresses
    expect(
      await physicalAddressErrorElement.getText(),
      "Error message for physical start address should be displayed",
    ).to.equal("Address overlaps with another partition");
    expect(
      await cm33SecureAddressErrorElement.getText(),
      "Error message for CM33 secure start address should be displayed",
    ).to.equal("Address overlaps with another partition");

    // Validate the size error message for overlapping partitions
    expect(
      await sizeErrorElement.getText(),
      "Error message for size should be displayed",
    ).to.equal("Size extends into existing partition");
  });

  // Scenario: Prevent creating a RAM partition when its address range overlaps an existing partition
  //   Given the overlapping-address validation flow is already open in memory allocation
  //   And I close the current partition sidebar
  //   When I click on the Memory menu
  //   And I click on the create partition button
  //   And I select "RAM" from the memory type dropdown
  //   And I verify the memory type dropdown value is "RAM"
  //   And I set the partition name to "RAMtestpartition"
  //   And I assign the core "CM33 secure"
  //   And I select base block "sysram0"
  //   And I set the size to "16"
  //   And I click the "Create Configured Partition" button
  //   And I click on the create partition button again
  //   And I select "RAM" from the memory type dropdown
  //   And I verify the memory type dropdown value is "RAM"
  //   And I set the partition name to "RAMtestpartition2"
  //   And I assign the core "CM33 secure"
  //   And I select base block "sysram0"
  //   And I overwrite the physical start address with "20000000"
  //   And I set the size to "16"
  //   And I click the "Create Configured Partition" button
  //   Then the physical start address error should be "Address overlaps with another partition"
  //   And the CM33 secure address error should be "Address overlaps with another partition"
  //   And the size error should be "Size extends into existing partition"

  it("Verify that error message is displayed when creating partition with overlapping addresses - Memory Type RAM", async () => {
    //     And I click on close partition sidebar button
    await UIUtils.clickElement(view, partitionSidebarCloseButton);

    //   And I click on the Memory menu
    await UIUtils.clickElement(view, memoryAllocationTab);

    //   And I click on create partition button
    await UIUtils.clickElement(view, createPartitionButton);

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
      "RAMtestpartition",
    );

    //   And I click on assigned cores dropdown and select "CM33 secure" option
    const cores: string[] = ["multiselect-option-CM33-secure"];
    await assignCores(view, cores);

    //   And I click on base block dropdown and select "sysram2" option
    await UIUtils.selectOptionFromDropdown(
      view,
      baseBlockDropdown,
      await getBaseBlockOption(ramBaseBlockName),
    );

    //   And I set the size to "16KB"
    await UIUtils.sendKeysToElements(view, sizeStepper, "16");

    //   And I click the "Create Configured Partition" button
    await UIUtils.clickElement(view, createConfiguredPartition);

    // Create another partition with same address
    await UIUtils.clickElement(view, createPartitionButton);

    //   And I select "RAM" from the memory type dropdown
    await UIUtils.selectOptionFromDropdown(
      view,
      memoryTypeDropdown,
      await memoryTypeSelector("RAM"),
    );

    //   And I verify the memory type dropdown value is "RAM"
    const memoryValueSelect = await UIUtils.getAttributeFromWebElement(
      await UIUtils.findWebElement(view, memoryTypeDropdown),
      "current-value",
    );
    expect(memoryValueSelect).to.equal("RAM");

    //   And I set the partition name to "testpartition"
    await UIUtils.clickElement(view, partitionNameTextBox);
    await UIUtils.sendKeysToElements(
      view,
      partitionNameTextBox,
      "RAMtestpartition2",
    );

    //   And I click on assigned cores dropdown and select "CM33 secure" option
    await assignCores(view, cores);

    //   And I click on base block dropdown and select "sysram2" option
    await UIUtils.selectOptionFromDropdown(
      view,
      baseBlockDropdown,
      await getBaseBlockOption(ramBaseBlockName),
    );

    //   And I overwrite the physical start address with "20000000"
    await setPhysicalStartAddress(view, "20000000");

    //   And I set the size to "16KB"
    await UIUtils.sendKeysToElements(view, sizeStepper, "16");

    //   And I click the "Create Configured Partition" button
    await UIUtils.clickElement(view, createConfiguredPartition);

    const physicalAddressErrorElement = await UIUtils.findWebElement(
      view,
      physicalStartAddressError,
    );
    const cm33SecureAddressErrorElement = await UIUtils.findWebElement(
      view,
      cm33SecureAddressError,
    );
    const sizeErrorElement = await UIUtils.findWebElement(
      view,
      sizeStepperError,
    );

    // Validating the error messages for overlapping addresses
    expect(
      await physicalAddressErrorElement.getText(),
      "Error message for physical start address should be displayed",
    ).to.equal("Address overlaps with another partition");
    expect(
      await cm33SecureAddressErrorElement.getText(),
      "Error message for CM33 secure start address should be displayed",
    ).to.equal("Address overlaps with another partition");

    // Validate the size error message for overlapping partitions
    expect(
      await sizeErrorElement.getText(),
      "Error message for size should be displayed",
    ).to.equal("Size extends into existing partition");
  });
});
describe("disables a base block option when its memory is fully allocated and throw error when using same allocated memory", () => {
  const configPath = getConfigPathForFile("sharcfx_core.cfsconfig");

  let workbench: Workbench;
  let browser: VSBrowser;
  let view: WebView;

  before(async () => {
    browser = VSBrowser.instance;
    workbench = new Workbench();
    await new Workbench().executeCommand("workbench.action.closeAllEditors");
  });

  after(async () => {
    if (view) {
      await view.switchBack();
      await new Workbench().executeCommand("revert and close editor");
    }
  });

  //   Scenario: Verify that a base block is disabled in the dropdown when fully allocated and overlapping addresses show error
  //     Given I open the configuration file "sharcfx_core.cfsconfig"
  //     And I dismiss all notifications
  //     And I wait for the memory allocation webview to load
  //     When I switch to the webview frame
  //     And I click on the Memory menu
  //     And I click on create partition button
  //     And I select "RAM" from the memory type dropdown
  //     And I verify the memory type dropdown value is "RAM"
  //     And I set the partition name to "baseblock"
  //     And I assign the core "SHARC-FX"
  //     And I verify the permission label is displayed for SHARC-FX
  //     And I select base block "L2_SRAM"
  //     And I set the size to "2" MB
  //     And I click the "Create Configured Partition" button
  //     And I click on the create partition button again
  //     And I select "RAM" from the memory type dropdown
  //     And I set the partition name to "baseblock1"
  //     And I assign the core "SHARC-FX"
  //     And I open the base block dropdown
  //     Then the L2_SRAM option should be disabled in the dropdown
  //     And the L2_SRAM option should have aria-disabled="true"
  //     When I select base block "ARM_L1_DRAM"
  //     And I overwrite the physical start address with "0x20000000"
  //     And I click the "Create Configured Partition" button
  //     Then the physical start address error should be "Address overlaps with another partition" appear

  it("Verify in memory partition the base block should be blocked if the whole memory is already been allocated", async () => {
    await browser.openResources(configPath);
    console.log("Opened the sharcfx_core.cfsconfig file");
    //   And I dismiss all notifications
    await UIUtils.dismissAllNotifications(workbench, browser);
    view = new WebView();
    view = await view.wait();
    //   And I switch to the webview frame
    await view.switchToFrame();

    //   And I click on the Memory menu
    await UIUtils.clickElement(view, memoryAllocationTab);

    //   And I click on create partition button
    await UIUtils.clickElement(view, createPartitionButton);

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

    //   And I set the partition name to "baseblock"
    await UIUtils.clickElement(view, partitionNameTextBox);
    await UIUtils.sendKeysToElements(view, partitionNameTextBox, "baseblock");

    //   And I click on assigned cores dropdown and select "SHARC-FX" option
    const cores: string[] = ["multiselect-option-FX"];
    await assignCores(view, cores);

    //   And I verify the permission label is displayed for SHARC-FX
    const permissionLabelSharcFx = await UIUtils.findWebElement(
      view,
      By.css("[data-test='permission-label-FX']"),
    );
    expect(await permissionLabelSharcFx.isDisplayed()).to.be.true;

    //   And I click on base block dropdown and select "L2_SRAM" option
    await UIUtils.selectOptionFromDropdown(
      view,
      baseBlockDropdown,
      await getBaseBlockOption("L2_SRAM"),
    );

    //   And I set the size to "2"
    await UIUtils.sendKeysToElements(view, sizeStepper, "2");

    await UIUtils.selectOptionFromDropdown(
      view,
      By.css("[data-test='size-dropdown']"),
      By.id("_MB"),
    );

    await UIUtils.clickElement(view, createConfiguredPartition);

    await UIUtils.clickElement(view, createPartitionButton);

    //   And I select "RAM" from the memory type dropdown
    await UIUtils.selectOptionFromDropdown(
      view,
      memoryTypeDropdown,
      await memoryTypeSelector("RAM"),
    );

    await UIUtils.clickElement(view, partitionNameTextBox);
    await UIUtils.sendKeysToElements(view, partitionNameTextBox, "baseblock1");

    //   And I click on assigned cores dropdown and select "SHARC-FX" option
    const cores1: string[] = ["multiselect-option-FX"];
    await assignCores(view, cores1);

    //   And I click on base block dropdown to open it
    await UIUtils.clickElement(view, baseBlockDropdown);

    //   And I verify L2_SRAM option is disabled in the dropdown
    const l2SramOption = await UIUtils.findWebElement(
      view,
      By.css('vscode-option[data-test="L2_SRAM"]'),
    );

    const isDisabled = await l2SramOption.getAttribute("disabled");
    expect(
      isDisabled,
      "L2_SRAM option should be disabled after being used in first partition",
    ).to.not.be.null;

    const ariaDisabled = await l2SramOption.getAttribute("aria-disabled");
    expect(
      ariaDisabled,
      "L2_SRAM option should have aria-disabled='true'",
    ).to.equal("true");

    await UIUtils.selectOptionFromDropdown(
      view,
      baseBlockDropdown,
      await getBaseBlockOption("ARM_L1_DRAM"),
    );

    //   And I overwrite the physical start address with "0x20000000"
    await setPhysicalStartAddress(view, "0x20000000");

    await UIUtils.clickElement(view, createConfiguredPartition);

    await UIUtils.waitForElementToBeVisible(
      view,
      By.css("[data-test='start-address-error']"),
    );
    const errorValue = await UIUtils.findWebElement(
      view,
      By.css("[data-test='start-address-error']"),
    );

    const errorText = await errorValue.getText();

    expect(
      errorText,
      "Error message for physical start address should be displayed",
    ).to.equal("Address overlaps with another partition");
  });
});
