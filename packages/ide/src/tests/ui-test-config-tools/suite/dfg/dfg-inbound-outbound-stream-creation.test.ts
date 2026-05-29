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
 * These tests cover the stream creation through inbound/outbound stream in DFG
 */

/*
 * Feature: DFG inbound and outbound stream creation
 *     As a CodeFusion Studio user
 *     I want to configure inbound and outbound streams in the DFG view
 *     So that I can manage data flow between cores and peripherals
 *
 * Background:
 *     Given VS Code is open with the CodeFusion Studio extension loaded
 *     And all editors are closed
 *     And all notifications are dismissed
 *     And the DFGTESTS DFG configuration file "dfgTests-dfg.cfsconfig" is available
 */

import { expect } from "chai";
import {
  EditorView,
  VSBrowser,
  WebView,
  Workbench,
} from "vscode-extension-tester";

import { UIUtils } from "../../../ui-test-utils/ui-utils";
import { getConfigPathForFile } from "../../config-tools-utility/cfsconfig-utils";
import {
  homePageTitle,
  dfgTab,
  subscreenBtnDfgVisualisation,
  subscreenBtnDfgStreamList,
  selectStream,
  addInboundStreamButton,
  streamSourceDropdown,
  streamSourceOption,
  streamDestinationDropdown,
  streamDestinationText,
  streamDestinationOption,
  addOutboundStreamButton,
  streamDescription,
  sourceBufferSizeDropdown,
  sourceBufferSizeOption,
  destinationBufferSizeDropdown,
  destinationBufferSizeOption,
  createStreamButton,
  getInboundStreamCount,
  getOutboundStreamCount,
  getStreamRowCount,
  switchToDfgVisualisationTab,
  switchToStreamListTab,
  createStreamWithValues,
  validateStreamListValues,
  isExportAsCsvButtonEnabled,
  verifyConfigFilePersistence,
  deleteStreamButton,
  confirmDeleteStreamButton,
  createdStreamConfigButton,
  getStreamDescription,
  getDropdownCurrentValue,
  tiedSourceStreamDropdown,
  tiedSourceStreamDropdownOption,
  modelDialogHeader,
  modalDialogCancelButton,
  sidePanelCloseButton,
  selectStreamToDelete,
  mainCreateStreamButton,
  destinationError,
} from "../../page-objects/dfg-section/dfg-inbound-outbound-stream-creation-screen";

