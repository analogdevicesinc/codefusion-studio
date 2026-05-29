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
 * These tests cover the persistence schema of the DFG and Automation suite as well
 */

import { expect } from "chai";
import {
  By,
  EditorView,
  ModalDialog,
  VSBrowser,
  WebView,
  Workbench,
} from "vscode-extension-tester";
import {
  dfgSection,
  createStreamButton,
  panelHeading,
  streamSourceDropdown,
  selectSourceOption,
  streamDestination,
  destinationDropDown,
  sourceBufferSizeSelection,
  sourceBufferValue,
  streamDescriptionInput,
  createGroupAction,
  destinationDropdown,
  groupNameTextbox,
  groupDropdown,
  tiedStreamDropdown,
  createStreamSidePanelButton,
  openSidebar,
  selectSource,
  selectMultipleDestinations,
  sourceStreamDropdownContent,
  dfgVisualisationButton,
  viewDropdownContainer,
  groupViewOption,
  gasketViewOption,
  groupAccordion,
  gasketAccordion,
} from "../../page-objects/dfg-section/dfg-visualisation-screen";
import {
  destinationBufferValue,
  streamRow,
  streamRowEditButtonWithDescription,
  validateStreamProperty,
  streamList,
  exportAsCsvButton,
  sourceFilterButton,
  destinationFilterButton,
  groupFilterButton,
  sourceMultiselectOption,
  destinationMultiselectOption,
  groupMultiselectOption,
  streamTableGrid,
  searchInput,
  streamRowByGroup,
  clearAllFiltersButton,
} from "../../page-objects/dfg-section/dfg-stream-list.screen";
import { UIUtils } from "../../../ui-test-utils/ui-utils";
import {
  getConfigPathForFile,
  parseJSONFile,
} from "../../config-tools-utility/cfsconfig-utils";
import {
  assertPersistedStreamForSource,
  type PersistedDFGStream,
} from "../../page-objects/dfg-section/dfg-persistence-assertions";

/*
 * Feature: System Planner Data Flow Gasket (DFG) Creation and Configuration
 *     As a CodeFusion Studio user
 *     I want to create stream of Data Flow Gasket
 *     So that I can ensure  streams are getting created successfully
 *
 * Background:
 *     Given VS Code is open with the CodeFusion Studio extension loaded
 *     And all editors are closed
 *     And all notifications are dismissed
 */

