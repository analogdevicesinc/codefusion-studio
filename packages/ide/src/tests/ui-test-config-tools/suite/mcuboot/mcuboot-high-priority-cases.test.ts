/**
 *
 * Copyright (c) 2026 Analog Devices, Inc.
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

import { expect } from "chai";
import { VSBrowser, WebView, Workbench } from "vscode-extension-tester";

import { UIUtils } from "../../../ui-test-utils/ui-utils";
import {
  getConfigPathForFile,
  parseJSONFile,
  getMCUBootTestDataPath,
} from "../../config-tools-utility/cfsconfig-utils";
import { clearAndSearch } from "../../page-objects/pin-config-section/pin-config-screen";
import {
  sidebar,
  packageCoreDropdown,
  editNameTrigger,
  packageNameInput,
  confirmButton,
  enabledToggle,
  signKeyDropdown,
  signKeyInheritOption,
  aesKwKeyInput,
  aesGcmKeyInput,
  customTlvCardHeader,
  customTlvNameField,
  tlvNameInput,
  tlvValueInput,
  tlvValueError,
  getAppPackItemByName,
  getCoreOptionByName,
  getImageSlotSizeInput,
  getImageHeaderSizeInput,
  expandImageDetails,
  setupMCUBootView,
} from "../../page-objects/mcuboot-section/mcuboot-screen";

/*
 * Feature: MCUBoot Application Pack Name and Description Persistence
 *     As a CodeFusion Studio user
 *     I want to edit application pack name and description
 *     So that my changes persist across file saves and reloads
 *
 * Background:
 *     Given VS Code is open with the CodeFusion Studio extension loaded
 *     And all editors are closed
 *     And all notifications are dismissed
 */