describe("DFG Tests", () => {
  // === Given the existing DFGTESTS DFG cfsconfig file "dfgTests-dfg-stream-creation-deletion.cfsconfig" is opened===
  const configFile = "dfgTests-dfg-stream-creation-deletion.cfsconfig";
  const configPath = getConfigPathForFile(configFile);

  // ===Test Setup===
  let workbench: Workbench;
  let browser: VSBrowser;
  let view: WebView;
  let editor: EditorView;
  const source: string = "ASS";
  const destination: string = "ASS";
  const sourceBufferSize: number = 64;
  const destinationBufferSize: number = 64;

  async function openDfgTab(): Promise<void> {
    await browser.openResources(configPath);
    workbench = new Workbench();
    view = new WebView();
    await view.wait();

    // === Then dismiss all notifications ,wait for the webview to load===
    await UIUtils.dismissAllNotifications(workbench, browser);

    // ===Then switch to frame===
    await view.switchToFrame(4000);
    const pageTitle = await UIUtils.waitForElementToBeVisible(
      view,
      homePageTitle,
    );

    // Verify the page title "DFGTESTS" in the DFG webview
    const pageTitleText = await pageTitle.getText();
    expect(pageTitleText).to.equal(
      "DFGTESTS",
      "DFGTESTS title should be visible in the WebView",
    );

    // Click on the DFG tab
    await UIUtils.clickElement(view, dfgTab);
  }

  before(async () => {
    browser = VSBrowser.instance;
    editor = new EditorView();
    await editor.closeAllEditors();
  });

  after(async function () {
    this.timeout(60000);
    await view.switchBack();
    const wb = new Workbench();
    await wb.wait();
    await wb.executeCommand("View: revert and close editor");
  });

  /* Scenario: DFG title and tabs are visible and clickable
   *     Given the existing DFGTESTS DFG cfsconfig file is opened
   *     Then dismiss all notifications, wait for the webview to load
   *     Then switch to the System Planner frame
   *     And I see the page title "DFGTESTS" in the DFG webview
   *     And the "DFG Visualisation" tab is visible and clickable
   *     And the "DFG Stream List" tab is visible and clickable
   */

  it("Verify the title and tabs in DFG", async () => {
    // Given the user is on the DFG config screen
    await openDfgTab();

    // Verify "DFG Visualisation" tab is visible and clickable
    // Verify "DFG Stream List" tab is visible and clickable
    const dfgVisualisationTab = await UIUtils.waitForElementToBeVisible(
      view,
      subscreenBtnDfgVisualisation,
    );

    let dfgVisualisationTabIsClickable: boolean =
      (await dfgVisualisationTab.isDisplayed()) &&
      (await dfgVisualisationTab.isEnabled());

    expect(
      dfgVisualisationTabIsClickable,
      "DFG Visualisation tab should be clickable",
    ).to.be.true;

    const streamListTab = await UIUtils.waitForElementToBeVisible(
      view,
      subscreenBtnDfgStreamList,
    );

    let streamListTabIsClickable: boolean =
      (await streamListTab.isDisplayed()) && (await streamListTab.isEnabled());

    expect(streamListTabIsClickable, "DFG Stream List tab should be clickable")
      .to.be.true;
  });

  /* Scenario: Export as CSV reflects whether the stream list is empty
   *     Given I am on the "DFG Stream List" tab
   *     When the stream list is empty
   *     Then the "Export as CSV" button is disabled
   *     When the stream list is not empty
   *     Then the "Export as CSV" button is enabled
   */

  it("Verify the export as CSV button is disabled when stream list is empty", async () => {
    await switchToStreamListTab(view);
    const [streamRowCount, isExportButtonEnabled] =
      await isExportAsCsvButtonEnabled(view);
    // If streamRowCount is 1, i.e. only header row is present, consider stream list as empty and Export as CSV button should be disabled.
    // If streamRowCount is greater than 1, it means stream list has at least one stream and Export as CSV button should be enabled.
    if (streamRowCount === 1) {
      expect(
        isExportButtonEnabled,
        "Export as CSV button should be disabled when stream list is empty",
      ).to.be.false;
    } else {
      expect(
        isExportButtonEnabled,
        "Export as CSV button should be enabled when stream list is not empty",
      ).to.be.true;
    }
    await switchToDfgVisualisationTab(view);
  });

  /* Scenario: Inbound stream selection auto-populates destination and creates a ASS→ASS stream
   *     Given I am on the "DFG Visualisation" tab
   *     And I note the current inbound stream count for destination "ASS"
   *     And I note the current outbound stream count for source "ASS"
   *     And I note the current number of rows in the stream list
   *     When I select the "ASS" stream node
   *     And I click "Add inbound stream" for destination "ASS"
   *     Then the stream destination control shows "1 destination selected"
   *     And the destination dropdown has "ASS" selected
   *     When I select "ASS" as the stream source
   *     And I enter a description and buffer size "64" for the stream
   *     And I create the stream
   *     Then the inbound stream count for "ASS" is incremented by 1
   *     And the outbound stream count for "ASS" is incremented by 1
   *     And the stream list contains a new row for a "ASS→ASS" stream with buffer size "64"
   *     And the "Export as CSV" button is enabled when the stream list is not empty
   *     When I save the configuration file
   *     Then the saved configuration persists a ASS→ASS stream for source "ASS" and destination "ASS"
   */

  it("Verify the inbound stream selection auto populates the stream destination and create css-css stream", async () => {
    // Get the initial stream counts and stream list row count before creating the stream
    const initialInboundStreamCount = await getInboundStreamCount(
      view,
      destination,
    );
    const initialOutboundStreamCount = await getOutboundStreamCount(
      view,
      source,
    );
    await switchToStreamListTab(view);
    // Get the initial stream row count before creating the stream
    const initialStreamRowCount = await getStreamRowCount(view);
    // Switch back to visualisation tab to create the stream
    await switchToDfgVisualisationTab(view);
    // Select the source stream node and click on add inbound stream button
    await UIUtils.clickElement(view, selectStream(source));
    await UIUtils.clickElement(view, addInboundStreamButton(destination));

    // Verify that destination dropdown has "1 destination selected" text
    const streamDestinationTextElement = await UIUtils.findWebElement(
      view,
      streamDestinationText,
    );
    const streamDestinationTextValue = (
      await streamDestinationTextElement.getText()
    ).toString();
    expect(streamDestinationTextValue).to.equal(
      "1 destination selected",
      'Stream destination should be "1 destination selected" for ASS stream',
    );

    //Verify that ASS option is selected in stream destination dropdown
    await UIUtils.clickElement(view, streamDestinationDropdown);
    const checkStreamDestinationOption = await UIUtils.findWebElement(
      view,
      streamDestinationOption(destination),
    );
    const isDestinationSelected =
      (await checkStreamDestinationOption.getAttribute("aria-checked")) ===
      "true";
    expect(isDestinationSelected).to.be.true;

    await UIUtils.clickElement(view, streamDestinationDropdown);

    // Selecting the source
    await UIUtils.selectOptionFromDropdown(
      view,
      streamSourceDropdown,
      streamSourceOption(source),
    );

    // Entering stream description and buffer sizes and creating the stream
    await createStreamWithValues(
      view,
      source,
      destination,
      sourceBufferSize,
      destinationBufferSize,
    );

    // Verify the inbound and outbound stream counts are incremented by 1 after stream creation
    expect(await getInboundStreamCount(view, destination)).to.equal(
      initialInboundStreamCount + 1,
      "Inbound stream count should be incremented by 1 after adding an inbound stream",
    );

    expect(await getOutboundStreamCount(view, source)).to.equal(
      initialOutboundStreamCount + 1,
      "Outbound stream count should be incremented by 1 after adding an outbound stream",
    );

    // Switch to stream list tab and verify the stream row count is incremented by 1 after stream creation
    await switchToStreamListTab(view);
    const expectedStreamRowCount = initialStreamRowCount + 1;
    expect(await getStreamRowCount(view)).to.equal(
      expectedStreamRowCount,
      "Stream row count in stream list should be incremented by 1 after adding a stream",
    );

    // Verify the values in the newly added stream row in the stream list
    const [
      sourceStreamValue,
      destinationStreamValue,
      sourceBufferSizeValue,
      destinationBufferSizeValue,
    ] = await validateStreamListValues(view, expectedStreamRowCount);

    expect(sourceStreamValue).to.equal(
      source,
      "Source stream value should match the selected stream",
    );
    expect(destinationStreamValue).to.equal(
      destination,
      "Destination stream value should match the selected stream",
    );
    expect(sourceBufferSizeValue).to.equal(
      sourceBufferSize,
      "Source buffer size value should match the selected buffer size",
    );
    expect(destinationBufferSizeValue).to.equal(
      destinationBufferSize,
      "Destination buffer size value should match the selected buffer size",
    );

    //Verify that Export as CSV button is enabled when stream list is not empty
    const [streamCount, isExportButtonEnabled] =
      await isExportAsCsvButtonEnabled(view);
    // If streamRowCount is greater than 1, it means stream list has at least one stream and Export as CSV button should be enabled.
    // Else only header row is present, consider stream list as empty and Export as CSV button should be disabled.
    if (streamCount > 1) {
      expect(
        isExportButtonEnabled,
        "Export as CSV button should be enabled when stream list is not empty",
      ).to.be.true;
    } else {
      expect(
        isExportButtonEnabled,
        "Export as CSV button should be disabled when stream list is empty",
      ).to.be.false;
    }
    await switchToDfgVisualisationTab(view);

    // === THEN: I save the configuration file ===
    // === AND: I verify the persistence schema of the config file after changes being saved ===
    await verifyConfigFilePersistence(
      view,
      workbench,
      configPath,
      false,
      source,
      [destination],
      sourceBufferSize,
      [destinationBufferSize],
    );
  });

  /* Scenario: Delete the ASS→ASS stream from the stream list
   *     Given I am on the "DFG Stream List" tab
   *     And a "ASS→ASS" stream exists in the stream list
   *     When I select the "ASS→ASS" stream row
   *     And I click "Delete stream" and confirm the deletion
   *     Then the "ASS→ASS" stream is removed from the stream list
   *     And saving the configuration removes the "ASS→ASS" stream from the DFGTESTS configuration file
   */

  it("Delete the created stream ASS-ASS and verify the deletion in the UI and the config file", async () => {
    // Given the user is on the DFG config screen
    await openDfgTab();
    await switchToStreamListTab(view);
    // Get the initial stream row count before deleting the stream
    const initialStreamRowCount = await getStreamRowCount(view);
    // Select the stream to delete based on source and destination and click on delete button
    const streamToDelete = await selectStreamToDelete(view, "ASS", ["ASS"]);

    if (streamToDelete) {
      await UIUtils.clickElement(view, streamToDelete);
    } else {
      throw new Error("Stream to delete not found in the stream list");
    }
    await UIUtils.clickElement(view, deleteStreamButton);

    await UIUtils.clickElement(view, confirmDeleteStreamButton);

    // Verify the stream row count is decremented by 1 after stream deletion
    const expectedStreamRowCount = initialStreamRowCount - 1;
    expect(await getStreamRowCount(view)).to.equal(
      expectedStreamRowCount,
      "Stream row count in stream list should be decremented by 1 after deleting a stream",
    );

    await switchToDfgVisualisationTab(view);

    // === THEN: I save the configuration file ===
    // === AND: I verify the persistence schema of the config file after changes being saved ===
    await verifyConfigFilePersistence(
      view,
      workbench,
      configPath,
      true,
      source,
      [destination],
      sourceBufferSize,
      [destinationBufferSize],
    );
  });

  /* Scenario: Outbound stream selection auto-populates source and creates a ASS→BSS stream
   *     Given I reopen the DFGTests DFG cfsconfig file and navigate to the DFG tab
   *     And I am on the "DFG Visualisation" tab
   *     And I note the current inbound stream count for destination "BSS"
   *     And I note the current outbound stream count for source "ASS"
   *     And I note the current number of rows in the stream list
   *     When I select the "ASS" stream node
   *     And I click "Add outbound stream" for source "ASS"
   *     Then the stream source dropdown auto-populates with "ASS"
   *     When I select "BSS" as the stream destination
   *     And I enter a description and buffer size "64" for the stream
   *     And I create the stream
   *     Then the inbound stream count for "BSS" is incremented by 1
   *     And the outbound stream count for "ASS" is incremented by 1
   *     And the stream list contains a new row for a "ASS→BSS" stream with buffer size "64"
   *     When I save the configuration file
   *     Then the saved configuration persists a ASS→BSS stream for source "ASS" and destination "BSS"
   */

  it("Verify the outbound stream selection auto populates the stream source and create css-dde stream", async () => {
    // Given the user is on the DFG config screen
    await openDfgTab();
    const source: string = "ASS";
    const destination: string = "BSS";
    // Get the initial inbound and outbound stream counts before creating the stream
    const initialInboundStreamCount = await getInboundStreamCount(
      view,
      destination,
    );
    const initialOutboundStreamCount = await getOutboundStreamCount(
      view,
      source,
    );

    // Switch to stream list tab to get the initial stream row count before creating the stream
    await switchToStreamListTab(view);
    const initialStreamRowCount = await getStreamRowCount(view);

    // Switch back to visualisation tab to create the stream and select the source stream node and click on add outbound stream button
    await switchToDfgVisualisationTab(view);
    await UIUtils.clickElement(view, selectStream(source));

    await UIUtils.clickElement(view, addOutboundStreamButton(source));

    // Verify that stream source dropdown auto-populates with "ASS"
    const streamSourceDropdownElement = await UIUtils.findWebElement(
      view,
      streamSourceDropdown,
    );
    expect(
      await streamSourceDropdownElement.getAttribute("current-value"),
    ).to.equal(
      source,
      'Stream source dropdown should auto populate with "ASS"',
    );

    // Select the destination from the dropdown, enter stream description and buffer sizes and create the stream
    await UIUtils.selectOptionFromDropdown(
      view,
      streamDestinationDropdown,
      streamDestinationOption(destination),
    );

    await UIUtils.clickElement(view, streamDestinationDropdown);

    await createStreamWithValues(
      view,
      source,
      destination,
      sourceBufferSize,
      destinationBufferSize,
    );

    // Verify the inbound and outbound stream counts are incremented by 1 after stream creation
    expect(await getInboundStreamCount(view, destination)).to.equal(
      initialInboundStreamCount + 1,
      "Inbound stream count should be incremented by 1 after adding an inbound stream",
    );

    expect(await getOutboundStreamCount(view, source)).to.equal(
      initialOutboundStreamCount + 1,
      "Outbound stream count should be incremented by 1 after adding an outbound stream",
    );

    // Switch to stream list tab and verify the stream row count is incremented by 1 after stream creation
    await switchToStreamListTab(view);
    const expectedStreamRowCount = initialStreamRowCount + 1;
    expect(await getStreamRowCount(view)).to.equal(
      expectedStreamRowCount,
      "Stream row count in stream list should be incremented by 1 after adding a stream",
    );

    // Verify the values in the newly added stream row in the stream list
    const [
      sourceStreamValue,
      destinationStreamValue,
      sourceBufferSizeValue,
      destinationBufferSizeValue,
    ] = await validateStreamListValues(view, expectedStreamRowCount);

    expect(sourceStreamValue).to.equal(
      source,
      "Source stream value should match the selected stream",
    );
    expect(destinationStreamValue).to.equal(
      destination,
      "Destination stream value should match the selected stream",
    );
    expect(sourceBufferSizeValue).to.equal(
      sourceBufferSize,
      "Source buffer size value should match the selected buffer size",
    );
    expect(destinationBufferSizeValue).to.equal(
      destinationBufferSize,
      "Destination buffer size value should match the selected buffer size",
    );

    await switchToDfgVisualisationTab(view);

    // === THEN: I save the configuration file ===
    // === AND: I verify the persistence schema of the config file after changes being saved ===
    await verifyConfigFilePersistence(
      view,
      workbench,
      configPath,
      false,
      source,
      [destination],
      sourceBufferSize,
      [destinationBufferSize],
    );
  });

  /* Scenario: Delete the ASS→BSS stream from the DFG visualisation
   *     Given the DFGTESTS DFG cfsconfig file is opened on the "DFG Visualisation" tab
   *     And a "ASS→BSS" stream exists for source "ASS" and destination "BSS"
   *     When I select the "ASS" stream node
   *     And I open the configuration for the "ASS→BSS" stream
   *     And I click "Delete stream" and confirm the deletion
   *     Then the "ASS→BSS" stream is removed from the configuration
   *     And saving the configuration removes the "ASS→BSS" stream from the DFGTESTS configuration file
   */

  it("Delete the created stream ASS-BSS list and verify the deletion in the UI and the config file", async () => {
    // Given the user is on the DFG config screen
    await openDfgTab();
    const source: string = "ASS";
    const destination: string = "BSS";

    await switchToStreamListTab(view);
    // Get the initial stream row count before deleting the stream
    const initialStreamRowCount = await getStreamRowCount(view);
    await switchToDfgVisualisationTab(view);
    // Deleteing the stream via edit button in the visualisation tab
    await UIUtils.clickElement(view, selectStream(source));
    await UIUtils.clickElement(
      view,
      createdStreamConfigButton(getStreamDescription(source, [destination])),
    );

    await UIUtils.clickElement(view, deleteStreamButton);

    await UIUtils.clickElement(view, confirmDeleteStreamButton);

    await switchToStreamListTab(view);
    // Verify the stream row count is decremented by 1 after stream deletion
    const expectedStreamRowCount = initialStreamRowCount - 1;
    expect(await getStreamRowCount(view)).to.equal(
      expectedStreamRowCount,
      "Stream row count in stream list should be decremented by 1 after deleting a stream",
    );
    await switchToDfgVisualisationTab(view);

    // === THEN: I save the configuration file ===
    // === AND: I verify the persistence schema of the config file after changes being saved ===
    await verifyConfigFilePersistence(
      view,
      workbench,
      configPath,
      true,
      source,
      [destination],
      sourceBufferSize,
      [destinationBufferSize],
    );
  });

  /* Scenario: Single source with multiple destinations (FSS→GSS and FSS→ASS)
   *     Given I reopen the DFGTests DFG cfsconfig file and navigate to the DFG tab
   *     And I am on the "DFG Visualisation" tab
   *     And I use source "FSS"
   *     And I note the current inbound stream count for destination "GSS"
   *     And I note the current inbound stream count for destination "ASS"
   *     And I note the current outbound stream count for source "FSS"
   *     And I note the current number of rows in the stream list
   *     When I select the "FSS" stream node
   *     And I click "Add outbound stream" for source "FSS"
   *     Then the stream source dropdown auto-populates with "FSS"
   *     When I open the destination dropdown
   *     And I select destinations "GSS" and "ASS"
   *     And I enter a description combining "FSS-GSS,FSS-ASS"
   *     And I set the source buffer size to "64"
   *     And I set the destination buffer size to "64" for "GSS"
   *     And I set the destination buffer size to "64" for "ASS"
   *     And I create the stream
   *     Then the inbound stream count for "GSS" is incremented by 1
   *     And the inbound stream count for "ASS" is incremented by 1
   *     And the outbound stream count for "FSS" is incremented by 1
   *     When I save the configuration file
   *     Then the saved configuration persists an FSS→GSS stream and an FSS→ASS stream with buffer size "64"
   */

  it("Verify the stream creation - single source multiple destinations ", async () => {
    // Given the user is on the DFG config screen
    await openDfgTab();
    const source: string = "FSS";
    const multiDestination: string[] = ["GSS", "ASS"];
    const multiDestinationBufferSize: number[] = [64, 64];
    // Get the initial inbound and outbound stream counts before creating the streams
    const initialFirstInboundStreamCount = await getInboundStreamCount(
      view,
      multiDestination[0],
    );
    const initialSecondInboundStreamCount = await getInboundStreamCount(
      view,
      multiDestination[1],
    );
    const initialOutboundStreamCount = await getOutboundStreamCount(
      view,
      source,
    );

    await switchToStreamListTab(view);
    await switchToDfgVisualisationTab(view);
    // Select the source stream node and click on add outbound stream button
    await UIUtils.clickElement(view, selectStream(source));
    await UIUtils.clickElement(view, addOutboundStreamButton(source));

    // Verify that stream source dropdown auto-populates with "FSS"
    const streamSourceDropdownElement = await UIUtils.findWebElement(
      view,
      streamSourceDropdown,
    );
    expect(
      await streamSourceDropdownElement.getAttribute("current-value"),
    ).to.equal(
      source,
      'Stream source dropdown should auto populate with "FSS"',
    );

    // Select the destinations from the dropdown, enter stream description and buffer sizes and create the stream
    await UIUtils.clickElement(view, streamDestinationDropdown);
    await UIUtils.clickElement(
      view,
      streamDestinationOption(multiDestination[0]),
    );
    await UIUtils.clickElement(
      view,
      streamDestinationOption(multiDestination[1]),
    );
    await UIUtils.clickElement(view, streamDestinationDropdown);

    // Stream Description and buffer size
    const streamDescriptionInput = await UIUtils.findWebElement(
      view,
      streamDescription,
    );
    await UIUtils.clickElement(view, streamDescriptionInput);
    await streamDescriptionInput.sendKeys(
      source +
        "-" +
        multiDestination[0] +
        ", " +
        source +
        "-" +
        multiDestination[1],
    );

    await UIUtils.selectOptionFromDropdown(
      view,
      sourceBufferSizeDropdown,
      sourceBufferSizeOption(sourceBufferSize),
    );
    await UIUtils.selectOptionFromDropdown(
      view,
      destinationBufferSizeDropdown(multiDestination[0]),
      destinationBufferSizeOption(
        multiDestination[0],
        multiDestinationBufferSize[0],
      ),
    );
    const destBufferSizeDropdown = await UIUtils.findWebElement(
      view,
      destinationBufferSizeDropdown(multiDestination[1]),
    );
    await VSBrowser.instance.driver.executeScript(
      "arguments[0].scrollIntoView()",
      destBufferSizeDropdown,
    );
    await UIUtils.selectOptionFromDropdown(
      view,
      destinationBufferSizeDropdown(multiDestination[1]),
      destinationBufferSizeOption(
        multiDestination[1],
        multiDestinationBufferSize[1],
      ),
    );

    await UIUtils.clickElement(view, createStreamButton);

    // Verify the inbound and outbound stream counts are incremented by 1 after stream creation
    expect(await getInboundStreamCount(view, multiDestination[0])).to.equal(
      initialFirstInboundStreamCount + 1,
      "Inbound stream count should be incremented by 1 after adding an inbound stream",
    );

    expect(await getInboundStreamCount(view, multiDestination[1])).to.equal(
      initialSecondInboundStreamCount + 1,
      "Inbound stream count should be incremented by 1 after adding an inbound stream",
    );

    expect(await getOutboundStreamCount(view, source)).to.equal(
      initialOutboundStreamCount + 1,
      "Outbound stream count should be incremented by 1 after adding an outbound stream",
    );

    // === THEN: I save the configuration file ===
    // === AND: I verify the persistence schema of the config file after changes being saved ===
    await verifyConfigFilePersistence(
      view,
      workbench,
      configPath,
      false,
      source,
      multiDestination,
      sourceBufferSize,
      multiDestinationBufferSize,
    );
  });

  /* Scenario: Delete the FSS→GSS and FSS→ASS streams from the stream list
   *     Given I am on the "DFG Stream List" tab
   *     And "FSS→GSS" and "FSS→ASS" streams exist in the stream list
   *     When I select the combined FSS stream entry for destinations "GSS" and "ASS"
   *     And I click "Delete stream" and confirm the deletion
   *     Then the FSS→GSS and FSS→ASS streams are removed from the stream list
   *     And saving the configuration removes the FSS→GSS and FSS→ASS streams from the DFGTESTS configuration file
   */

  it("Delete the created stream FSS-GSS, FSS-ASS and verify the deletion in the UI and the config file", async () => {
    // Given the user is on the DFG config screen
    await openDfgTab();
    await switchToStreamListTab(view);
    const source: string = "FSS";
    const multiDestination: string[] = ["GSS", "ASS"];
    const multiDestinationBufferSize: number[] = [64, 64];
    // Get the initial stream row count before deleting the streams
    const initialStreamRowCount = await getStreamRowCount(view);

    // Select the stream to delete based on source and multiple destinations and click on delete button
    const streamToDelete = await selectStreamToDelete(view, "FSS", [
      "GSS",
      "ASS",
    ]);

    if (streamToDelete) {
      await UIUtils.clickElement(view, streamToDelete);
    } else {
      throw new Error("Stream to delete not found in the stream list");
    }

    await UIUtils.clickElement(view, deleteStreamButton);

    await UIUtils.clickElement(view, confirmDeleteStreamButton);

    // Verify both FSS→GSS and FSS→ASS streams are deleted together and stream count is decremented by 2 after stream deletion
    const expectedStreamRowCount = initialStreamRowCount - 2;
    expect(await getStreamRowCount(view)).to.equal(
      expectedStreamRowCount,
      "Stream row count in stream list should be decremented by 2 after deleting a stream",
    );

    await switchToDfgVisualisationTab(view);

    // === THEN: I save the configuration file ===
    // === AND: I verify the persistence schema of the config file after changes being saved ===
    await verifyConfigFilePersistence(
      view,
      workbench,
      configPath,
      true,
      source,
      multiDestination,
      sourceBufferSize,
      multiDestinationBufferSize,
    );
  });

  /* Scenario: Outbound stream selection auto-populates source and creates a ASS→ESS stream
   *     Given I reopen the DFGTests DFG cfsconfig file and navigate to the DFG tab
   *     And I am on the "DFG Visualisation" tab
   *     And I note the current inbound stream count for destination "ESS"
   *     And I note the current outbound stream count for source "ASS"
   *     And I note the current number of rows in the stream list
   *     When I select the "ASS" stream node
   *     And I click "Add outbound stream" for source "ASS"
   *     Then the stream source dropdown auto-populates with "ASS"
   *     When I select "BSS" as the stream destination
   *     And I enter a description and buffer size "64" for the stream
   *     And I create the stream
   *     Then the inbound stream count for "ESS" is incremented by 1
   *     And the outbound stream count for "ASS" is incremented by 1
   *     And the stream list contains a new row for a "ASS→ESS" stream with buffer size "64"
   *     When I save the configuration file
   *     Then the saved configuration persists a ASS→ESS stream for source "ASS" and destination "ESS"
   */

  it("Create a ASS-ESS stream", async () => {
    // Given the user is on the DFG config screen
    await openDfgTab();
    const source: string = "ASS";
    const destination: string = "ESS";
    // Get the initial inbound and outbound stream counts before creating the stream
    const initialInboundStreamCount = await getInboundStreamCount(
      view,
      destination,
    );
    const initialOutboundStreamCount = await getOutboundStreamCount(
      view,
      source,
    );

    await switchToStreamListTab(view);
    // Get the initial stream row count before creating the stream
    const initialStreamRowCount = await getStreamRowCount(view);
    await switchToDfgVisualisationTab(view);
    // Select the source stream node and click on add outbound stream button
    await UIUtils.clickElement(view, selectStream(source));

    await UIUtils.clickElement(view, addOutboundStreamButton(source));

    // Select the destination from the dropdown, enter stream description and buffer sizes and create the stream
    await UIUtils.selectOptionFromDropdown(
      view,
      streamDestinationDropdown,
      streamDestinationOption(destination),
    );

    await UIUtils.clickElement(view, streamDestinationDropdown);

    const destinationBufferSizeCurrentValue = await getDropdownCurrentValue(
      view,
      destinationBufferSizeDropdown(destination),
    );

    await createStreamWithValues(
      view,
      source,
      destination,
      sourceBufferSize,
      destinationBufferSize,
    );

    // Verify the inbound and outbound stream counts are incremented by 1 after stream creation
    expect(await getInboundStreamCount(view, destination)).to.equal(
      initialInboundStreamCount + 1,
      "Inbound stream count should be incremented by 1 after adding an inbound stream",
    );

    expect(await getOutboundStreamCount(view, source)).to.equal(
      initialOutboundStreamCount + 1,
      "Outbound stream count should be incremented by 1 after adding an outbound stream",
    );

    // Switch to stream list tab and verify the stream row count is incremented by 1 after stream creation
    await switchToStreamListTab(view);
    const expectedStreamRowCount = initialStreamRowCount + 1;
    expect(await getStreamRowCount(view)).to.equal(
      expectedStreamRowCount,
      "Stream row count in stream list should be incremented by 1 after adding a stream",
    );

    // Verify the values in the newly added stream row in the stream list
    const [
      sourceStreamValue,
      destinationStreamValue,
      sourceBufferSizeValue,
      destinationBufferSizeValue,
    ] = await validateStreamListValues(view, expectedStreamRowCount);

    expect(sourceStreamValue).to.equal(
      source,
      "Source stream value should match the selected stream",
    );
    expect(destinationStreamValue).to.equal(
      destination,
      "Destination stream value should match the selected stream",
    );
    expect(sourceBufferSizeValue).to.equal(
      sourceBufferSize,
      "Source buffer size value should match the selected buffer size",
    );
    expect(destinationBufferSizeValue).to.equal(
      destinationBufferSizeCurrentValue,
      "Destination buffer size value should match the selected buffer size",
    );

    await switchToDfgVisualisationTab(view);

    // === THEN: I save the configuration file ===
    // === AND: I verify the persistence schema of the config file after changes being saved ===
    await verifyConfigFilePersistence(
      view,
      workbench,
      configPath,
      false,
      source,
      [destination],
      sourceBufferSize,
      [destinationBufferSizeCurrentValue],
    );
  });

  /* Scenario: Create an ESS stream with multiple destinations ESS→ESS, ESS→FSS, ESS→GSS
   *     Given the DFGTESTS DFG cfsconfig file is opened on the "DFG Visualisation" tab
   *     And I use source "ESS"
   *     And I note the current inbound stream count for destinations "ESS", "FSS" and "GSS"
   *     And I note the current outbound stream count for source "ESS"
   *     When I select the "ESS" stream node
   *     And I click "Add outbound stream" for source "ESS"
   *     And I select destinations "ESS", "FSS" and "GSS" in the destination dropdown
   *     And I enter a description combining "ESS-ESS, ESS-FSS, ESS-GSS"
   *     And I tie the source buffer size to the selected destination buffer size
   *     And I set the destination buffer sizes
   *     And I create the stream
   *     Then the inbound stream count for "ESS", "FSS" and "GSS" is incremented by 1
   *     And the outbound stream count for "ESS" is incremented by 1
   *     And saving the configuration persists ESS→ESS, ESS→FSS and ESS→GSS streams with the configured buffer sizes
   */

  it("Create a multiple destinations stream ESS-ESS, ESS-FSS, ESS-GSS", async () => {
    // Given the user is on the DFG config screen
    await openDfgTab();
    const source: string = "ESS";
    const multiDestination: string[] = ["ESS", "FSS", "GSS"];
    let multiDestinationBufferSize: number[] = [0, 64, 64];
    // Get the initial inbound and outbound stream counts before creating the stream
    const initialFirstInboundStreamCount = await getInboundStreamCount(
      view,
      multiDestination[0],
    );
    const initialSecondInboundStreamCount = await getInboundStreamCount(
      view,
      multiDestination[1],
    );
    const initialThirdInboundStreamCount = await getInboundStreamCount(
      view,
      multiDestination[2],
    );
    const initialOutboundStreamCount = await getOutboundStreamCount(
      view,
      source,
    );

    await switchToStreamListTab(view);
    await switchToDfgVisualisationTab(view);
    // Select the source stream node and click on add outbound stream button
    await UIUtils.clickElement(view, selectStream(source));
    await UIUtils.clickElement(view, addOutboundStreamButton(source));

    // Select the destinations from the dropdown, enter stream description and buffer sizes and create the stream
    await UIUtils.clickElement(view, streamDestinationDropdown);
    await UIUtils.clickElement(
      view,
      streamDestinationOption(multiDestination[0]),
    );
    await UIUtils.clickElement(
      view,
      streamDestinationOption(multiDestination[1]),
    );
    await UIUtils.clickElement(
      view,
      streamDestinationOption(multiDestination[2]),
    );
    await UIUtils.clickElement(view, streamDestinationDropdown);

    // Stream Description and buffer size
    const streamDescriptionInput = await UIUtils.findWebElement(
      view,
      streamDescription,
    );
    await UIUtils.clickElement(view, streamDescriptionInput);
    await streamDescriptionInput.sendKeys(
      source +
        "-" +
        multiDestination[0] +
        ", " +
        source +
        "-" +
        multiDestination[1] +
        ", " +
        source +
        "-" +
        multiDestination[2],
    );

    // Select the tied source stream from dorpdown
    await UIUtils.clickElement(view, tiedSourceStreamDropdown);

    await UIUtils.clickElement(view, tiedSourceStreamDropdownOption);

    const sourceBufferSizeCurrentValue = await getDropdownCurrentValue(
      view,
      sourceBufferSizeDropdown,
    );
    const destinationBufferSizeCurrentValue = await getDropdownCurrentValue(
      view,
      destinationBufferSizeDropdown(multiDestination[0]),
    );
    multiDestinationBufferSize[0] = destinationBufferSizeCurrentValue;

    const destBufferSizeDropdown = await UIUtils.findWebElement(
      view,
      destinationBufferSizeDropdown(multiDestination[1]),
    );
    await VSBrowser.instance.driver.executeScript(
      "arguments[0].scrollIntoView()",
      destBufferSizeDropdown,
    );

    // Set the multiple destinations
    await UIUtils.selectOptionFromDropdown(
      view,
      destinationBufferSizeDropdown(multiDestination[1]),
      destinationBufferSizeOption(
        multiDestination[1],
        multiDestinationBufferSize[1],
      ),
    );

    await UIUtils.selectOptionFromDropdown(
      view,
      destinationBufferSizeDropdown(multiDestination[2]),
      destinationBufferSizeOption(
        multiDestination[2],
        multiDestinationBufferSize[2],
      ),
    );

    await UIUtils.clickElement(view, createStreamButton);

    // Verify the inbound and outbound stream counts are incremented by 1 after stream creation
    expect(await getInboundStreamCount(view, multiDestination[0])).to.equal(
      initialFirstInboundStreamCount + 1,
      "Inbound stream count should be incremented by 1 after adding an inbound stream",
    );

    expect(await getInboundStreamCount(view, multiDestination[1])).to.equal(
      initialSecondInboundStreamCount + 1,
      "Inbound stream count should be incremented by 1 after adding an inbound stream",
    );

    expect(await getInboundStreamCount(view, multiDestination[2])).to.equal(
      initialThirdInboundStreamCount + 1,
      "Inbound stream count should be incremented by 1 after adding an inbound stream",
    );

    expect(await getOutboundStreamCount(view, source)).to.equal(
      initialOutboundStreamCount + 1,
      "Outbound stream count should be incremented by 1 after adding an outbound stream",
    );

    // === THEN: I save the configuration file ===
    // === AND: I verify the persistence schema of the config file after changes being saved ===
    await verifyConfigFilePersistence(
      view,
      workbench,
      configPath,
      false,
      source,
      multiDestination,
      sourceBufferSizeCurrentValue,
      multiDestinationBufferSize,
    );
  });

  /* Scenario: Verify deletion of tied ASS→ESS stream
   *     Given I am on the "DFG Stream List" tab
   *     And a ASS→ESS stream exists that is tied to an ESS→ESS stream
   *     When I attempt to delete the ASS→ESS stream
   *     Then I see an error message "Error: Cannot delete stream"
   *     And the ASS→ESS stream is not deleted
   *     When I delete the ESS→ESS, ESS→FSS and ESS→GSS streams
   *     And I delete the ASS→ESS stream again
   *     Then the ASS→ESS stream is deleted without error
   *     And the stream list shows only the header row
   */

  it("Delete the created ASS-ESS stream and verify the message that it is a tied stream, delete the ESS-ESS,FSS,GSS stream followed by ASS-ESS stream", async () => {
    // Given the user is on the DFG config screen
    await openDfgTab();
    await switchToStreamListTab(view);
    const initialStreamRowCount = await getStreamRowCount(view);

    //Select the tied stream to delete
    const tiedStreamToDelete = await selectStreamToDelete(view, "ASS", ["ESS"]);

    if (tiedStreamToDelete) {
      await UIUtils.clickElement(view, tiedStreamToDelete);
    } else {
      throw new Error("Stream to delete not found in the stream list");
    }

    await UIUtils.clickElement(view, deleteStreamButton);

    const modelDialog = await UIUtils.findWebElement(view, modelDialogHeader);
    const modelDialogText = await modelDialog.getText();

    // As the tied stream ASS-ESS is required to create ESS-ESS stream, directly deleting ASS-ESS stream should show an error message that it is a tied stream and cannot be deleted.
    // Verify that the error message is shown when deleteing the tied stream ASS-ESS
    expect(
      modelDialogText,
      "An error message is shown a it is a tied stream",
    ).to.equal("Error: Cannot delete stream");

    await UIUtils.clickElement(view, modalDialogCancelButton);

    await UIUtils.clickElement(view, sidePanelCloseButton);

    // Select the ESS-ESS stream to delete
    const streamToDelete = await selectStreamToDelete(view, "ESS", [
      "ESS",
      "FSS",
      "GSS",
    ]);

    if (streamToDelete) {
      await UIUtils.clickElement(view, streamToDelete);
    } else {
      throw new Error("Stream to delete not found in the stream list");
    }

    // However once the ESS-ESS stream is deleted, ASS-ESS stream is no longer a tied stream and can be deleted without showing the error message.
    // Deleting the ESS-ESS, ESS-FSS, ESS-GSS streams
    await UIUtils.clickElement(view, deleteStreamButton);
    await UIUtils.clickElement(view, confirmDeleteStreamButton);

    const expectedStreamRowCount = initialStreamRowCount - 3;
    expect(await getStreamRowCount(view)).to.equal(
      expectedStreamRowCount,
      "Stream row count in stream list should be decremented by 3 after deleting the streams",
    );

    // Deleting the ASS-ESS stream
    if (tiedStreamToDelete) {
      await UIUtils.clickElement(view, tiedStreamToDelete);
    } else {
      throw new Error("Stream to delete not found in the stream list");
    }
    await UIUtils.clickElement(view, deleteStreamButton);
    await UIUtils.clickElement(view, confirmDeleteStreamButton);

    // Verify the stream row count is decremented by 1 after deleting the tied stream ASS-ESS
    const expectedStreamCountAfterDeletingTiedStream =
      expectedStreamRowCount - 1;
    expect(await getStreamRowCount(view)).to.equal(
      expectedStreamCountAfterDeletingTiedStream,
      "Stream row count in stream list should be decremented by 1 after deleting the tied stream",
    );

    // === THEN: I save the configuration file ===
    // === AND: I verify the persistence schema of the config file after changes being saved ===
    await verifyConfigFilePersistence(
      view,
      workbench,
      configPath,
      true,
      "ASS",
      ["ESS"],
      64,
      [4096],
    );
  });

  /* Scenario: Validate required fields when creating a stream
   *     Given I am on the "DFG Visualisation" tab
   *     When I open the "Create stream" dialog without selecting any fields
   *     Then the "Create" button is disabled
   *     When I select source "DSS" and leave the destination empty and click "Create"
   *     Then I see an error message "At least one destination gasket is required"
   *     When I select destination "BSS" and enter a description "DSS-BSS"
   *     And I create the stream
   *     Then saving the configuration persists a DSS→BSS stream with the default buffer sizes
   */

  it("Verify the error messages when required fields are empty", async () => {
    await openDfgTab();
    const source: string = "DSS";
    const destination: string = "BSS";
    const defaultSourceBufferSize: number = 32;
    const defaultDestinationBufferSize: number = 32;
    await UIUtils.clickElement(view, mainCreateStreamButton);
    // When no required fields are selected, "Create" button is disabled
    const createStreamButtonElement = await UIUtils.findWebElement(
      view,
      createStreamButton,
    );
    expect(await createStreamButtonElement.getAttribute("class")).to.contain(
      "disabled",
      "Create Stream button should be disabled when required fields are empty",
    );
    // Selecting the source as DSS
    await UIUtils.selectOptionFromDropdown(
      view,
      streamSourceDropdown,
      streamSourceOption(source),
    );

    await UIUtils.clickElement(view, createStreamButton);

    // When destination is not selected and create button is clicked, an error message should be shown that at least one destination is required
    const destinationMissingError = await UIUtils.findWebElement(
      view,
      destinationError,
    );
    expect(
      await destinationMissingError.getText(),
      "Destination error message should be displayed",
    ).to.equal("At least one destination gasket is required");

    // Selecting the destination as BSS
    await UIUtils.selectOptionFromDropdown(
      view,
      streamDestinationDropdown,
      streamDestinationOption(destination),
    );

    await UIUtils.clickElement(view, streamDestinationDropdown);

    const streamDescriptionInput = await UIUtils.findWebElement(
      view,
      streamDescription,
    );
    await UIUtils.clickElement(view, streamDescriptionInput);
    await streamDescriptionInput.sendKeys(source + "-" + destination);

    await UIUtils.clickElement(view, createStreamButton);

    // === THEN: I save the configuration file ===
    // === AND: I verify the persistence schema of the config file after changes being saved ===
    await verifyConfigFilePersistence(
      view,
      workbench,
      configPath,
      false,
      source,
      [destination],
      defaultSourceBufferSize,
      [defaultDestinationBufferSize],
    );
  });
});
