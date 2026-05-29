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
 * These tests cover the error handling scenarios in DFG
 */

/* Feature: DFG inbound and outbound stream creation
 *     As a CodeFusion Studio user
 *     I want to verify the error handling scenarios in DFG
 *     So that I can ensure that the errors are displayed correctly
 *
 * Background:
 * Given the DFGTESTS DFG configuration file "dfgTests-dfg.cfsconfig" is open in System Planner
 * And I have dismissed all notifications
 * And the DFG webview has finished loading
 * And I have switched to the System Planner frame
 * And I see the page title "DFGTESTS" in the DFG webview
 * And I am on the "DFG" tab
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
  selectStream,
  addInboundStreamButton,
  streamSourceDropdown,
  streamSourceOption,
  streamDestinationDropdown,
  streamDestinationOption,
  addOutboundStreamButton,
  streamDescription,
  sourceBufferSizeDropdown,
  sourceBufferSizeOption,
  destinationBufferSizeDropdown,
  destinationBufferSizeOption,
  createStreamButton,
  createStreamWithValues,
  verifyConfigFilePersistence,
  mainCreateStreamButton,
  sourceStreamError,
  sourceStreamPriority,
  sourceStreamPriorityError,
  sourceStreamPriorityDownArrow,
  destinationStreamPriority,
  generateCodeTab,
  generateCodeButton,
  sourceWindowInterruptToggle,
  sourceWindowSizeInput,
  destinationBufferInterruptToggle,
  destinationBufferSizeInput,
  destinationWindowInterruptToggle,
  destinationWindowSizeInput,
  destinationStreamPriorityError,
  destinationStreamPriorityDownArrow,
  sourceInterruptLineDropdown,
  destinationInterruptLineDropdown,
  sourceInterruptLineDropdownOption,
} from "../../page-objects/dfg-section/dfg-inbound-outbound-stream-creation-screen";

describe("DFG Tests", () => {
  // === Given the existing DFGTESTS DFG cfsconfig file "dfgTests-dfg.cfsconfig" is opened===
  const configFile = "dfgTests-dfg.cfsconfig";
  const configPath = getConfigPathForFile(configFile);

  // ===Test Setup===
  let workbench: Workbench;
  let browser: VSBrowser;
  let view: WebView;
  let editor: EditorView;
  const source: string = "ESS";
  const destination: string = "ESS";
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

  afterEach(async function () {
    this.timeout(60000);
    await view.switchBack();
    const wb = new Workbench();
    await wb.wait();
    await wb.executeCommand("View: revert and close editor");
  });

  /*  Scenario: Error when creating an ESS-to-ESS inbound stream without a corresponding input stream
   *   Given I select the stream node "ESS" in the DFG visualisation
   *   When I add a new inbound stream for destination "ESS"
   *   And I select "ESS" as the source for the new stream
   *   And I enter a valid stream description
   *   And I enter valid buffer sizes for the source and destination
   *   And I attempt to create the stream
   *   Then I see an error message for the source stream
   *   And the error message text is "The corresponding input stream must be selected for this gasket. Please create it first if necessary."
   */

  it("Verify the error message for ESS as source and destination", async () => {
    await openDfgTab();
    // Select the source stream node and click on add inbound stream button
    await UIUtils.clickElement(view, selectStream(source));
    await UIUtils.clickElement(view, addInboundStreamButton(destination));

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

    const sourceStreamErrorMessage = await UIUtils.findWebElement(
      view,
      sourceStreamError,
    );
    const sourceStreamErrorText = await sourceStreamErrorMessage.getText();
    expect(sourceStreamErrorText).to.equal(
      "The corresponding input stream must be selected for this gasket. Please create it first if necessary.",
      "Error message should be visible when ESS-ESS stream is created without source stream",
    );
  });

  /*  Scenario: Stream priority validation for ASS-to-ASS streams
   *   Given I start creating a new stream from "ASS" to "ASS"
   *   When I set the source stream priority to 4
   *   Then I see an error message for the source stream priority
   *   And the error message text is "Value exceeds the range 0 to 3"
   *   When I adjust the source stream priority using the decrement control
   *   Then the error message for the source stream priority is cleared
   *   When I set the destination stream priority to 4
   *   Then I see an error message for the destination stream priority
   *   And the error message text is "Value exceeds the range 0 to 3"
   *   When I adjust the destination stream priority using the decrement control
   *   Then the error message for the destination stream priority is cleared
   */

  it("Verify the stream priority error message", async () => {
    await openDfgTab();
    const source: string = "ASS";
    const destination: string = "ASS";
    await UIUtils.clickElement(view, mainCreateStreamButton);

    // Select the source
    await UIUtils.selectOptionFromDropdown(
      view,
      streamSourceDropdown,
      streamSourceOption(source),
    );

    // Select the destination
    await UIUtils.selectOptionFromDropdown(
      view,
      streamDestinationDropdown,
      streamDestinationOption(destination),
    );

    await UIUtils.clickElement(view, streamDestinationDropdown);

    const sourceStreamPriorityElement = await UIUtils.findWebElement(
      view,
      sourceStreamPriority(source),
    );
    await sourceStreamPriorityElement.sendKeys("4");

    const sourceStreamPriorityErrorMessage = await UIUtils.findWebElement(
      view,
      sourceStreamPriorityError(source),
    );
    expect(await sourceStreamPriorityErrorMessage.getText()).to.equal(
      "Value exceeds the range 0 to 3",
      "Error message should be visible when stream priority is set to an invalid value",
    );

    await UIUtils.clickElement(view, sourceStreamPriorityDownArrow(source));

    const sourceErrorMessage = await view.findWebElements(
      sourceStreamPriorityError(source),
    );

    expect(sourceErrorMessage.length).to.equal(
      0,
      "Error message should be cleared when stream priority is set to a valid value",
    );

    // Verify the same for destination stream priority
    const destinationStreamPriorityElement = await UIUtils.findWebElement(
      view,
      destinationStreamPriority(destination),
    );
    await destinationStreamPriorityElement.sendKeys("4");

    const destinationStreamPriorityErrorMessage = await UIUtils.findWebElement(
      view,
      destinationStreamPriorityError(destination),
    );
    expect(await destinationStreamPriorityErrorMessage.getText()).to.equal(
      "Value exceeds the range 0 to 3",
      "Error message should be visible when stream priority is set to an invalid value",
    );

    await UIUtils.clickElement(
      view,
      destinationStreamPriorityDownArrow(destination),
    );

    const destinationErrorMessage = await view.findWebElements(
      destinationStreamPriorityError(destination),
    );

    expect(destinationErrorMessage.length).to.equal(
      0,
      "Error message should be cleared when stream priority is set to a valid value",
    );
  });

  /* Scenario: Generate Code is disabled when DFG streams have configuration errors
   *   Given I select the stream node "BSS" in the DFG visualisation
   *   When I add a new outbound stream from "BSS" to "BSS"
   *   And I configure the stream with buffer sizes of 1024 bytes for source and destination
   *   And I create the stream
   *   And I add another outbound stream from "BSS" to "BSS"
   *   And I configure the second stream with default buffer sizes
   *   And I create the second stream
   *   And I navigate to the "Generate Code" tab
   *   Then the "Generate code" button is disabled
   *   And it is disabled because there are errors in the stream configuration
   */

  it("Verify the error message on generate code screen", async () => {
    // Click on the DFG tab
    await openDfgTab();
    const source: string = "BSS";
    const destination: string = "BSS";
    const sourceBufferSize: number = 1024;
    const destinationBufferSize: number = 1024;

    await UIUtils.clickElement(view, selectStream(source));

    await UIUtils.clickElement(view, addOutboundStreamButton(source));

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

    // Create another stream BSS-BSS with default buffer size 64
    await UIUtils.clickElement(view, addOutboundStreamButton(source));

    // Select the destination from the dropdown, enter stream description and buffer sizes and create the stream
    await UIUtils.selectOptionFromDropdown(
      view,
      streamDestinationDropdown,
      streamDestinationOption(destination),
    );

    const secondSourceBufferSize = 64;
    const secondDestinationBufferSize = 64;
    await UIUtils.clickElement(view, streamDestinationDropdown);

    await createStreamWithValues(
      view,
      source,
      destination,
      secondSourceBufferSize,
      secondDestinationBufferSize,
    );

    await UIUtils.clickElement(view, generateCodeTab);

    // Verify that the generate code button is disabled due to errors in stream configuration
    const generateCodeButtonElement = await UIUtils.findWebElement(
      view,
      generateCodeButton,
    );
    expect(await generateCodeButtonElement.getAttribute("class")).to.contain(
      "disabled",
      "Generate code button should be disabled when there are errors in stream configuration",
    );
  });

  /*  Scenario: Window and buffer interrupt configuration is persisted for DSS-to-DSS streams
   *   Given I start creating a new stream from "DSS" to "DSS"
   *   And I enter a stream description combining the source and destination names
   *   And I select a valid source buffer size if the source buffer size dropdown is enabled
   *   And I select a valid destination buffer size if the destination buffer size dropdown is enabled
   *   When I enable the source window interrupt
   *   And I enter a valid source window size
   *   And I select a valid source interrupt line from dropdown
   *   And I verify the source interrupt line selection made
   *   And I enable the destination buffer interrupt
   *   And I enter a valid destination buffer size for the interrupt
   *   And I enable the destination window interrupt
   *   And I enter a valid destination window size
   *   And I select a valid destination interrupt line from dropdown
   *   And I verify the destination interrupt line selection made
   *   And I create the stream
   *   And I save the configuration file
   *   Then the configuration file persistence schema reflects the new stream
   *   And the stream has source "DSS" and destination "DSS"
   *   And the configured buffer sizes and interrupt settings are persisted correctly
   */

  it("Verify the window interrupt and buffer interrupt for source and destination streams", async () => {
    await openDfgTab();
    const source: string = "DSS";
    const destination: string = "DSS";
    const sourceInterruptLine = 14;
    const destinationInterruptLine = 9;
    await UIUtils.clickElement(view, mainCreateStreamButton);

    // Select the source
    await UIUtils.selectOptionFromDropdown(
      view,
      streamSourceDropdown,
      streamSourceOption(source),
    );

    // Select the destination
    await UIUtils.selectOptionFromDropdown(
      view,
      streamDestinationDropdown,
      streamDestinationOption(destination),
    );

    await UIUtils.clickElement(view, streamDestinationDropdown);

    // Enter the stream description
    const streamDescriptionInput = await UIUtils.findWebElement(
      view,
      streamDescription,
    );
    await UIUtils.clickElement(view, streamDescriptionInput);
    await streamDescriptionInput.sendKeys(source + "-" + destination);

    // Select the source buffer size
    const sourceBufferSizeDropdownElement = await UIUtils.findWebElement(
      view,
      sourceBufferSizeDropdown,
    );
    if (
      (await sourceBufferSizeDropdownElement.getAttribute("aria-disabled")) ===
      "true"
    ) {
      console.log(
        "Source buffer size dropdown is disabled, skipping selection",
      );
    } else {
      await UIUtils.selectOptionFromDropdown(
        view,
        sourceBufferSizeDropdown,
        sourceBufferSizeOption(sourceBufferSize),
      );
    }

    // Select the destination buffer size
    const destinationBufferSizeDropdownElement = await UIUtils.findWebElement(
      view,
      destinationBufferSizeDropdown(destination),
    );
    if (
      (await destinationBufferSizeDropdownElement.getAttribute(
        "aria-disabled",
      )) === "true"
    ) {
      console.log(
        "Destination buffer size dropdown is disabled, skipping selection",
      );
    } else {
      await UIUtils.selectOptionFromDropdown(
        view,
        destinationBufferSizeDropdown(destination),
        destinationBufferSizeOption(destination, destinationBufferSize),
      );
    }

    // Click on source window interrupt toggle
    await UIUtils.clickElement(view, await sourceWindowInterruptToggle(source));

    // Enter source window size
    const sourceWindowSizeInputElement = await UIUtils.findWebElement(
      view,
      await sourceWindowSizeInput(source),
    );
    await sourceWindowSizeInputElement.sendKeys("1");

    // Select source interrupt priority and verify the selection
    const sourceInterruptLineDropdownElement = await UIUtils.findWebElement(
      view,
      await sourceInterruptLineDropdown(source),
    );

    // Select interrupt line 14 from source interrupt line dropdown and verify the selection
    await UIUtils.selectOptionFromDropdown(
      view,
      await sourceInterruptLineDropdown(source),
      await sourceInterruptLineDropdownOption(source, sourceInterruptLine),
    );
    expect(
      await sourceInterruptLineDropdownElement.getAttribute("current-value"),
    ).to.equal(
      sourceInterruptLine.toString(),
      `The value of source interrupt line dropdown should be "Interrupt ${sourceInterruptLine} (Priority 1)"`,
    );

    // Click on destination buffer interrupt toggle
    await UIUtils.clickElement(
      view,
      await destinationBufferInterruptToggle(destination),
    );
    // Enter destination buffer size
    const destinationBufferSizeInputElement = await UIUtils.findWebElement(
      view,
      await destinationBufferSizeInput(destination),
    );
    await destinationBufferSizeInputElement.sendKeys("1");

    // Click on destination window interrupt toggle
    await UIUtils.clickElement(
      view,
      await destinationWindowInterruptToggle(destination),
    );

    // Enter destination window size
    const destinationWindowSizeInputElement = await UIUtils.findWebElement(
      view,
      await destinationWindowSizeInput(destination),
    );
    await destinationWindowSizeInputElement.sendKeys("2");

    // Select interrupt line 9 from destination interrupt line dropdown and verify the selection
    const destinationInterruptLineDropdownElement =
      await UIUtils.findWebElement(
        view,
        await destinationInterruptLineDropdown(destination),
      );
    expect(
      await destinationInterruptLineDropdownElement.getAttribute(
        "current-value",
      ),
    ).to.equal(
      destinationInterruptLine.toString(),
      `The value of destination interrupt line dropdown should be "Interrupt ${destinationInterruptLine} (Priority 4)"`,
    );

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
      sourceBufferSize,
      [destinationBufferSize],
    );
  });
});
