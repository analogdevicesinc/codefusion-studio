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
  createStreamSidePanelButton,
  openSidebar,
  selectSource,
  selectMultipleDestinations,
} from "../../page-objects/dfg-section/dfg-visualisation-screen";
// import {
//   streamRowEditButtonWithDescription,
//   validateStreamProperty,
//   streamList,
//   exportAsCsvButton,
// } from "../../page-objects/dfg-section/dfg-stream-list.screen";
import { UIUtils } from "../../../ui-test-utils/ui-utils";
import {
  getConfigPathForFile,
  parseJSONFile,
} from "../../config-tools-utility/cfsconfig-utils";
import {
  assertPersistedStreamForSource,
  type PersistedDFGStream,
} from "../../page-objects/dfg-section/dfg-persistence-assertions";
//import { destinationBufferValue } from "../../page-objects/dfg-section/dfg-stream-list.screen";

/*
 * Feature: System Planner Data Flow Gasket (DFG) Editing and Configuration
 *     As a CodeFusion Studio user
 *     I want to edit stream of Data Flow Gasket
 *     So that I can ensure  streams are getting edited successfully
 *
 * Background:
 *     Given VS Code is open with the CodeFusion Studio extension loaded
 *     And all editors are closed
 *     And all notifications are dismissed
 */

