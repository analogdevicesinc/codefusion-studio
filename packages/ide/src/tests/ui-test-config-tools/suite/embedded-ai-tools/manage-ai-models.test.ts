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

/**
 * These tests cover the management and persistence of Embedded AI Models in the CodeFusion Studio extension.
 */

import { expect } from "chai";
import {
  By,
  ModalDialog,
  until,
  VSBrowser,
  WebView,
  Workbench,
} from "vscode-extension-tester";
import { UIUtils } from "../../../ui-test-utils/ui-utils";
import {
  getConfigPathForFile,
  parseJSONFile,
} from "../../config-tools-utility/cfsconfig-utils";
import {
  addModel,
  homePageTitle,
  manageAiModelsTab,
  modelTargetDropdown,
  modelTargetOption,
  modelNameInput,
  modelFileBrowseButton,
  modelFileInput,
  useSelectedModelButton,
  modelSaveButton,
  gridCellValue,
  memorySectionData,
  symbolData,
  arenaSizeModel,
  memorySectionArena,
  memorySectionDataset,
  editButton,
  deleteButton,
  includeToggle,
  compatibilityState,
  deleteModelConfirmButton,
  profileReport,
  modelNameError,
  modelFileError,
  symbolError,
  arenaSizeError,
  profileSummarySection,
  downArrowButton,
} from "../../page-objects/embedded-ai-tools-section/manage-ai-models";
import { clearAndSearch } from "../../page-objects/pin-config-section/pin-config-screen";
/*
 * Feature: System Planner - Embedded AI Tools
 *     As a CodeFusion Studio user
 *     I want to create and configure Embedded AI Models
 *     So that I can ensure the models are getting created and persisted successfully
 *
 * Background:
 *     Given VS Code is open with the CodeFusion Studio extension loaded
 *     And all editors are closed
 *     And all notifications are dismissed
 */