describe("dfg - create stream via create stream button and verify its persistence", () => {
  // === Test Configuration setup ===
  const configFile = "dfgTests-dfg.cfsconfig";
  const configPath = getConfigPathForFile(configFile);

  let workbench: Workbench;
  let browser: VSBrowser;
  let view: WebView;

  before(async () => {
    browser = VSBrowser.instance;
    await new EditorView().closeAllEditors();
    await UIUtils.sleep(3000);
  });

  //===TestData===
  const groupName = "Group1";

  // === Reusable Test Utilities ===
  const setupWebViewEnvironment = async (
    configPath: string,
    navigationSelector: By,
  ) => {
    await browser.openResources(configPath);
    workbench = new Workbench();
    view = new WebView();
    await view.wait(8000);
    await UIUtils.dismissAllNotifications(workbench, browser);
    await view.switchToFrame(5000);
    await UIUtils.clickElement(view, navigationSelector);
  };

  after(async () => {
    if (view) {
      await view.switchBack();
      await new Workbench().executeCommand("revert and close editor");
    }
  });

  // * Scenario: User has loaded the DFG page and clicks on create button
  //    *     Given the existing cfsconfig file with DFG configuration is opened
  //    *     Then switch to frame
  //    *     And I click on the "DFG" navigation tab
  //    *     Then I click on the create stream button and verify sidebar has been opened and create button is disabled
  //    *     And I select source as "ASS"
  //    *     Then verify the source is selected as "ASS"
  //    *     And I enter destination as "DSS"
  //    *     Then verify the destination is selected as "DSS"
  //    *     And I select buffer size for source and destination as "128"
  //    *     Then verify the buffer size for source and destination is selected as "128"
  //    *     And I enter alias name as "ASS_to_DSS"
  //    *     And I enter Destination group name as "Group1"
  //    *     Then I click on create stream button
  //    *     And I click on stream list in the left panel to navigate to stream list view
  //    *     Then I verify the stream is created in the stream list with correct source and destination
  //    *     And I verify the alias name and group name is displayed correctly in the stream list
  //    *     And I navigate to DFG Visualisation
  //    *     Then I select Group view from the view dropdown
  //    *     And I verify Group1 accordion is displayed in the DFG visualisation
  //    *     Then I expand Group1 accordion and verify stream description "ASS_to_DSS" is visible
  //    *     And I select Gasket view from the view dropdown
  //    *     Then I verify ASS gasket accordion is displayed in the DFG visualisation
  //    *     And I save the configuration file
  //    *     Then I verify the persistence schema of the config file after changes being saved, validating that the created stream with correct properties exists in the config file

  it("Should create DFG stream on UI and should reflect in the stream list", async () => {
    // === GIVEN: The existing cfsconfig file with DFG configuration is opened ===
    // === THEN: Switch to frame ===
    // === AND: I click on the "DFG" navigation tab ===
    await setupWebViewEnvironment(configPath, dfgSection);

    // === THEN: I click on the create stream button and verify sidebar has been opened and create button is disabled ===
    const sidebarHeading = await openSidebar(
      view,
      createStreamButton,
      panelHeading,
    );
    expect(
      await sidebarHeading.isDisplayed(),
      "STREAM OPTIONS sidebar should be opened",
    ).to.be.true;

    const disabledCreateButton = await UIUtils.findWebElement(
      view,
      createStreamSidePanelButton,
    );

    const valueDisabled = await UIUtils.getAttributeFromWebElement(
      disabledCreateButton,
      "class",
    );
    expect(valueDisabled.includes("disabled")).to.be.true;

    // === AND: I select source as "ASS" ===
    // === THEN: Verify the source is selected as "ASS" ===
    const selectedSource = await selectSource(
      view,
      streamSourceDropdown,
      selectSourceOption("ASS"),
    );
    expect(selectedSource, "Selected source should be ASS").to.equal("ASS");

    // === AND: I enter destination as "DSS" ===
    // === THEN: Verify the destination is selected as "DSS" ===
    const [isDssVisible] = await selectMultipleDestinations(
      view,
      destinationDropDown,
      [streamDestination("DSS")],
    );
    expect(isDssVisible, "DSS should be visible").to.be.true;

    // === AND: I select buffer size for source and destination as 128 ===
    await UIUtils.selectOptionFromDropdown(
      view,
      sourceBufferSizeSelection,
      sourceBufferValue("128"),
    );
    await UIUtils.selectOptionFromDropdown(
      view,
      destinationDropdown,
      destinationBufferValue("128"),
    );

    // === THEN: Verify the buffer size for source and destination is selected as 128 ===
    const selectedBufferSizeElement = await UIUtils.findWebElement(
      view,
      sourceBufferSizeSelection,
    );
    const selectedBufferSizeText = await UIUtils.getAttributeFromWebElement(
      selectedBufferSizeElement,
      "current-value",
    );
    expect(selectedBufferSizeText, "Source buffer size should be 128").to.equal(
      "128",
    );

    // === AND: I enter alias name as "ASS_to_MultiDest" ===
    await UIUtils.sendKeysToElements(
      view,
      streamDescriptionInput,
      "ASS_to_DSS",
    );

    // === AND: I enter Destination group name as "Group1" ===
    await UIUtils.clickElement(view, groupDropdown);
    await UIUtils.sendKeysToElements(view, groupNameTextbox, groupName);
    await UIUtils.clickElement(view, createGroupAction);

    // === THEN: I click on create stream button ===
    await UIUtils.clickElement(view, createStreamSidePanelButton);

    // === AND: I click on stream list in the left panel to navigate to stream list view ===
    await UIUtils.clickElement(view, streamList);

    // === THEN: I verify the stream is created in the stream list with correct source and destination ===
    const createdStreamRow = await UIUtils.waitForElement(
      view,
      streamRow("ASS", "DSS"),
    );
    expect(
      await createdStreamRow.isDisplayed(),
      "Stream with ASS source and DSS destination should be visible in table",
    ).to.be.true;

    // === AND: I verify the source name and group name is displayed correctly in the stream list ===
    const groupElement = await UIUtils.findWebElement(
      view,
      validateStreamProperty("ASS", groupName),
    );
    expect(
      await groupElement.isDisplayed(),
      "Group name should be visible in stream list",
    ).to.be.true;

    // === AND: I navigate to DFG Visualisation ===
    await UIUtils.clickElement(view, dfgVisualisationButton);
    console.log("Navigated back to DFG Visualisation");

    // === THEN: I select Group view from the view dropdown ===
    await UIUtils.clickElement(view, viewDropdownContainer);
    console.log("Opened DFG view dropdown");

    await UIUtils.clickElement(view, groupViewOption);
    console.log("Selected Group filter option");

    // === AND: I verify Group1 accordion is displayed in the DFG visualisation ===
    const groupFilteredElement = await UIUtils.findWebElement(
      view,
      groupAccordion(groupName),
    );

    expect(
      await groupFilteredElement.isDisplayed(),
      `${groupName} should be visible after filtering by Group`,
    ).to.be.true;
    console.log("✅ UI successfully filtered by Group - Group1 is visible");

    // === THEN: I expand Group1 accordion and verify stream description "ASS_to_DSS" is visible ===
    await UIUtils.clickElement(view, groupAccordion(groupName));

    const createdStreamDescription = "ASS_to_DSS";
    const createdGroupStreamDescriptionElement = await UIUtils.findWebElement(
      view,
      By.xpath(`//*[normalize-space(text())="${createdStreamDescription}"]`),
    );
    expect(
      await createdGroupStreamDescriptionElement.isDisplayed(),
      `Stream description ${createdStreamDescription} should be visible in the group accordion`,
    ).to.be.true;

    // === AND: I select Gasket view from the view dropdown ===
    await UIUtils.clickElement(view, viewDropdownContainer);
    console.log("Reopened DFG view dropdown");

    await UIUtils.clickElement(view, gasketViewOption);
    console.log("Selected Gasket filter option");

    // === THEN: I verify ASS gasket accordion is displayed in the DFG visualisation ===
    const gasketFilteredElement = await UIUtils.findWebElement(
      view,
      gasketAccordion("ASS"),
    );
    expect(
      await gasketFilteredElement.isDisplayed(),
      "ASS gasket should be visible after filtering by Gasket",
    ).to.be.true;
    console.log(
      "✅ UI successfully filtered by Gasket - ASS gasket is visible",
    );

    // === AND: I save the configuration file ===
    await view.switchBack();
    await workbench.executeCommand("view: close all editors");
    const dialog = new ModalDialog();
    await dialog.pushButton("Save");

    console.log("Saved the configuration file");

    await UIUtils.sleep(300);

    // === AND: I verify the persistence schema of the config file after changes being saved ===
    const config = (await parseJSONFile(configPath)) as {
      DFG?: {
        Streams?: PersistedDFGStream[];
      };
    };

    assertPersistedStreamForSource(
      config.DFG?.Streams,
      false,
      "ASS",
      ["DSS"],
      "ASS_to_DSS",
      128,
      [128],
      "Group1",
    );

    console.log(
      "✅ Complete DFG stream with persistence validation scenario executed successfully",
    );
  });

  it("Issue:CFSIO-13394 and CFSIO-13400 - ASS as source and multidestinations is being covered here", async () => {
    /*
     * Scenario: User creates stream with multiple destinations
     *     Given the existing cfsconfig file with DFG configuration is opened
     *     Then switch to frame
     *     And I click on the "DFG" navigation tab
     *     Then I click on the create stream button and verify sidebar has been opened
     *     And I select source as "ASS"
     *     Then verify the source is selected as "ASS"
     *     And I enter destination as "DSS","ESS" and "FSS"
     *     Then verify the destination is selected as "DSS"
     *     And I select buffer size for source and destination as 128
     *     Then verify the buffer size for source and destination is selected as 128
     *     And I enter alias name as "ASS_ESS_DSS_FSS"
     *     Then click on create stream button
     *     And I click on create stream again from DFG Visualisation
     *     And I select ESS as source and  multiple destinations to the new ESS stream (ESS, FSS, GSS)
     *     And I select source stream option as  "ASS → #"
     *     Then I verify if the required source stream option is selected
     *     And I enter alias name as "ESS_to_DSS_ESS_FSS"
     *     And  I  click on create stream button
     *     Then click on stream list in the left panel to navigate to stream list view  and verify if correctly landed
     *     And: I verify the description text is displayed correctly
     *     And edit the newly created stream
     *     Then the source stream option should be  "ASS → #1"
     *     And I click on create stream again from DFG Visualisation
     *     And create ASS Source and ESS destination stream again
     *     Then I verify the destination is selected as "ESS"
     *     And I enter alias name as "ASS_to_ESS_again"
     *     And I click on create stream button
     *     And I edit ESS stream again
     *     And the source stream option should be present "ASS → #2"
     *     Then select the source stream option as "ASS → #2" and verify the selection
     *     And I verify the ESS stream row has a valid numeric stream id
     *     Then I filter the stream list by Source = ASS
     *     And I verify ASS source rows with descriptions "ASS_to_DSS_ESS_FSS" and "ASS_to_ESS_again" are visible
     *     And I verify ESS rows are not visible when source filter is set to ASS
     *     Then I deselect Source = ASS filter
     *     And I filter the stream list by Destination = GSS
     *     Then I verify the ESS to GSS destination row and its description are visible
     *     And I deselect Destination = GSS filter
     *     Then I filter the stream list by Group = Group1
     *     And I verify Group1 rows are visible
     *     Then I deselect Group = Group1 filter
     *     And I verify all streams are visible after Group1 filter is deselected
     *     Then I search by description "ASS_to_DSS" and verify the matching stream is visible
     *     And I click "Clear all filters" button to clear all filters and search text
     *     Then I verify all streams are displayed after clearing all filters
     *     And I filter the stream list by Group = No group assigned
     *     Then I verify Group1 rows are not visible when No group assigned filter is selected
     *
     *
     */
    // === GIVEN: The existing cfsconfig file with DFG configuration is opened ===
    // === THEN: Switch to frame ===
    // === AND: I click on the "DFG" navigation tab ===
    // === THEN: I click on the create stream button and verify sidebar has been opened ===
    await setupWebViewEnvironment(configPath, dfgSection);
    const sidebarHeading = await openSidebar(
      view,
      createStreamButton,
      panelHeading,
    );
    expect(
      await sidebarHeading.isDisplayed(),
      "STREAM OPTIONS sidebar should be opened",
    ).to.be.true;

    // === AND: I select source as "ASS" ===
    // === THEN: Verify the source is selected as "ASS" ===
    const selectedSource = await selectSource(
      view,
      streamSourceDropdown,
      selectSourceOption("ASS"),
    );
    expect(selectedSource, "Selected source should be ASS").to.equal("ASS");

    // === And:I enter destination as "DSS","ESS" and "FSS" ===
    // === THEN: Verify the destinations are selected ===
    const [isDssVisibleInitial, isEssVisibleInitial, isFssVisibleInitial] =
      await selectMultipleDestinations(view, destinationDropDown, [
        streamDestination("DSS"),
        streamDestination("ESS"),
        streamDestination("FSS"),
      ]);
    expect(isDssVisibleInitial, "DSS should be visible").to.be.true;
    expect(isEssVisibleInitial, "ESS should be visible").to.be.true;
    expect(isFssVisibleInitial, "FSS should be visible").to.be.true;

    // === AND: I select buffer size for source and destination as 128 ===
    await UIUtils.selectOptionFromDropdown(
      view,
      sourceBufferSizeSelection,
      sourceBufferValue("128"),
    );
    await UIUtils.selectOptionFromDropdown(
      view,
      destinationDropdown,
      destinationBufferValue("128"),
    );

    // === THEN: Verify the buffer size for source and destination is selected as 128 ===
    const selectedBufferSizeElement = await UIUtils.findWebElement(
      view,
      sourceBufferSizeSelection,
    );
    const selectedBufferSizeText = await UIUtils.getAttributeFromWebElement(
      selectedBufferSizeElement,
      "current-value",
    );
    expect(selectedBufferSizeText, "Source buffer size should be 128").to.equal(
      "128",
    );

    // === And: I enter alias name as "ASS_ESS_DSS_FSS" ===
    await UIUtils.sendKeysToElements(
      view,
      streamDescriptionInput,
      "ASS_to_DSS_ESS_FSS",
    );

    // === THEN: Click on create stream button ===
    await UIUtils.clickElement(view, createStreamSidePanelButton);

    // === AND: I click on create stream button again from DFG Visualisation ===
    const sidebarHeadingSecond = await openSidebar(
      view,
      createStreamButton,
      panelHeading,
    );
    expect(
      await sidebarHeadingSecond.isDisplayed(),
      "STREAM OPTIONS sidebar should be opened",
    ).to.be.true;

    // === AND: I select ESS as source and multiple destinations to the new ESS stream (ESS, FSS, GSS) ===
    const selectedFftSource = await selectSource(
      view,
      streamSourceDropdown,
      selectSourceOption("ESS"),
    );
    expect(selectedFftSource, "Selected source should be ESS").to.equal("ESS");

    // Select multiple destinations for ESS stream
    const [isEssVisibleSecond, isFssVisibleSecond, isGssVisible] =
      await selectMultipleDestinations(view, destinationDropDown, [
        streamDestination("ESS"),
        streamDestination("FSS"),
        streamDestination("GSS"),
      ]);
    expect(isEssVisibleSecond, "ESS should be visible").to.be.true;
    expect(isFssVisibleSecond, "FSS should be visible").to.be.true;
    expect(isGssVisible, "GSS should be visible").to.be.true;

    // === AND: I select source stream option as "ASS → #1" ===
    // 1. Open stream source dropdown
    await UIUtils.clickElement(view, tiedStreamDropdown);
    // 2.Wait for dropdown content to be visible
    await UIUtils.waitForElement(view, sourceStreamDropdownContent);

    //===Then: I verify if the required source stream option is selected
    const sourceStreamOptionDiv = By.xpath(
      "//div[contains(@data-test, 'tied-stream-option') and .//span[contains(text(), 'ASS')]]",
    );

    // Wait specifically for the ASS option to be available
    await UIUtils.waitForElement(view, sourceStreamOptionDiv);

    await UIUtils.clickElement(view, sourceStreamOptionDiv);

    const tiedStreamElement = await UIUtils.findWebElement(
      view,
      tiedStreamDropdown,
    );
    const dropdownText = await tiedStreamElement.getText();
    expect(
      dropdownText,
      "Dropdown text should contain ASS reference",
    ).to.include("ASS");

    // And : I enter alias name as "ESS_to_DSS_ESS_FSS"
    await UIUtils.sendKeysToElements(
      view,
      streamDescriptionInput,
      "ESS_to_DSS_ESS_FSS",
    );

    // === THEN: Click on create stream button ===
    await UIUtils.clickElement(view, createStreamSidePanelButton);

    // === THEN: Click on stream list in the left panel to navigate to stream list view and verify if correctly landed ===
    await UIUtils.clickElement(view, streamList);

    const exportAsCsvDisplayed = await UIUtils.findWebElement(
      view,
      exportAsCsvButton,
    );
    expect(
      await exportAsCsvDisplayed.isDisplayed(),
      "Stream list view should be displayed",
    ).to.be.true;

    // === And: I verify the description text is displayed correctly ===

    const descriptionText = await UIUtils.findWebElement(
      view,
      validateStreamProperty("ESS", "ESS_to_DSS_ESS_FSS"),
    );
    expect(
      await descriptionText.isDisplayed(),
      "description should be visible in stream list",
    ).to.be.true;

    // === AND: Edit the newly created ESS stream ===
    // 1.Find and click the edit button for the row where source = ESS and destination = ESS
    await UIUtils.clickElement(
      view,
      streamRowEditButtonWithDescription("ESS", "ESS", "ESS_to_DSS_ESS_FSS"),
    );

    // === THEN: Verify the source stream option should be "ASS → #1" ==
    // Re-fetch the tied stream dropdown element in the edit panel to validate the actual displayed value
    const editPanelTiedStreamElement = await UIUtils.findWebElement(
      view,
      tiedStreamDropdown,
    );
    const editPanelDropdownText = await editPanelTiedStreamElement.getText();
    expect(
      editPanelDropdownText,
      "Edit panel dropdown text should contain ASS reference",
    ).to.include("ASS");

    console.log("✅ Multiple destination streams created successfully");

    // === THEN: I save the edited ESS stream ===
    await UIUtils.clickElement(
      view,
      By.css(`vscode-button#sidepanel-edit-stream`),
    );

    // === AND: I click on create stream again from DFG Visualisation ===
    // === AND: I create another stream with source as ASS and destination as ESS ===
    const sidebarHeadingDetails = await openSidebar(
      view,
      createStreamButton,
      panelHeading,
    );
    expect(
      await sidebarHeadingDetails.isDisplayed(),
      "STREAM OPTIONS sidebar should be opened",
    ).to.be.true;

    // Create another stream with ASS

    const selectedSourceASS = await selectSource(
      view,
      streamSourceDropdown,
      selectSourceOption("ASS"),
    );
    expect(selectedSourceASS, "Selected source should be ASS").to.equal("ASS");

    // === THEN: Verify the destinations are selected ===
    const [isEssVisibleInitialDest] = await selectMultipleDestinations(
      view,
      destinationDropDown,
      [streamDestination("ESS")],
    );

    expect(isEssVisibleInitialDest, "ESS should be visible").to.be.true;

    // === And: I enter alias name as "ASS_to_ESS_again" ===
    await UIUtils.sendKeysToElements(
      view,
      streamDescriptionInput,
      "ASS_to_ESS_again",
    );

    // === THEN: I click on create stream button ===
    await UIUtils.clickElement(view, createStreamSidePanelButton);

    // === AND: I edit ESS stream again ===
    await UIUtils.clickElement(
      view,
      streamRowEditButtonWithDescription("ESS", "ESS", "ESS_to_DSS_ESS_FSS"),
    );

    //===And the source stream option should be present "ASS → #2"===
    await UIUtils.clickElement(view, tiedStreamDropdown);
    await UIUtils.waitForElement(view, sourceStreamDropdownContent);

    const tiedStreamOptionForCssToFftAgain = By.xpath(
      "//div[contains(@data-test, 'tied-stream-option') and contains(normalize-space(.), 'ASS') and contains(normalize-space(.), 'ASS_to_ESS_again')]",
    );

    await UIUtils.waitForElement(view, tiedStreamOptionForCssToFftAgain);
    await UIUtils.clickElement(view, tiedStreamOptionForCssToFftAgain);
    await UIUtils.clickElement(
      view,
      By.css(`vscode-button#sidepanel-edit-stream`),
    );

    // === THEN: I verify the ESS row with source/destination ESS was created with a valid numeric id ===
    // Locate the row by stable properties (source, destination, description) instead of hardcoded id
    const fftStreamRow = await UIUtils.findWebElement(
      view,
      streamRowEditButtonWithDescription("ESS", "ESS", "ESS_to_DSS_ESS_FSS"),
    ).then((button) =>
      button.findElement(By.xpath("ancestor::vscode-data-grid-row")),
    );

    const dataTestAttr = await UIUtils.getAttributeFromWebElement(
      fftStreamRow,
      "data-test",
    );

    // Extract numeric id from "stream-table-row-<id>-ESS" (e.g., "stream-table-row-131-ESS")
    const extractedNumericId = dataTestAttr?.match(
      /^stream-table-row-(\d+)-ESS$/,
    )?.[1];

    expect(
      extractedNumericId,
      "Expected extracted stream id to be a valid numeric value",
    ).to.match(/^\d+$/);

    console.log(
      "✅ The stream Id gets updated correctly on editing the source stream option",
    );

    // === THEN: Filter stream list by Source = ASS and verify matching descriptions ===

    console.log("Filtering stream list by Source = ASS");
    await UIUtils.clickElement(view, sourceFilterButton);
    await UIUtils.clickElement(view, sourceMultiselectOption("ASS"));
    await UIUtils.clickElement(view, streamTableGrid);

    const cssSourceDescriptionOne = await UIUtils.findWebElement(
      view,
      validateStreamProperty("ASS", "ASS_to_DSS_ESS_FSS"),
    );
    expect(
      await cssSourceDescriptionOne.isDisplayed(),
      "ASS source row with description ASS_to_DSS_ESS_FSS should be visible after source filter",
    ).to.be.true;

    const cssSourceDescriptionTwo = await UIUtils.findWebElement(
      view,
      validateStreamProperty("ASS", "ASS_to_ESS_again"),
    );
    expect(
      await cssSourceDescriptionTwo.isDisplayed(),
      "ASS source row with description ASS_to_ESS_again should be visible after source filter",
    ).to.be.true;

    const fftRowsAfterCssFilter = await view.findWebElements(
      validateStreamProperty("ESS", "ESS_to_DSS_ESS_FSS"),
    );
    expect(
      fftRowsAfterCssFilter.length,
      "ESS rows should not be visible when source filter is set to ASS",
    ).to.equal(0);

    // === AND: Deselect Source = ASS filter ===
    await UIUtils.clickElement(view, sourceFilterButton);
    await UIUtils.clickElement(view, sourceMultiselectOption("ASS"));
    await UIUtils.clickElement(view, streamTableGrid);

    // === AND: Filter stream list by Destination = GSS and verify row + description ===
    await UIUtils.clickElement(view, destinationFilterButton);
    await UIUtils.clickElement(view, destinationMultiselectOption("GSS"));
    await UIUtils.clickElement(view, streamTableGrid);

    const rssDestinationRow = await UIUtils.waitForElement(
      view,
      streamRow("ESS", "GSS"),
    );
    expect(
      await rssDestinationRow.isDisplayed(),
      "GSS destination row should be visible after destination filter",
    ).to.be.true;

    const rssDestinationDescription = await UIUtils.findWebElement(
      view,
      validateStreamProperty("ESS", "ESS_to_DSS_ESS_FSS"),
    );
    expect(
      await rssDestinationDescription.isDisplayed(),
      "GSS destination stream description should be visible after destination filter",
    ).to.be.true;

    // === AND: Deselect Destination = GSS filter before applying Group filter ===
    await UIUtils.clickElement(view, destinationFilterButton);
    await UIUtils.clickElement(view, destinationMultiselectOption("GSS"));
    await UIUtils.clickElement(view, streamTableGrid);

    // === THEN: Filter stream list by Group = Group1 and verify row visibility ===
    await UIUtils.clickElement(view, groupFilterButton);
    await UIUtils.clickElement(view, groupMultiselectOption(groupName));
    await UIUtils.clickElement(view, groupFilterButton);
    await UIUtils.clickElement(view, streamTableGrid);

    const groupFilteredRow = await UIUtils.findWebElement(
      view,
      streamRowByGroup(groupName),
    );
    expect(
      await groupFilteredRow.isDisplayed(),
      `${groupName} rows should be visible after group filter`,
    ).to.be.true;

    // === AND: Deselect Group = Group1 filter and verify all streams are displayed ===
    await UIUtils.clickElement(view, groupFilterButton);
    await UIUtils.clickElement(view, groupMultiselectOption(groupName));
    await UIUtils.clickElement(view, groupFilterButton);
    await UIUtils.clickElement(view, streamTableGrid);

    const cssStreamAfterGroupDeselect = await UIUtils.waitForElement(
      view,
      validateStreamProperty("ASS", "ASS_to_DSS_ESS_FSS"),
    );
    expect(
      await cssStreamAfterGroupDeselect.isDisplayed(),
      `ASS stream should be visible after ${groupName} filter is deselected`,
    ).to.be.true;

    const fftStreamAfterGroupDeselect = await UIUtils.waitForElement(
      view,
      validateStreamProperty("ESS", "ESS_to_DSS_ESS_FSS"),
    );
    expect(
      await fftStreamAfterGroupDeselect.isDisplayed(),
      `ESS stream should be visible after ${groupName} filter is deselected`,
    ).to.be.true;

    console.log(
      `✅ All streams are visible in stream list after ${groupName} filter is deselected`,
    );

    // === THEN: Search by description and verify matching stream is displayed ===
    const descriptionSearchText = "ASS_to_DSS";
    await UIUtils.sendKeysToElements(view, searchInput, descriptionSearchText);
    await UIUtils.clickElement(view, streamTableGrid);

    const searchedDescriptionCell = await UIUtils.findWebElement(
      view,
      validateStreamProperty("ASS", "ASS_to_DSS"),
    );
    expect(
      await searchedDescriptionCell.isDisplayed(),
      "Description search result should be visible in stream list for Group1",
    ).to.be.true;

    // === AND: I click "Clear all filters" button to clear all filters and search text ===
    await UIUtils.clickElement(view, clearAllFiltersButton);

    // === THEN: I verify all streams are displayed after clearing all filters ===
    const assStreamAfterClearAll = await UIUtils.waitForElement(
      view,
      validateStreamProperty("ASS", "ASS_to_DSS_ESS_FSS"),
    );
    expect(
      await assStreamAfterClearAll.isDisplayed(),
      "ASS stream should be visible after clearing all filters",
    ).to.be.true;

    const essStreamAfterClearAll = await UIUtils.waitForElement(
      view,
      validateStreamProperty("ESS", "ESS_to_DSS_ESS_FSS"),
    );
    expect(
      await essStreamAfterClearAll.isDisplayed(),
      "ESS stream should be visible after clearing all filters",
    ).to.be.true;

    console.log(
      "✅ All streams are visible in stream list after clearing all filters",
    );

    // === THEN: Filter stream list by Group = No group assigned and verify Group1 row is not visible ===
    await UIUtils.clickElement(view, groupFilterButton);
    await UIUtils.clickElement(view, groupMultiselectOption("nogroup"));
    await UIUtils.clickElement(view, groupFilterButton);

    const groupedRowsAfterNoGroupFilter = await view.findWebElements(
      streamRowByGroup(groupName),
    );
    expect(
      groupedRowsAfterNoGroupFilter.length,
      `${groupName} rows should not be visible when No group assigned filter is selected`,
    ).to.equal(0);
  });
});