describe("MCUBoot Pack Name and Description Persistence", () => {
  const configFile = "mcuboot-config.cfsconfig";
  const configPath = getConfigPathForFile(configFile);

  let browser: VSBrowser;
  let workbench: Workbench;
  let view: WebView;

  const testPackName = "Test Application Package";
  const defaultName = "New App Pack 1";
  //const testPackDescription = "Test pack for MCUBoot persistence validation";

  before(async function () {
    ({ browser, workbench } = await UIUtils.setupTestSuite({ sleepMs: 2000 }));
  });

  afterEach(async function () {
    await UIUtils.teardownTestSuite(view);
  });

  after(async function () {
    // Tests build on each other's saved changes (the pack renamed in the first one), so restore the fixture only once, at the end.
    await UIUtils.restoreFixtureFileFromGit(configPath);
  });

  /**
   * Helper function to select an application package by name
   */
  async function selectAppPackage(packageName: string): Promise<void> {
    const sidebarElement = await UIUtils.findWebElement(view, sidebar);
    expect(sidebarElement, "MCUBoot sidebar should exist").to.exist;

    const appPackItem = await getAppPackItemByName(packageName);
    const appPackElement = await sidebarElement.findElement(appPackItem);
    expect(appPackElement, "App pack item should exist").to.exist;
    await appPackElement.click();
    await UIUtils.sleep(1000);
  }

  /**
   * Helper function to save and close the editor
   */
  async function saveAndCloseEditor(): Promise<void> {
    await view.switchBack();
    await workbench.executeCommand("workbench.action.files.save");
    await workbench.executeCommand("revert and close editor");
    await UIUtils.sleep(1000);
  }

  /*
   * Scenario: Edit application pack name and verify persistence
   *     Given the MCUBoot config file is opened
   *     And I dismiss all notifications
   *     And I switch to webview frame
   *     When I navigate to the MCUBoot Config tab
   *     And I select the first application package "New App Pack 1"
   *     And I verify the default core selection is "Core0"
   *     And I click on the edit name trigger to open the edit dialog
   *     And I enter the new pack name "Test Application Package" in the input field
   *     And I click the confirm button
   *     And I save the file
   *     And I close the editor
   *     Then the JSON file should contain Name: "Test Application Package"
   *     And the JSON file should contain Soc: "MCUTESTS"
   */
  it("Should persist application pack name changes @regression", async function () {
    // Given: The MCUBoot config file is opened
    // And: I dismiss all notifications and switch to webview frame
    view = await setupMCUBootView(configPath, browser);

    // When: I select the first application package "New App Pack 1"
    await selectAppPackage(defaultName);

    // And: I verify the default core selection is "Core0"
    const coreDropdown = await UIUtils.findWebElement(
      view,
      packageCoreDropdown,
    );
    const selectedCoreText = await coreDropdown.getAttribute("current-value");

    console.log("Default selected core:", selectedCoreText);
    expect(
      selectedCoreText,
      "Default selected core should be Primary Core",
    ).to.equal("Core0");

    // And: I click on the edit name trigger to open the edit dialog
    const editNameTriggerElement = await UIUtils.findWebElement(
      view,
      editNameTrigger,
    );
    expect(editNameTriggerElement, "Edit name trigger should exist").to.exist;
    await editNameTriggerElement.click();
    await UIUtils.sleep(500);

    // And: Enter the new pack name in the input field
    const nameInput = await UIUtils.findWebElement(view, packageNameInput);

    // Clear the existing value and enter the new name for package
    await clearAndSearch(nameInput, testPackName);

    // And: I click the confirm button
    const confirmBtn = await UIUtils.findWebElement(view, confirmButton);
    expect(confirmBtn, "Confirm button should exist").to.exist;
    await confirmBtn.click();
    await UIUtils.sleep(2000);

    // And: I save the file and close the editor
    await view.switchBack();
    await workbench.executeCommand("workbench.action.files.save");
    await workbench.executeCommand("revert and close editor");
    await UIUtils.sleep(1000);

    // Then: The JSON file should contain Name: "Test Application Package"
    const config = await parseJSONFile(configPath);

    // And: The JSON file should contain Soc: "MCUTESTS"
    expect(config.Soc, "SoC name should be MCUTESTS").to.equal("MCUTESTS");

    const applicationPackages = config.ApplicationPackages;
    expect(applicationPackages, "ApplicationPackages should exist in config").to
      .exist;

    const firstAppPack = applicationPackages.find(
      (pack: any) => pack.Name === testPackName,
    );
    expect(
      firstAppPack,
      `App pack with name "${testPackName}" should exist in JSON`,
    ).to.exist;
    expect(
      firstAppPack.Name,
      `JSON should contain Name "${testPackName}"`,
    ).to.equal(testPackName);
  }).timeout(90000);

  /*
   * Scenario: Toggle application pack enabled state and verify persistence
   *     Given the MCUBoot config file is opened
   *     And I navigate to the MCUBoot Config tab
   *     When I select the first application package "Test Application Package"
   *     And I verify the enabled toggle is initially checked (true)
   *     And I click on the enabled toggle to disable it
   *     And I save the file
   *     And I close the editor
   *     Then the JSON file should contain Enabled: false
   */
  it("Should persist application pack enable/disable toggle changes @regression", async function () {
    // Given: The MCUBoot config file is opened
    // And: I navigate to the MCUBoot Config tab
    view = await setupMCUBootView(configPath, browser);

    // When: I select the first application package "Test Application Package"
    const sidebarElement = await UIUtils.findWebElement(view, sidebar);
    expect(sidebarElement, "MCUBoot sidebar should exist").to.exist;

    const firstAppPackItem = await sidebarElement.findElement(
      await getAppPackItemByName(testPackName),
    );
    expect(firstAppPackItem, "First app pack item should exist").to.exist;
    await firstAppPackItem.click();
    await UIUtils.sleep(1000);

    // And: I verify the enabled toggle is initially checked (true)
    const enabledToggleElement = await UIUtils.findWebElement(
      view,
      enabledToggle,
    );
    expect(enabledToggleElement, "Enabled toggle should exist").to.exist;

    const toggleState = await enabledToggleElement.getAttribute("data-checked");
    expect(toggleState, "Enabled toggle should be initially checked").to.equal(
      "true",
    );

    // And: I click on the enabled toggle to disable it
    await enabledToggleElement.click();
    await UIUtils.sleep(2000);

    // And: I save the file
    // And: I close the editor
    await saveAndCloseEditor();

    // Then: The JSON file should contain Enabled: false
    const config = await parseJSONFile(configPath);
    const applicationPackages = config.ApplicationPackages;
    expect(applicationPackages, "ApplicationPackages should exist").to.exist;

    const firstAppPack = applicationPackages.find(
      (pack: any) => pack.Name === testPackName,
    );
    expect(firstAppPack, `App pack "${testPackName}" should exist`).to.exist;
    expect(
      firstAppPack.Enabled,
      "Enabled state should be false after toggle",
    ).to.equal(false);
  }).timeout(60000);

  /*
   * Scenario: Change application pack core selection and verify persistence
   *     Given the MCUBoot config file is opened
   *     And I navigate to the MCUBoot Config tab
   *     When I select the first application package
   *     And I verify the initial core selection is "Core0"
   *     And I click on the core dropdown
   *     And I select "Secondary Core 1" (Core1) from the dropdown
   *     And I save the file
   *     And I close the editor
   *     Then the core selection should persist with the new value "Core1"
   *     And the JSON file should contain CoreId: "Core1"
   */
  it("Should persist application pack core dropdown changes @regression", async function () {
    // Given: The MCUBoot config file is opened
    // And: I navigate to the MCUBoot Config tab
    view = await setupMCUBootView(configPath, browser);

    // When: I select the first application package
    const sidebarElement = await UIUtils.findWebElement(view, sidebar);
    expect(sidebarElement, "MCUBoot sidebar should exist").to.exist;

    const firstAppPackItem = await sidebarElement.findElement(
      await getAppPackItemByName(testPackName),
    );
    expect(firstAppPackItem, "App pack item should exist").to.exist;
    await firstAppPackItem.click();
    await UIUtils.sleep(1000);

    // And: I verify the initial core selection is "Core0"
    const coreDropdownElement = await UIUtils.findWebElement(
      view,
      packageCoreDropdown,
    );
    expect(coreDropdownElement, "Core dropdown should exist").to.exist;

    const initialCoreValue =
      await coreDropdownElement.getAttribute("current-value");
    expect(initialCoreValue, "Initial core should be Core0").to.equal("Core0");

    // And: I click on the core dropdown
    await coreDropdownElement.click();
    await UIUtils.sleep(500);

    // And: I select "Secondary Core 1" (Core1) from the dropdown
    const newCoreId = "Core1";
    const newCoreName = "Secondary Core 1";
    const coreOption = await UIUtils.findWebElement(
      view,
      await getCoreOptionByName(newCoreName),
    );
    expect(coreOption, `Core option "${newCoreName}" should exist`).to.exist;
    await coreOption.click();
    await UIUtils.sleep(1000);

    // And: I save the file
    // And: I close the editor
    await saveAndCloseEditor();

    // Then: The core selection should persist with the new value "Core1"
    // And: The JSON file should contain CoreId: "Core1"
    const config = await parseJSONFile(configPath);
    const applicationPackages = config.ApplicationPackages;
    expect(applicationPackages, "ApplicationPackages should exist").to.exist;

    const firstAppPack = applicationPackages.find(
      (pack: any) => pack.Name === testPackName,
    );
    expect(firstAppPack, `App pack "${testPackName}" should exist`).to.exist;
    expect(firstAppPack.CoreId, `CoreId should be ${newCoreId}`).to.equal(
      newCoreId,
    );
  }).timeout(60000);

  /*
   * Scenario: Change all image configuration properties and verify persistence
   *     Given the MCUBoot config file is opened
   *     And I navigate to the MCUBoot Config tab
   *     And I select the "Test Application Package"
   *     And I expand the image details section
   *     When I change the slot size to 8 MB (8388608 bytes)
   *     And I change the header size to 64 bytes
   *     And I scroll to and change the sign key to "Inherit from parent"
   *     And I enter the AES KW Key file path from test fixtures
   *     And I enter the AES GCM Key file path from test fixtures
   *     And I expand the Custom TLV card
   *     And I click on the Custom TLV name field to edit
   *     And I update the TLV name to "Updated TLV Name"
   *     And I press Enter to confirm the name change
   *     And I clear the TLV value field to trigger validation error
   *     And I verify the validation error appears
   *     And I enter a valid TLV value "NewTLVValue123"
   *     And I save the file
   *     And I close the editor
   *     Then the JSON file should contain SlotSize: 8388608
   *     And the JSON file should contain HeaderSize: 64
   *     And the JSON file should contain SignKey: "inherit"
   *     And the JSON file should contain AesKwKeyPath with normalized path
   *     And the JSON file should contain AesGcmKeyPath with normalized path
   *     And the JSON file should contain CustomTLVs with Name: "Updated TLV Name"
   *     And the JSON file should contain CustomTLVs with Value: "NewTLVValue123"
   */
  it("Should persist all image configuration changes @regression", async function () {
    // Given: The MCUBoot config file is opened
    view = await setupMCUBootView(configPath, browser);

    // And: I select the "Test Application Package"
    await selectAppPackage(testPackName);

    // And: I expand the image details section
    await expandImageDetails(view);

    // When: I change the slot size to 8 MB (8388608 bytes)
    const slotSizeInput = await UIUtils.findWebElement(
      view,
      await getImageSlotSizeInput("Image 1"),
    );
    expect(slotSizeInput, "Slot size input should exist").to.exist;
    await clearAndSearch(slotSizeInput, "8");
    await UIUtils.sleep(500);

    // And: I change the header size to 64 bytes
    const headerSizeInput = await UIUtils.findWebElement(
      view,
      await getImageHeaderSizeInput("Image 1"),
    );
    expect(headerSizeInput, "Header size input should exist").to.exist;
    await clearAndSearch(headerSizeInput, "64");
    await UIUtils.sleep(500);

    // And: I scroll to and change the sign key to "Inherit from parent"
    const signKeyDropdownElement = await UIUtils.findWebElement(
      view,
      signKeyDropdown,
    );
    expect(signKeyDropdownElement, "Sign key dropdown should exist").to.exist;

    await browser.driver.executeScript(
      "arguments[0].scrollIntoView({behavior: 'smooth', block: 'center'});",
      signKeyDropdownElement,
    );
    await UIUtils.sleep(1000);

    await UIUtils.selectOptionFromDropdown(
      view,
      signKeyDropdown,
      signKeyInheritOption,
    );
    await UIUtils.sleep(500);

    // And: I enter the AES KW Key file path from test fixtures
    const aesKwKeyPath = getMCUBootTestDataPath("aes-kw-key.bin");
    const aesKwKeyInputElement = await UIUtils.findWebElement(
      view,
      aesKwKeyInput,
    );
    expect(aesKwKeyInputElement, "AES KW Key input should exist").to.exist;
    await aesKwKeyInputElement.sendKeys(aesKwKeyPath);
    await UIUtils.sleep(500);

    // And: I enter the AES GCM Key file path from test fixtures
    const aesGcmKeyPath = getMCUBootTestDataPath("aes-gcm-key.bin");
    const aesGcmKeyInputElement = await UIUtils.findWebElement(
      view,
      aesGcmKeyInput,
    );
    expect(aesGcmKeyInputElement, "AES GCM Key input should exist").to.exist;
    await aesGcmKeyInputElement.sendKeys(aesGcmKeyPath);
    await UIUtils.sleep(500);

    // And: I expand the Custom TLV card
    const customTlvCardHeaderElement = await UIUtils.findWebElement(
      view,
      customTlvCardHeader,
    );
    expect(customTlvCardHeaderElement, "Custom TLV card should exist").to.exist;
    await customTlvCardHeaderElement.click();
    await UIUtils.sleep(800);

    // And: I click on the Custom TLV name field to edit
    const customTlvNameFieldElement = await UIUtils.findWebElement(
      view,
      customTlvNameField,
    );
    await customTlvNameFieldElement.click();
    await UIUtils.sleep(800);

    const ele = await UIUtils.findWebElement(view, tlvNameInput);

    // And: I update the TLV name to "Updated TLV Name"
    await ele.click();
    await clearAndSearch(ele, "Updated TLV Name");

    // And: I press Enter to confirm the name change
    await ele.sendKeys("\n");
    await UIUtils.sleep(500);

    // And: I clear the TLV value field to trigger validation error
    const tlvValueInputElement = await UIUtils.waitForElement(
      view,
      tlvValueInput,
      5000,
    );
    expect(tlvValueInputElement, "TLV value input should exist").to.exist;
    await clearAndSearch(tlvValueInputElement, "");

    // And: I verify the validation error appears
    const tlvValueErrorElement = await UIUtils.waitForElement(
      view,
      tlvValueError,
      5000,
    );
    expect(tlvValueErrorElement, "TLV value error should be displayed").to
      .exist;

    // And: I enter a valid TLV value "NewTLVValue123"
    await tlvValueInputElement.sendKeys("NewTLVValue123");
    await UIUtils.sleep(500);

    // And: I save the file and close the editor
    await saveAndCloseEditor();

    // Then: Verify ALL changes persisted in JSON
    const config = await parseJSONFile(configPath);
    expect(config, "Config file should be readable").to.exist;

    const applicationPackages = config.ApplicationPackages;
    expect(applicationPackages, "ApplicationPackages should exist in JSON").to
      .exist;

    const appPack = applicationPackages.find(
      (pack: any) => pack.Name === testPackName,
    );

    expect(appPack, `App pack "${testPackName}" should exist in JSON`).to.exist;

    expect(appPack.Images, "Images array should exist in JSON").to.exist;

    expect(
      appPack.Images.length,
      "Should have at least one image",
    ).to.be.greaterThan(0);

    const firstImage = appPack.Images[0];

    // Then: The JSON file should contain SlotSize: 8388608 (8 MB)
    expect(firstImage.SlotSize, "Slot size should be 8 MB in JSON").to.equal(
      8388608,
    );

    // And: The JSON file should contain HeaderSize: 64
    expect(
      firstImage.HeaderSize,
      "Header size should be 64 bytes in JSON",
    ).to.equal(64);

    // And: The JSON file should contain SignKey: "inherit"
    expect(firstImage.SignKey, "Sign key should be 'inherit' in JSON").to.equal(
      "inherit",
    );

    // And: The JSON file should contain AesKwKeyPath with normalized path
    const normalizedAesKwKeyPath = firstImage.AesKwKeyPath?.replace(/\\/g, "/");
    const expectedAesKwKeyPath = aesKwKeyPath.replace(/\\/g, "/");
    expect(
      normalizedAesKwKeyPath,
      "AES KW Key path should be set in JSON",
    ).to.equal(expectedAesKwKeyPath);

    // And: The JSON file should contain AesGcmKeyPath with normalized path
    const normalizedAesGcmKeyPath = firstImage.AesGcmKeyPath?.replace(
      /\\/g,
      "/",
    );
    const expectedAesGcmKeyPath = aesGcmKeyPath.replace(/\\/g, "/");
    expect(
      normalizedAesGcmKeyPath,
      "AES GCM Key path should be set in JSON",
    ).to.equal(expectedAesGcmKeyPath);
    console.log("AES GCM Key:", firstImage.AesGcmKeyPath);

    // And: The JSON file should contain CustomTLVs
    expect(firstImage.CustomTLVs, "CustomTLVs should exist in JSON").to.exist;
    expect(
      firstImage.CustomTLVs.length,
      "Should have at least one Custom TLV in JSON",
    ).to.be.greaterThan(0);

    const firstTlv = firstImage.CustomTLVs[0];

    // And: The JSON file should contain CustomTLVs with Name: "Updated TLV Name"
    expect(
      firstTlv.Name,
      "TLV name should be 'Updated TLV Name' in JSON",
    ).to.equal("Updated TLV Name");

    // And: The JSON file should contain CustomTLVs with Value: "NewTLVValue123"
    expect(
      firstTlv.Value,
      "TLV value should be 'NewTLVValue123' in JSON",
    ).to.equal("NewTLVValue123");
    console.log("TLV value:", firstTlv.Value);
  }).timeout(90000);
});