describe("AI Tools Test Cases", () => {
  // === Test Configuration setup ===
  const configFile = "manual32690.cfsconfig";
  const configPath = getConfigPathForFile(configFile);
  //===TestData===

  let workbench: Workbench;
  let browser: VSBrowser;
  let view: WebView;

  before(async () => {
    ({ browser, workbench } = await UIUtils.setupTestSuite({
      waitForWorkbench: true,
    }));
  });

  async function openAiToolsTab(): Promise<void> {
    await browser.openResources(configPath);
    await browser.waitForWorkbench();
    workbench = new Workbench();
    view = new WebView();
    await view.wait(8000);

    // === Then dismiss all notifications ,wait for the webview to load===
    await UIUtils.dismissAllNotifications(workbench, browser);

    // ===Then switch to frame===
    await view.switchToFrame(4000);
    await UIUtils.findWebElement(view, homePageTitle, 20);
    const pageTitle = await UIUtils.waitForElementToBeVisible(
      view,
      homePageTitle,
      5000,
    );

    // Verify the page title "MAX32690" in the DFG webview
    const pageTitleText = await pageTitle.getText();
    expect(pageTitleText).to.equal(
      "TEST690",
      "TEST690 title should be visible in the WebView",
    );

    // Click on the Manage AI Models tab
    await UIUtils.clickElement(view, manageAiModelsTab);
  }

  afterEach(async function () {
    this.timeout(60000);
    await UIUtils.teardownTestSuite(view, configPath);
  });

  /*
   * Scenario: Add a new AI model with minimal inputs
   *     Given I am on the Manage AI Models tab
   *     When I add a new model with a name and a model file
   *     And I save the configuration
   *     Then the model should appear in the models grid
   *     And the model should be persisted in the saved .cfsconfig file
   */
  it("Add AI Model and verify the persistence @regression", async () => {
    await openAiToolsTab();
    await UIUtils.clickElement(view, addModel);
    await UIUtils.sleep(2000);
    await UIUtils.clickElement(view, modelTargetDropdown);
    await UIUtils.clickElement(view, modelTargetOption);

    const modelNameInputField = await UIUtils.findWebElement(
      view,
      modelNameInput,
    );
    await clearAndSearch(modelNameInputField, "test_model");

    const browseButton = await UIUtils.waitForElementToBeVisible(
      view,
      modelFileBrowseButton,
      3000,
    );
    await UIUtils.clickElement(view, browseButton);
    await UIUtils.sleep(300);
    await UIUtils.clickElement(view, await modelFileInput("RNNoise"));
    await UIUtils.clickElement(view, useSelectedModelButton);

    await UIUtils.clickElement(view, modelSaveButton);
    const modelNameCell = await UIUtils.findWebElement(
      view,
      gridCellValue(2, 1),
    );
    const modelNameCellText = await modelNameCell.getText();
    expect(modelNameCellText).to.equal(
      "test_model",
      "The model name should be persisted and visible in the grid",
    );
    // Asserting the compatibility check to be success
    const compatibilityCheck = await UIUtils.waitForElement(
      view,
      compatibilityState("test_model"),
      30000,
    );
    await view
      .getDriver()
      .wait(until.elementIsVisible(compatibilityCheck), 5000);
    expect(await compatibilityCheck.isDisplayed()).to.equal(true);
    // === AND: I save the configuration file ===
    await view.switchBack();
    await workbench.executeCommand("view: close all editors");
    const dialog = new ModalDialog();
    await dialog.pushButton("Save");

    console.log("Saved the configuration file");

    await UIUtils.sleep(2000);

    // === AND: the model should be persisted in the saved .cfsconfig file ===
    const persistedConfig = parseJSONFile(configPath);
    const persistedModel = (persistedConfig?.Projects ?? [])
      .flatMap((project: any) => project.AIModels ?? [])
      .find((model: any) => model.Name === "test_model");

    console.log("Persisted model:", persistedModel);
    expect(
      persistedModel,
      "The added AI model should be persisted in the saved configuration file",
    ).to.not.be.undefined;
    expect(persistedModel.Target?.Core).to.equal("CM4");
    expect(persistedModel.Backend?.Name).to.equal("tflm");
    expect(persistedModel.Files?.Model).to.include("rnnoise_INT8.tflite");
    expect(persistedModel.Files?.Dataset).to.include(
      "denoiser_rnnoise_int8.bin",
    );
    expect(persistedModel.Enabled).to.equal(true);
    expect(persistedModel.Backend?.Extensions).to.be.an("object").and.empty;
  });

  /*
   * Scenario: Full lifecycle of an AI model with all backend extension inputs
   *     Given I am on the Manage AI Models tab
   *     When I add a new model with a name, model file and all backend extension fields
   *     And I save the configuration
   *     Then the model and its extension values should be persisted in the saved .cfsconfig file
   *     When I edit the model's Section, ArenaSize and DatasetSection values
   *     And I save the configuration
   *     Then the updated values should be persisted in the saved .cfsconfig file
   *     When I click the model's Include toggle
   *     And I save the configuration
   *     Then the model should be persisted as disabled in the saved .cfsconfig file
   *     When I click the model's Delete button and confirm
   *     And I save the configuration
   *     Then the model should no longer be present in the saved .cfsconfig file
   *
   */
  it("Add, edit, toggle, and delete an AI model with all inputs @regression", async () => {
    // === Add a new AI model with all backend extension inputs ===
    await openAiToolsTab();
    await UIUtils.clickElement(view, addModel);
    await UIUtils.sleep(2000);
    await UIUtils.clickElement(view, modelTargetDropdown);
    await UIUtils.clickElement(view, modelTargetOption);

    const modelNameInputField = await UIUtils.findWebElement(
      view,
      modelNameInput,
    );
    await clearAndSearch(modelNameInputField, "test_model_with_all_inputs");

    const browseButton = await UIUtils.waitForElementToBeVisible(
      view,
      modelFileBrowseButton,
      3000,
    );
    await UIUtils.clickElement(view, browseButton);
    await UIUtils.sleep(300);
    await UIUtils.clickElement(view, await modelFileInput("DS-CNN Small"));
    await UIUtils.clickElement(view, useSelectedModelButton);

    let memorySectionField = await UIUtils.findWebElement(
      view,
      memorySectionData,
    );
    await clearAndSearch(memorySectionField, "memory-section");

    const symbolField = await UIUtils.findWebElement(view, symbolData);
    await clearAndSearch(symbolField, "symbolData");

    let arenaSizeField = await UIUtils.findWebElement(view, arenaSizeModel);
    await clearAndSearch(arenaSizeField, "1");

    const arenaSectionField = await UIUtils.findWebElement(
      view,
      memorySectionArena,
    );
    await clearAndSearch(arenaSectionField, "memory-section-arena");

    let datasetSectionField = await UIUtils.findWebElement(
      view,
      memorySectionDataset,
    );
    await clearAndSearch(datasetSectionField, "memory-section-dataset");

    await UIUtils.clickElement(view, modelSaveButton);
    const modelNameCell = await UIUtils.findWebElement(
      view,
      gridCellValue(2, 1),
    );
    const modelNameCellText = await modelNameCell.getText();
    expect(modelNameCellText).to.equal(
      "test_model_with_all_inputs",
      "The model name should be persisted and visible in the grid",
    );
    // Asserting the compatibility check to be success
    const compatibilityCheck = await UIUtils.waitForElement(
      view,
      compatibilityState("test_model_with_all_inputs"),
      30000,
    );
    await view
      .getDriver()
      .wait(until.elementIsVisible(compatibilityCheck), 5000);
    expect(await compatibilityCheck.isDisplayed()).to.equal(true);

    // === AND: I save the configuration file ===
    await view.switchBack();
    await workbench.executeCommand("view: close all editors");
    let dialog = new ModalDialog();
    await dialog.pushButton("Save");

    console.log("Saved the configuration file");

    await UIUtils.sleep(300);

    // === AND: the model should be persisted in the saved .cfsconfig file ===
    let persistedConfig = parseJSONFile(configPath);
    let persistedModel = (persistedConfig?.Projects ?? [])
      .flatMap((project: any) => project.AIModels ?? [])
      .find((model: any) => model.Name === "test_model_with_all_inputs");
    console.log("Persisted model:", persistedModel);
    expect(
      persistedModel,
      "The added AI model should be persisted in the saved configuration file",
    ).to.not.be.undefined;
    expect(persistedModel.Target?.Core).to.equal("CM4");
    expect(persistedModel.Backend?.Name).to.equal("tflm");
    expect(persistedModel.Files?.Model).to.include("ds_cnn_s_int8.tflite").and
      .not.empty;
    expect(persistedModel.Files?.Dataset).to.include("kws_ds-cnn_int8.bin").and
      .not.empty;
    expect(persistedModel.Enabled).to.equal(true);
    expect(persistedModel.Backend.Extensions.Section).to.equal(
      "memory-section",
    );
    expect(persistedModel.Backend.Extensions.Symbol).to.equal("symbolData");
    expect(persistedModel.Backend.Extensions.ArenaSize).to.equal(1);
    expect(persistedModel.Backend.Extensions.ArenaSection).to.equal(
      "memory-section-arena",
    );
    expect(persistedModel.Backend.Extensions.DatasetSection).to.equal(
      "memory-section-dataset",
    );

    // === Edit the model's Section, ArenaSize and DatasetSection values ===
    await openAiToolsTab();

    await UIUtils.clickElement(view, editButton("test_model_with_all_inputs"));
    memorySectionField = await UIUtils.findWebElement(view, memorySectionData);
    await clearAndSearch(memorySectionField, "memory-section-edited");

    arenaSizeField = await UIUtils.findWebElement(view, arenaSizeModel);
    await clearAndSearch(arenaSizeField, "3");

    datasetSectionField = await UIUtils.findWebElement(
      view,
      memorySectionDataset,
    );
    await clearAndSearch(datasetSectionField, "memory-section-dataset-edited");

    await UIUtils.clickElement(view, modelSaveButton);

    // === AND: I save the configuration file ===
    await view.switchBack();
    await workbench.executeCommand("view: close all editors");
    dialog = new ModalDialog();
    await dialog.pushButton("Save");

    console.log("Saved the configuration file");

    await UIUtils.sleep(300);

    // === AND: the model should be persisted in the saved .cfsconfig file ===
    persistedConfig = parseJSONFile(configPath);
    persistedModel = (persistedConfig?.Projects ?? [])
      .flatMap((project: any) => project.AIModels ?? [])
      .find((model: any) => model.Name === "test_model_with_all_inputs");
    console.log("Persisted model:", persistedModel);
    expect(
      persistedModel,
      "The edited AI model should be persisted in the saved configuration file",
    ).to.not.be.undefined;
    expect(persistedModel.Target?.Core).to.equal("CM4");
    expect(persistedModel.Backend?.Name).to.equal("tflm");
    expect(persistedModel.Files?.Model).to.include("ds_cnn_s_int8.tflite").and
      .not.empty;
    expect(persistedModel.Files?.Dataset).to.include("kws_ds-cnn_int8.bin").and
      .not.empty;
    expect(persistedModel.Enabled).to.equal(true);
    expect(persistedModel.Backend.Extensions.Section).to.equal(
      "memory-section-edited",
    );
    expect(persistedModel.Backend.Extensions.Symbol).to.equal("symbolData");
    expect(persistedModel.Backend.Extensions.ArenaSize).to.equal(3);
    expect(persistedModel.Backend.Extensions.ArenaSection).to.equal(
      "memory-section-arena",
    );
    expect(persistedModel.Backend.Extensions.DatasetSection).to.equal(
      "memory-section-dataset-edited",
    );

    // === Toggle the model's Include (Enabled) state off ===
    await openAiToolsTab();

    await UIUtils.clickElement(
      view,
      includeToggle("test_model_with_all_inputs"),
    );

    const dataChecked = await UIUtils.getAttributeFromWebElementBy(
      view,
      includeToggle("test_model_with_all_inputs"),
      "data-checked",
    );
    expect(dataChecked).to.equal(
      "false",
      "The toggle should be unchecked after clicking it",
    );

    // === AND: I save the configuration file ===
    await view.switchBack();
    await workbench.executeCommand("view: close all editors");
    dialog = new ModalDialog();
    await dialog.pushButton("Save");

    console.log("Saved the configuration file");

    await UIUtils.sleep(300);

    // === AND: the model should be persisted in the saved .cfsconfig file ===
    persistedConfig = parseJSONFile(configPath);
    persistedModel = (persistedConfig?.Projects ?? [])
      .flatMap((project: any) => project.AIModels ?? [])
      .find((model: any) => model.Name === "test_model_with_all_inputs");

    expect(
      persistedModel,
      "The toggled AI model should be persisted in the saved configuration file",
    ).to.not.be.undefined;
    expect(persistedModel.Target?.Core).to.equal("CM4");
    expect(persistedModel.Backend?.Name).to.equal("tflm");
    expect(persistedModel.Files?.Model).to.include("ds_cnn_s_int8.tflite").and
      .not.empty;
    expect(persistedModel.Files?.Dataset).to.include("kws_ds-cnn_int8.bin").and
      .not.empty;
    expect(persistedModel.Enabled).to.equal(
      false,
      "The model should be persisted as disabled after toggling it off",
    );
    expect(persistedModel.Backend.Extensions.Section).to.equal(
      "memory-section-edited",
    );
    expect(persistedModel.Backend.Extensions.Symbol).to.equal("symbolData");
    expect(persistedModel.Backend.Extensions.ArenaSize).to.equal(3);
    expect(persistedModel.Backend.Extensions.ArenaSection).to.equal(
      "memory-section-arena",
    );
    expect(persistedModel.Backend.Extensions.DatasetSection).to.equal(
      "memory-section-dataset-edited",
    );

    // === Delete the model ===
    await openAiToolsTab();

    await UIUtils.clickElement(
      view,
      deleteButton("test_model_with_all_inputs"),
    );
    // Confirm deletion in the ConfirmDialog
    await UIUtils.clickElement(view, deleteModelConfirmButton);
    // === AND: I save the configuration file ===
    await view.switchBack();
    await workbench.executeCommand("view: close all editors");
    dialog = new ModalDialog();
    await dialog.pushButton("Save");

    console.log("Saved the configuration file");

    await UIUtils.sleep(300);

    // === AND: the model should no longer be persisted in the saved .cfsconfig file ===
    persistedConfig = parseJSONFile(configPath);
    persistedModel = (persistedConfig?.Projects ?? [])
      .flatMap((project: any) => project.AIModels ?? [])
      .find((model: any) => model.Name === "test_model_with_all_inputs");

    expect(
      persistedModel,
      "The deleted AI model should not be persisted in the saved configuration file",
    ).to.be.undefined;
  });

  /*
   * Scenario: View the generated profiling report for a compatible AI model
   *     Given I am on the Manage AI Models tab
   *     When I add a new model with a name, model file and all backend extension fields
   *     And I save the configuration
   *     Then the model should appear in the models grid with a successful compatibility check
   *     When I click the Open Profiling Report button
   *     Then a profiling report tab should open
   *     And the profile summary section should be visible in the report
   */
  it("Verify the profile report page @regression", async () => {
    // === Add a new AI model with all backend extension inputs ===
    await openAiToolsTab();
    await UIUtils.clickElement(view, addModel);
    await UIUtils.sleep(2000);
    await UIUtils.clickElement(view, modelTargetDropdown);
    await UIUtils.clickElement(view, modelTargetOption);

    const modelNameInputField = await UIUtils.findWebElement(
      view,
      modelNameInput,
    );
    await clearAndSearch(modelNameInputField, "test_model_with_all_inputs");

    const browseButton = await UIUtils.waitForElementToBeVisible(
      view,
      modelFileBrowseButton,
      3000,
    );
    await UIUtils.clickElement(view, browseButton);
    await UIUtils.sleep(300);
    await UIUtils.clickElement(view, await modelFileInput("DS-CNN Small"));
    await UIUtils.clickElement(view, useSelectedModelButton);

    let memorySectionField = await UIUtils.findWebElement(
      view,
      memorySectionData,
    );
    await clearAndSearch(memorySectionField, "memory-section");

    const symbolField = await UIUtils.findWebElement(view, symbolData);
    await clearAndSearch(symbolField, "symbolData");

    let arenaSizeField = await UIUtils.findWebElement(view, arenaSizeModel);
    await clearAndSearch(arenaSizeField, "1");

    const arenaSectionField = await UIUtils.findWebElement(
      view,
      memorySectionArena,
    );
    await clearAndSearch(arenaSectionField, "memory-section-arena");

    let datasetSectionField = await UIUtils.findWebElement(
      view,
      memorySectionDataset,
    );
    await clearAndSearch(datasetSectionField, "memory-section-dataset");

    await UIUtils.clickElement(view, modelSaveButton);
    const modelNameCell = await UIUtils.findWebElement(
      view,
      gridCellValue(2, 1),
    );
    const modelNameCellText = await modelNameCell.getText();
    expect(modelNameCellText).to.equal(
      "test_model_with_all_inputs",
      "The model name should be persisted and visible in the grid",
    );
    // Asserting the compatibility check to be success
    const compatibilityCheck = await UIUtils.waitForElement(
      view,
      compatibilityState("test_model_with_all_inputs"),
      30000,
    );
    await view
      .getDriver()
      .wait(until.elementIsVisible(compatibilityCheck), 5000);
    expect(await compatibilityCheck.isDisplayed()).to.equal(true);

    await UIUtils.clickElement(view, profileReport);

    // Switch to the report webview
    await view.switchBack();
    const reportView = new WebView();
    const driver = reportView.getDriver();
    const webviewIframes = await driver.findElements(
      By.css("iframe[class='webview ready']"),
    );
    let visibleReportFrame;
    for (const frame of webviewIframes) {
      if (await frame.isDisplayed()) {
        visibleReportFrame = frame;
        break;
      }
    }
    expect(
      visibleReportFrame,
      "Expected exactly one visible webview iframe for the active report tab",
    ).to.not.be.undefined;
    await driver.switchTo().frame(visibleReportFrame!);
    await driver.wait(until.elementLocated(By.id("active-frame")), 8000);
    await driver
      .switchTo()
      .frame(await driver.findElement(By.id("active-frame")));
    const profileSummarySectionElement =
      await UIUtils.waitForElementToBeVisible(
        reportView,
        profileSummarySection,
      );
    expect(await profileSummarySectionElement.isDisplayed()).to.equal(true);

    await reportView.switchBack();
    await workbench.executeCommand("view: close all editors");
    const dialog = new ModalDialog();
    await dialog.pushButton("Save");
    console.log("Saved the configuration file");
  });

  /*
   * Scenario: Validate form field errors when adding an AI model
   *     Given I am on the Manage AI Models tab
   *     When I add a new model without a name or model file
   *     And I save the configuration
   *     Then a "Name is required" error should be displayed
   *     And a "Model file is required" error should be displayed
   *     When I enter an invalid model name starting with a digit
   *     And I save the configuration
   *     Then an invalid C identifier error should be displayed for the model name
   *     When I enter a valid model name
   *     And I save the configuration
   *     Then the model name error should no longer be displayed
   *     When I enter an invalid symbol value starting with a digit
   *     And I save the configuration
   *     Then an invalid C identifier error should be displayed for the symbol
   *     When I enter a valid symbol value
   *     And I save the configuration
   *     Then the symbol error should no longer be displayed
   *     When I set an invalid (negative) arena size value
   *     And I save the configuration
   *     Then a value-out-of-range error should be displayed for the arena size
   *     When I set a valid arena size value
   *     And I save the configuration
   *     Then the arena size error should no longer be displayed
   *     When I select a valid model file
   *     And I save the configuration
   *     Then the model file error should no longer be displayed
   */
  it("Error handling scenarios @regression", async () => {
    // === Add a new AI model with all backend extension inputs ===
    await openAiToolsTab();
    await UIUtils.clickElement(view, addModel);
    await UIUtils.sleep(2000);

    // Add model without model name and model file input
    await UIUtils.clickElement(view, modelSaveButton);
    let modelNameErrorField = await UIUtils.findWebElement(
      view,
      modelNameError,
    );
    let modelFileErrorField = await UIUtils.findWebElement(
      view,
      modelFileError,
    );
    expect(
      await modelNameErrorField.isDisplayed(),
      "The model name error element should be displayed when no model name is provided",
    ).to.equal(true);
    expect(await modelNameErrorField.getText()).to.equal(
      "Name is required",
      "The model name error message should be displayed correctly",
    );
    expect(
      await modelFileErrorField.isDisplayed(),
      "The model file error element should be displayed when no model file is provided",
    ).to.equal(true);
    expect(await modelFileErrorField.getText()).to.equal(
      "Model file is required",
      "The model file error message should be displayed correctly",
    );

    // Add an invalid model name("123") and check for the appropriate error message
    const modelNameInputField = await UIUtils.findWebElement(
      view,
      modelNameInput,
    );
    await clearAndSearch(modelNameInputField, "123");
    await UIUtils.clickElement(view, modelSaveButton);
    modelNameErrorField = await UIUtils.findWebElement(view, modelNameError);

    expect(
      await modelNameErrorField.isDisplayed(),
      "The model name error element should be displayed when no model name is provided",
    ).to.equal(true);
    expect(await modelNameErrorField.getText()).to.equal(
      "Enter a valid C identifier. Only letters, non-leading numbers and underscores are allowed. Reserved C/C++ keywords are not allowed.",
      "The model name error message should be displayed correctly",
    );

    // Clear the invalid model name and enter a valid one
    await clearAndSearch(modelNameInputField, "test_model");
    await UIUtils.clickElement(view, modelSaveButton);
    const modelNameErrorElements = await view.findWebElements(modelNameError);
    expect(
      modelNameErrorElements,
      "The model name error element should not be present once a valid name is provided",
    ).to.have.lengthOf(0);

    // Add an invalid symbol data input("123") and check for the appropriate error message
    let symbolField = await UIUtils.findWebElement(view, symbolData);
    await clearAndSearch(symbolField, "123");
    await UIUtils.clickElement(view, modelSaveButton);
    const symbolErrorField = await UIUtils.findWebElement(view, symbolError);
    expect(
      await symbolErrorField.isDisplayed(),
      "The symbol error element should be displayed when an invalid symbol is provided",
    ).to.equal(true);
    expect(await symbolErrorField.getText()).to.equal(
      "Enter a valid C identifier. Only letters, non-leading numbers and underscores are allowed. Reserved C/C++ keywords are not allowed.",
      "The symbol error message should be displayed correctly",
    );

    // Clear the invalid symbol data input and enter a valid one
    await clearAndSearch(symbolField, "valid_symbol");
    await UIUtils.clickElement(view, modelSaveButton);
    const symbolErrorElements = await view.findWebElements(symbolError);
    expect(
      symbolErrorElements,
      "The symbol error element should not be present once a valid symbol is provided",
    ).to.have.lengthOf(0);

    // Add an invalid arena size input("-1") and check for the appropriate error message
    // Click the downArrow button to get "-1" as input
    let arenaSizeField = await UIUtils.findWebElement(view, arenaSizeModel);
    await UIUtils.clickElement(view, downArrowButton);
    await UIUtils.clickElement(view, modelSaveButton);
    const arenaSizeErrorField = await UIUtils.findWebElement(
      view,
      arenaSizeError,
    );
    expect(
      await arenaSizeErrorField.isDisplayed(),
      "The arena size error element should be displayed when an invalid arena size is provided",
    ).to.equal(true);
    expect(await arenaSizeErrorField.getText()).to.equal(
      "Value is lower than the allowed range 0 to undefined",
      "The arena size error message should be displayed correctly",
    );

    // Clear the invalid arena size input and enter a valid one
    await clearAndSearch(arenaSizeField, "1");
    await UIUtils.clickElement(view, modelSaveButton);
    const arenaSizeErrorElements = await view.findWebElements(arenaSizeError);
    expect(
      arenaSizeErrorElements,
      "The arena size error element should not be present once a valid arena size is provided",
    ).to.have.lengthOf(0);

    // Select a model file and verify the error is not displayed
    const browseButton = await UIUtils.waitForElementToBeVisible(
      view,
      modelFileBrowseButton,
      3000,
    );
    await UIUtils.clickElement(view, browseButton);
    await UIUtils.sleep(300);
    await UIUtils.clickElement(view, await modelFileInput("RNNoise"));
    await UIUtils.clickElement(view, useSelectedModelButton);
    await UIUtils.clickElement(view, modelSaveButton);
    const modelFileErrorElements = await view.findWebElements(modelFileError);
    expect(
      modelFileErrorElements,
      "The model file error element should not be present once a valid model file is selected",
    ).to.have.lengthOf(0);
  });
});