describe("dfg - edit the stream and verify its persistence", () => {
  // === Test Configuration ===
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

  // === Reusable Test Utilities ===
  const setupWebViewEnvironment = async (
    configPath: string,
    navigationSelector: By,
  ) => {
    await browser.openResources(configPath);
    workbench = new Workbench();
    view = new WebView();
    await view.wait();
    await UIUtils.dismissAllNotifications(workbench, browser);
    await view.switchToFrame(4000);
    await UIUtils.clickElement(view, navigationSelector);
  };

  after(async () => {
    if (view) {
      await view.switchBack();
      await new Workbench().executeCommand("revert and close editor");
    }
  });

  it("Creating the stream and editing the source, destinations, and buffer size and verifying the persistence", async () => {
    /*
     * Scenario: User creates stream with multiple destinations
     *     Given the existing cfsconfig file with DFG configuration is opened
     *     Then switch to frame
     *     And I click on the "DFG" navigation tab
     *     Then I click on the create stream button and verify sidebar has been opened
     *     And I select source as "FSS"
     *     Then verify the source is selected as "FSS"
     *     And I enter destination as "DSS"and "FSS"
     *     Then verify the destination is selected as "DSS"
     *     And I select buffer size for source and destination(FSS) as 128
     *     Then verify the buffer size for source and destination is selected as 128
     *     And I enter alias name as "FSS_to_DSS"
     *     Then click on create stream button
     *     Then click on edit icon by clicking on accordion for DSS to expand and locate the created stream
     *     And edit the newly created stream
     *     Then update the source name from FSS to GSS
     *     And update the destinations to ESS only
     *     Then verify that ESS destination buffer size remains disabled
     *     And enter the new stream description as well
     *     And change source buffer size from 128 to 256
     *     Then verify source buffer size is updated to 256 and destination buffer size remains disabled
     *     Then click on save edited stream button
     *     Then I save the configuration file
     *     And I verify the persistence schema of the config file after changes being saved, validating that the created stream with correct properties exists in the config file
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

    // === AND: I select source as "FSS" ===
    // === THEN: Verify the source is selected as "FSS" ===
    const selectedSource = await selectSource(
      view,
      streamSourceDropdown,
      selectSourceOption("FSS"),
    );
    expect(selectedSource, "Selected source should be FSS").to.equal("FSS");

    // === And:I enter destination as "DSS"and "FSS" ===
    // === THEN: Verify the destinations are selected ===
    const [isDssVisible, isNssVisible] = await selectMultipleDestinations(
      view,
      destinationDropDown,
      [streamDestination("DSS"), streamDestination("FSS")],
    );
    expect(isDssVisible, "DSS should be visible").to.be.true;
    expect(isNssVisible, "FSS should be visible").to.be.true;

    // === AND: I select buffer size for source as 128 ===
    // Source and FSS destination buffer sizes are linked, so setting source also drives destination.
    await UIUtils.selectOptionFromDropdown(
      view,
      sourceBufferSizeSelection,
      sourceBufferValue("128"),
    );

    // === THEN: Verify source buffer dropdown reflects the selected value ===
    const sourceBufferDropdown = await UIUtils.findWebElement(
      view,
      sourceBufferSizeSelection,
    );
    const selectedSourceBufferValue = await UIUtils.getAttributeFromWebElement(
      sourceBufferDropdown,
      "current-value",
    );
    expect(
      selectedSourceBufferValue,
      "Source buffer size should be 128 after selection",
    ).to.equal("128");

    // === AND: Verify FSS destination buffer is also 128 (linked to source buffer) ===
    // The destination buffer dropdown shares option IDs across multiple destination rows,
    // so the generic helper (selectOptionFromDropdown) may match a hidden/detached duplicate.
    // Instead: open the FSS dropdown via script, then locate the *visible* option element
    // using bounding-rect + computed-style checks before scrolling and clicking it.
    const destinationDropdownByName = (value: string): By =>
      By.css(`[data-test="${value}-Destinations-buffer-size-selector"]`);

    const fssDestinationBufferSelected = await UIUtils.findWebElement(
      view,
      destinationDropdownByName("FSS"),
    );
    // Open the FSS destination buffer dropdown
    await view
      .getDriver()
      .executeScript("arguments[0].click();", fssDestinationBufferSelected);

    // Find the first visible option matching the selector and click it via script.
    // Using DOM visibility checks (bounding rect + computed style) avoids interacting
    // with overlapping or hidden clones that share the same option ID.
    await view.getDriver().executeScript(`
      const el = [...document.querySelectorAll('#Destinations_128')].find((e) => {
        const r = e.getBoundingClientRect();
        const s = window.getComputedStyle(e);
        return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden';
      });
      if (!el) throw new Error('Visible #Destinations_128 not found');
      el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      el.click();
    `);
    // === THEN: Verify FSS destination buffer dropdown reflects the selected value ===
    await UIUtils.waitForElement(view, destinationDropdownByName("FSS"));
    const selectedDestinationBufferValue =
      await UIUtils.getAttributeFromWebElement(
        fssDestinationBufferSelected,
        "current-value",
      );
    console.log(
      "FSS destination buffer value after selection:",
      selectedDestinationBufferValue,
    );
    expect(
      selectedDestinationBufferValue,
      "FSS destination buffer size should be 128 after selection",
    ).to.equal("128");

    // === And: I enter alias name as "FSS_to_DSS" ===
    await UIUtils.sendKeysToElements(
      view,
      streamDescriptionInput,
      "FSS_to_DSS",
    );

    // === THEN: Click on create stream button ===
    await UIUtils.clickElement(view, createStreamSidePanelButton);

    // === THEN: Expand the DSS accordion in the stream list to locate the newly created stream ===
    await UIUtils.clickElement(view, By.css(`[data-test='accordion:DSS']`));

    // === AND: Then click on edit icon by clicking on accordion for DSS to expand and locate the created stream ===
    // Selector matches the edit icon button that follows the stream description label.
    await UIUtils.clickElement(
      view,
      By.css(`div:has(>[title="FSS_to_DSS"]) vscode-button`),
    );

    // === AND: Change the source from FSS to GSS ===
    const newSelectedSource = await selectSource(
      view,
      streamSourceDropdown,
      selectSourceOption("GSS"),
    );

    expect(newSelectedSource, "Selected source should be GSS").to.equal("GSS");

    // === AND: Update destinations to ESS only ===
    // Re-selecting DSS and FSS deselects them (toggle behaviour), leaving only ESS checked.
    await selectMultipleDestinations(view, destinationDropDown, [
      streamDestination("ESS"),
      streamDestination("DSS"),
      streamDestination("FSS"),
    ]);

    // === And: Change source buffer size from 128 to 256 ===
    await UIUtils.selectOptionFromDropdown(
      view,
      sourceBufferSizeSelection,
      sourceBufferValue("256"),
    );

    // === THEN: Verify source buffer dropdown reflects the updated value ===
    const bufferDropdownAfter = await UIUtils.findWebElement(
      view,
      sourceBufferSizeSelection,
    );
    const bufferValueAfter = await UIUtils.getAttributeFromWebElement(
      bufferDropdownAfter,
      "current-value",
    );
    expect(
      bufferValueAfter,
      "Source buffer size should be 256 after selection",
    ).to.equal("256");

    //=== AND: Verify that ESS destination buffer size remains disabled ===

    const disableElementBufferESS = await UIUtils.findWebElement(
      view,
      destinationDropdownByName("ESS"),
    );

    const isDisabledBufferESS = await UIUtils.getAttributeFromWebElement(
      disableElementBufferESS,
      "class",
    );
    console.log(
      "ESS destination buffer size disabled state:",
      isDisabledBufferESS.includes("disabled"),
    );
    expect(isDisabledBufferESS.includes("disabled")).to.be.true;

    // === And: Enter the new stream description as well ===
    await UIUtils.sendKeysToElements(
      view,
      streamDescriptionInput,
      "GSS_to_ESS",
    );
    // === Then: Save the edited stream ===
    await UIUtils.clickElement(
      view,
      By.css(`vscode-button#sidepanel-edit-stream`),
    );

    console.log(
      "✅ Stream edited successfully with new source, destination, buffer size, and description",
    );
    // === THEN: I save the configuration file ===
    await view.switchBack();
    // Reuse the workbench instance already created during setup
    await workbench.executeCommand("workbench.action.files.save");
    console.log("Saved the configuration file");

    await UIUtils.sleep(300);

    // ===  And I verify the persistence schema of the config file after changes being saved, validating that the created stream with correct properties exists in the config file ===
    const config = (await parseJSONFile(configPath)) as {
      DFG?: {
        Streams?: PersistedDFGStream[];
      };
    };
    console.log(
      "Parsed config file successfully, validating persisted stream properties...",
    );

    assertPersistedStreamForSource(
      config.DFG?.Streams,
      false,
      "GSS",
      ["ESS"],
      "GSS_to_ESS",
      256,
      [4096],
    );

    console.log(
      "✅ Complete DFG edit with persistence validation scenario executed successfully",
    );
  });
});
