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

// Feature: Pinmux Search
//   As a CodeFusion Studio user
//   I want to search and filter pins, peripherals, and signals
//   So that I can efficiently find and configure the correct hardware signals

// Background:
//   Given VS Code is open with the CodeFusion Studio extension loaded
//   And all editors are closed
//   And the configuration file "manual32690.cfsconfig" is available
//   And the Pin Menu tab has been accessed
//   And the pinmux search box is visible

import { expect } from "chai";
import {
  By,
  EditorView,
  VSBrowser,
  WebElement,
  WebView,
  Workbench,
} from "vscode-extension-tester";

import { UIUtils } from "../../../ui-test-utils/ui-utils";
import { getConfigPathForFile } from "../../config-tools-utility/cfsconfig-utils";
import { peripheralTab, pinTab } from "../../page-objects/main-menu";
import {
  pinmuxAssignedFilter,
  pinmuxBackButton,
  pinmuxFilterControls,
  pinmuxFilterControlsText,
  pinmuxSearchBox,
  pinmuxSearchClearButton,
  pinmuxSearchResults,
  pinmuxSearchResultsList,
  pinmuxToggleControl,
} from "../../page-objects/pin-config-section/pinmux-search";
import {
  clearAndSearch,
  verifyPinsFilterState,
  assertPeripheralSignalMappedToPin,
} from "../../page-objects/pin-config-section/pin-config-screen";

describe("Pinmux Search", () => {
  let workbench: Workbench;
  let browser: VSBrowser;
  let view: WebView;
  let editor: EditorView;
  const pins: string = "pins";
  const peripherals: string = "peripherals";
  const signals: string = "signals";
  browser = VSBrowser.instance;

  before(async function () {
    browser = VSBrowser.instance;
    editor = new EditorView();
    view = new WebView();
    await editor.closeAllEditors();
  });

  after(async function () {
    await view.switchBack();
    const wb = new Workbench();
    await wb.wait();
    await wb.executeCommand("revert and close editor");
  });

  /**
   * Scenario: Validate Pinmux Search Filter Controls are displayed
   *   Given the user has opened a configuration file
   *   When the user clicks on the pinmux search box
   *   And the user enters "P1" in the search field
   *   Then the Pins filter control should be displayed
   *   And the Peripherals filter control should be displayed
   *   And the Signals filter control should be displayed
   */
  it("Validate Pinmux Search Filter Controls - Pins, Peripherals, Signals", async () => {
    const configPath = getConfigPathForFile("manual32690.cfsconfig");

    await browser.openResources(configPath);
    workbench = new Workbench();

    console.log("Opened the cfsconfig file");
    await UIUtils.dismissAllNotifications(workbench, browser);
    console.log("Waiting for the element to be located in the DOM");
    view = new WebView();
    await view.switchToFrame();

    // When the user navigates to the Pin Menu
    await UIUtils.clickElement(view, pinTab);
    const pinmuxSearch = await UIUtils.waitForElementToBeVisible(
      view,
      pinmuxSearchBox,
      2000,
    );
    await pinmuxSearch.click();
    await pinmuxSearch.sendKeys("P1");
    const pinmuxFilterControlsPins = await UIUtils.findWebElement(
      view,
      await pinmuxFilterControls(pins),
    );
    expect(
      await pinmuxFilterControlsPins.isDisplayed(),
      "Pinmux filter controls for pins should be displayed",
    ).to.be.true;

    const pinmuxFilterControlsPeripherals = await UIUtils.findWebElement(
      view,
      await pinmuxFilterControls(peripherals),
    );
    expect(
      await pinmuxFilterControlsPeripherals.isDisplayed(),
      "Pinmux filter controls for peripherals should be displayed",
    ).to.be.true;

    const pinmuxFilterControlsSignals = await UIUtils.findWebElement(
      view,
      await pinmuxFilterControls(signals),
    );
    expect(
      await pinmuxFilterControlsSignals.isDisplayed(),
      "Pinmux filter controls for signals should be displayed",
    ).to.be.true;
  }).timeout(150000);

  /**
   * Scenario: Validate Pinmux Search Filter Controls have correct labels
   *   Given the pinmux search suggestion list is open
   *   When the filter control labels are retrieved
   *   Then the Pins filter control label should display "Pins"
   *   And the Peripherals filter control label should display "Peripherals"
   *   And the Signals filter control label should display "Signals"
   */
  it("Validate Pinmux Search Filter Control Labels - Pins, Peripherals, Signals", async () => {
    const pinmuxFilterControlsTextPins = await UIUtils.findWebElement(
      view,
      await pinmuxFilterControlsText(pins),
    );
    const pinmuxFilterControlsTextPeripherals = await UIUtils.findWebElement(
      view,
      await pinmuxFilterControlsText(peripherals),
    );
    const pinmuxFilterControlsTextSignals = await UIUtils.findWebElement(
      view,
      await pinmuxFilterControlsText(signals),
    );
    expect(
      await pinmuxFilterControlsTextPins.getText(),
      "Pinmux filter controls text for pins should be 'Pins'",
    ).to.equal("Pins");
    expect(
      await pinmuxFilterControlsTextPeripherals.getText(),
      "Pinmux filter controls text for peripherals should be 'Peripherals'",
    ).to.equal("Peripherals");
    expect(
      await pinmuxFilterControlsTextSignals.getText(),
      "Pinmux filter controls text for signals should be 'Signals'",
    ).to.equal("Signals");
  });

  /**
   * Scenario: Validate the default filter control is Pins
   *   Given the pinmux search has been opened
   *   When the filter controls are examined
   *   Then the Pins filter control should not be disabled
   *   And the Pins filter control should have "primary" appearance
   *   And the clear search button should be clickable
   */
  it("Validate that the default control selected is Pins", async () => {
    const pinmuxFilterControlsPins = await UIUtils.findWebElement(
      view,
      await pinmuxFilterControls(pins),
    );
    expect(
      await pinmuxFilterControlsPins.getAttribute("class"),
      "Pins filter control should be enabled by default",
    ).to.not.include("disabled");
    expect(
      await pinmuxFilterControlsPins.getAttribute("appearance"),
      "Pins filter control should be selected by default",
    ).to.equal("primary");

    const pinmuxSearchClearBtn = await UIUtils.waitForElementToBeVisible(
      view,
      pinmuxSearchClearButton,
      2000,
    );
    await pinmuxSearchClearBtn.click();
  });

  /**
   * Scenario: Validate search results for Pin filter type
   *   Given the user has entered "10" in the search box
   *   When the Pins filter is selected
   *   Then exactly 2 search results should be returned
   *   And the result "P0.10" should be displayed
   *   And the result "P1.10" should be displayed
   */
  it("Validate the matched count for Pin filter type", async () => {
    const pinSearchTextFirst = "P0.10";
    const pinSearchTextSecond = "P1.10";
    const pinmuxSearch = await UIUtils.findWebElement(view, pinmuxSearchBox);
    await pinmuxSearch.click();
    await pinmuxSearch.sendKeys("10");
    const pinmuxFilterControlsPins = await UIUtils.waitForElementToBeVisible(
      view,
      await pinmuxFilterControls(pins),
      5000,
    );
    expect(
      await pinmuxFilterControlsPins.getAttribute("appearance"),
      "Pins filter control should be selected by default",
    ).to.equal("primary");

    const resultsList = await view.findWebElements(pinmuxSearchResultsList);
    expect(
      resultsList.length,
      "There should be 2 search results for '10' for Pins filter type",
    ).to.equal(2);

    const pinmuxSearchResultsFirstPin = await UIUtils.findWebElement(
      view,
      await pinmuxSearchResults(pinSearchTextFirst),
    );
    const pinmuxSearchResultsSecondPin = await UIUtils.findWebElement(
      view,
      await pinmuxSearchResults(pinSearchTextSecond),
    );
    expect(
      await pinmuxSearchResultsFirstPin.isDisplayed(),
      "First search result for P0.10 should be visible",
    ).to.be.true;
    expect(
      await pinmuxSearchResultsSecondPin.isDisplayed(),
      "Second search result for P1.10 should be visible",
    ).to.be.true;
  });

  /**
   * Scenario: Validate search results for Peripheral filter type
   *   Given the user has entered "10" in the search box
   *   When the Peripherals filter control is clicked
   *   Then the Peripherals filter should have "primary" appearance
   *   And exactly 1 search result should be returned
   *   And the result "PT10" should be displayed
   */
  it("Validate the matched count for Peripheral filter type", async () => {
    const peripheralSearchText = "PT10";
    const pinmuxFilterControlsPeripherals = await UIUtils.findWebElement(
      view,
      await pinmuxFilterControls(peripherals),
    );
    await pinmuxFilterControlsPeripherals.click();
    expect(
      await pinmuxFilterControlsPeripherals.getAttribute("appearance"),
      "Peripherals filter control should be selected when clicked",
    ).to.equal("primary");

    const resultsList = await view.findWebElements(pinmuxSearchResultsList);
    expect(
      resultsList.length,
      "There should be 1 search result for '10' in Peripherals filter type",
    ).to.equal(1);

    const pinmuxSearchResultsFirstPeripheral = await UIUtils.findWebElement(
      view,
      await pinmuxSearchResults(peripheralSearchText),
    );
    expect(
      await pinmuxSearchResultsFirstPeripheral.isDisplayed(),
      "First search result for PT10 should be visible",
    ).to.be.true;
  });

  /**
   * Scenario: Validate search results for Signal filter type
   *   Given the user has entered "10" in the search box
   *   When the Signals filter control is clicked
   *   Then the Signals filter should have "primary" appearance
   *   And exactly 3 search results should be returned
   *   And the result "GPIO0 P0.10" should be displayed
   *   And the result "GPIO1 P1.10" should be displayed
   *   And the result "PT10 PT10" should be displayed
   */
  it("Validate the matched count for Signal filter type", async () => {
    const signalSearchTextFirst = "GPIO0 P0.10";
    const signalSearchTextSecond = "GPIO1 P1.10";
    const signalSearchTextThird = "PT10 PT10";
    const pinmuxFilterControlsSignals = await UIUtils.findWebElement(
      view,
      await pinmuxFilterControls(signals),
    );
    await pinmuxFilterControlsSignals.click();
    expect(
      await pinmuxFilterControlsSignals.getAttribute("appearance"),
      "Signals filter control should be selected when clicked",
    ).to.equal("primary");

    const resultsList = await view.findWebElements(pinmuxSearchResultsList);
    expect(
      resultsList.length,
      "There should be 3 search results for '10' in Signals filter type",
    ).to.equal(3);

    const pinmuxSearchResultsFirstSignal = await UIUtils.findWebElement(
      view,
      await pinmuxSearchResults(signalSearchTextFirst),
    );
    const pinmuxSearchResultsSecondSignal = await UIUtils.findWebElement(
      view,
      await pinmuxSearchResults(signalSearchTextSecond),
    );
    const pinmuxSearchResultsThirdSignal = await UIUtils.findWebElement(
      view,
      await pinmuxSearchResults(signalSearchTextThird),
    );
    expect(
      await pinmuxSearchResultsFirstSignal.isDisplayed(),
      "First search result for GPIO0 P0.10 should be visible",
    ).to.be.true;
    expect(
      await pinmuxSearchResultsSecondSignal.isDisplayed(),
      "Second search result for GPIO1 P1.10 should be visible",
    ).to.be.true;
    expect(
      await pinmuxSearchResultsThirdSignal.isDisplayed(),
      "Third search result for PT10 PT10 should be visible",
    ).to.be.true;
  });
});

/*
 * Feature: Pin search filtering in System Planner
 *     As a CodeFusion Studio user
 *     I want to filter pin search results by Pins, Peripherals, and Signals
 *     So that I can quickly find the specific configuration I need
 *
 * Background:
 *     Given VS Code is open with the CodeFusion Studio extension loaded
 *     And all editors are closed
 *     And all notifications are dismissed
 *
 *  Scenario: User searches for a Pin that exists in both Pins and Signals filters
 *     Given the cfsconfig file is opened
 *     And I click on the "Pin" navigation tab
 *     And search for "P0.14" in the search box
 *     Then search results display the pin under Pins filter
 *     And the Pins filter is active and selected by default
 *     And the Peripheral filter is disabled
 *     And the Signals filter is active but not selected
 *     When I click on "signals" filter
 *     Then the signal with peripheral "GPIO0 P0.14" is displayed
 *
 *  Scenario: User searches for a Peripheral name
 *     Given the cfsconfig file is opened
 *     And search for Peripheral "GPIO0" in the search box
 *     Then the Peripheral filter is active and selected
 *     And "GPIO0" is displayed under Peripheral filter
 *     And the Signals and Pins filters are disabled
 *
 *  Scenario: User searches for a Pin name
 *     Given the cfsconfig file is opened
 *     And search for Pin "VREG1" in the search box
 *     Then the Pin filter is active and selected
 *     And "VREG1" is displayed under Pin filter
 *     And the Signals and Peripheral filters are disabled
 *
 *  Scenario: User searches in search box with one character
 *     Given the cfsconfig file is opened
 *     And search for character "f" in the search box
 *     Then the message in search filter displays "A minimum of 2 characters is required to start searching"
 *
 *   Scenario: User searches in search box with "ff" in search box
 *     Given the cfsconfig file is opened
 *     And search for character "ff" in the search box
 *     Then the message in search filter displays "No results found."
 */

describe("Pin Filtering the search criteria", () => {
  const configFile = "max32690-wlp.cfsconfig";
  const configPath = getConfigPathForFile(configFile);

  let workbench: Workbench;
  let browser: VSBrowser;
  let view: WebView;
  let editor: EditorView;

  before(async () => {
    browser = VSBrowser.instance;
    editor = new EditorView();
    await editor.closeAllEditors();
  });

  after(async () => {
    await view.switchBack();
    const wb = new Workbench();
    await wb.wait();
    await wb.executeCommand("revert and close editor");
  });

  it("Should filter search results by Pins, Peripherals, and Signals", async () => {
    // Given: The cfsconfig file is opened
    await browser.openResources(configPath);
    workbench = new Workbench();
    view = new WebView();
    await view.wait(4000);

    // And: All notifications are dismissed
    await UIUtils.dismissAllNotifications(workbench, browser);

    // And: I switch to the WebView frame
    await view.switchToFrame();
    expect(
      await (await UIUtils.waitForElement(view, peripheralTab)).isDisplayed(),
      "Peripheral tab should be visible after loading the WebView",
    ).to.be.true;

    // When: I click on the "Pin" navigation tab
    await UIUtils.clickElement(view, pinTab);
    await UIUtils.waitForElement(
      view,
      By.css('[data-test="search-control-input"]'),
    );

    // And: I search for "P0.14" in the search box
    const searchField = await UIUtils.findWebElement(
      view,
      By.css('[data-test="search-control-input"]'),
    );
    await searchField.click();
    await searchField.sendKeys("P0.14");
    await UIUtils.waitForElement(
      view,
      By.css('[data-test="search-result-P0.14-(C1)"]'),
    );

    // Then: Search results display the pin under Pins filter as "P0.14(C1)"
    const searchResultsPin = await UIUtils.findWebElement(
      view,
      By.css('[data-test="search-result-P0.14-(C1)"]'),
    );
    const resultText = await searchResultsPin.getText();
    expect(resultText, "Search result for P0.14 should be displayed")
      .to.include("P0.14")
      .and.to.include("(C1)");

    // And: The Pins filter is active and selected by default
    await verifyPinsFilterState(view, "pins", "primary");

    // And: The Peripheral filter is disabled
    await verifyPinsFilterState(view, "peripherals", "disabled");

    // And: The Signals filter is active but not selected
    const signalFilter = await UIUtils.findWebElement(
      view,
      By.css('[data-test="filter-control:signals"]'),
    );
    const signalsClass = await signalFilter.getAttribute("class");
    expect(signalsClass, "Signals filter should be enabled").to.not.contain(
      "disabled",
    );

    // When: I click on "signals" filter
    await UIUtils.clickElement(view, "filter-control:signals");

    // Then: The signal with peripheral "GPIO0 P0.14" is displayed under Signals filter
    const searchResultsSignals = await UIUtils.findWebElement(
      view,
      By.css('[data-test="search-result-title"]'),
    );
    const titleText = await searchResultsSignals.getText();
    expect(titleText, "GPIO0 should be found").to.include("GPIO0");
    expect(titleText, "P0.14 should be found").to.include("P0.14");

    // When: I clear the search box and search for Peripheral "GPIO0"
    await clearAndSearch(searchField, "GPIO0");
    await UIUtils.waitForElement(
      view,
      By.css('[data-test="search-control-input"]'),
    );

    // Then: The Peripheral filter is active and selected
    await verifyPinsFilterState(view, "peripherals", "primary");

    // And: "GPIO0" is displayed under Peripheral filter in search results
    const peripheralResult = await UIUtils.findWebElement(
      view,
      By.css('[data-test="search-result-title"]'),
    );
    const peripheralText = await peripheralResult.getText();
    expect(
      peripheralText,
      "Search result for GPIO0 should be displayed",
    ).to.include("GPIO0");

    // And: The Signals and Pins filters are disabled
    await verifyPinsFilterState(view, "pins", "disabled");
    await verifyPinsFilterState(view, "signals", "disabled");

    // When: I clear the search box and search for Pin "VREG1"
    await clearAndSearch(searchField, "VREG1");

    // Then: The Pin filter is active and selected
    await verifyPinsFilterState(view, "pins", "primary");

    // And: "VREG1" is displayed under Pin filter in search results
    const pinResult = await UIUtils.findWebElement(
      view,
      By.css('[data-test="search-result-title"]'),
    );
    const pinText = await pinResult.getText();
    expect(pinText, "Search result for VREG1 should be displayed").to.include(
      "VREG1",
    );

    // And: The Signals and Peripheral filters are disabled
    await verifyPinsFilterState(view, "signals", "disabled");
    await verifyPinsFilterState(view, "peripherals", "disabled");

    // When: I clear the search box and search for character "f"
    await clearAndSearch(searchField, "f");

    // Then: The minimum characters message element is displayed
    const messageElement = await UIUtils.findWebElement(
      view,
      By.css('[data-test="min-characters"]'),
    );
    expect(
      await messageElement.isDisplayed(),
      "The minimum characters required message should be displayed",
    ).to.be.true;

    // When: I clear the search box and search for characters "ff"
    await clearAndSearch(searchField, "ff");

    // Then: The no results message element is displayed
    const noResultsElement = await UIUtils.findWebElement(
      view,
      By.css('[data-test="no-results"]'),
    );
    expect(
      await noResultsElement.isDisplayed(),
      "The no results found message should be displayed",
    ).to.be.true;

    /**
     * These tests cover the search filters while searching in Pin config screen and its navigation results
     */

    /*
     * Feature: PinMux Search navigation results in System Planner
     *     As a CodeFusion Studio user
     *     I want to navigate pin search results to destination in Pin details section
     *     So that I can quickly find the specific configuration I need
     *
     * Background:
     *     Given VS Code is open with the CodeFusion Studio extension loaded
     *     And all editors are closed
     *     And all notifications are dismissed
     *
     *  Scenario: User searches for a Pin and navigates to the details section for results
     *     Given the user is on the Pin config screen
     *     And I search for "P0.14" in the search box
     *     Then search results display the pin under Pins filter
     *     And I click on "P0.14(C1)" in search results
     *     Then the search results shows lists of Pins C1 with different signals corresponding to it
     *
     *  Scenario: User searches for a Peripheral and navigates to the details section for results
     *     Given the user is on the Pin config screen
     *     And I search for Peripheral "CM4" in the search box
     *     Then I click on "CM4" in search results
     *     Then the search results shows list of signals corresponding to CM4 peripheral
     *
     *  Scenario: User searches for a Signal and navigates to the details section for results
     *     Given the user is on the Pin config screen
     *     And search for Signal "ANT_CTRL0" in the search box
     *     Then I click on "ANT_CTRL0" in search results
     *     Then the search results shows list of pins corresponding to ANT_CTRL0 signal
     *
     *  Scenario: User searches for a Pin (C4) and navigates to the details section for results
     *     Given the user is on the Pin config screen
     *     And search for Pin "C4" in the search box
     *     Then I click on "P1.1(C4)" in search results and verify the details section
     *     Then the search results shows list of pins corresponding to C4 Pin
     *
     */

    describe("PinMux Filter search results navigation", () => {
      const configFile = "max32690-wlp.cfsconfig";
      const configPath = getConfigPathForFile(configFile);

      let workbench: Workbench;
      let browser: VSBrowser;
      let view: WebView;
      let editor: EditorView;
      let searchField: WebElement;

      async function openPinConfigScreen(): Promise<void> {
        await browser.openResources(configPath);
        workbench = new Workbench();
        view = new WebView();
        await view.wait(4000);

        await UIUtils.dismissAllNotifications(workbench, browser);

        await view.switchToFrame(5000);
        expect(
          await (
            await UIUtils.waitForElement(view, peripheralTab)
          ).isDisplayed(),
          "Peripheral tab should be visible after loading the WebView",
        ).to.be.true;

        await UIUtils.clickElement(view, pinTab);
        await UIUtils.waitForElement(
          view,
          By.css('[data-test="search-control-input"]'),
        );

        searchField = await UIUtils.findWebElement(
          view,
          By.css('[data-test="search-control-input"]'),
        );
      }

      before(async () => {
        browser = VSBrowser.instance;
        editor = new EditorView();
        await editor.closeAllEditors();
      });

      afterEach(async () => {
        if (view) {
          await view.switchBack();
        }
        editor = new EditorView();
        await editor.closeAllEditors();
      });

      it("User should navigate to Pin details section after entering P0.14 signal and then clicking on it under Pins section", async () => {
        // Given: The user is on the Pin config screen
        await openPinConfigScreen();

        // And: I search for "P0.14" in the search box
        await clearAndSearch(searchField, "P0.14");
        await UIUtils.waitForElement(
          view,
          By.css('[data-test="search-result-P0.14-(C1)"]'),
        );

        // Then the search results display the pin under Pins filter as "P0.14(C1)"
        const searchResultsPin = await UIUtils.findWebElement(
          view,
          By.css('[data-test="search-result-P0.14-(C1)"]'),
        );
        expect(
          await searchResultsPin.isDisplayed(),
          "Search result for P0.14-(C1) should be displayed",
        ).to.be.true;

        await UIUtils.clickElement(
          view,
          By.css('[data-test="search-result-title"]'),
        );
        const resultsTitle = await UIUtils.findWebElement(
          view,
          By.css('[id="pin-details-title"]'),
        );
        const titleText = (await resultsTitle.getText())
          .replace(/\s+/g, " ")
          .trim();
        expect(titleText, "Pin details title should include P0.14")
          .to.include("P0.14")
          .and.to.include("C1");

        await assertPeripheralSignalMappedToPin(view, "GPIO0", "P0.14", "C1");
        await UIUtils.selectOptionFromDropdown(
          view,
          By.css("vscode-dropdown"),
          By.css('vscode-option[value="C1"]'),
        );
        const valuePin = await UIUtils.findWebElement(
          view,
          By.css("vscode-dropdown"),
        );
        const pinText = await valuePin.getAttribute("current-value");
        expect(
          pinText,
          "After selecting C1 from the pin dropdown, the pin dropdown should show C1 as selected",
        ).to.equal("C1");
        await assertPeripheralSignalMappedToPin(view, "SPI3", "CS2", "C1");
        await assertPeripheralSignalMappedToPin(view, "TMR0", "IOB", "C1");
      });

      it("User should navigate to Peripheral details section for Peripheral search on entering 'CM4' and clicking on it under peripherals", async () => {
        // Given the user is on the Pin config screen
        await openPinConfigScreen();

        // And search for Peripheral "CM4" in the search box
        await clearAndSearch(searchField, "CM4");

        // Then I click on "CM4" in search results and verify the details section
        await UIUtils.clickElement(
          view,
          By.css('[data-test="search-result-title"]'),
        );

        await assertPeripheralSignalMappedToPin(view, "CM4", "RXEVO", "G4");
        await assertPeripheralSignalMappedToPin(view, "CM4", "TXEVO", "H4");
      });

      it("User should navigate to Signal details section for Signal search on entering 'ANT_CTRL0' and clicking on it under signals", async () => {
        // Given the user is on the Pin config screen
        await openPinConfigScreen();

        // And search for Signal "ANT_CTRL0" in the search box
        await clearAndSearch(searchField, "ANT_CTRL0");

        // Then I click on "ANT_CTRL0" in search results

        await UIUtils.clickElement(
          view,
          By.css('[data-test="search-result-title"]'),
        );

        //Then the search results shows list of pins corresponding to ANT_CTRL0 signal

        await assertPeripheralSignalMappedToPin(view, "BLE", "ANT_CTRL0", "E3");
      });

      it("User should navigate to Pins details section when user  on enters pin 'C4' and clicks on it under pins", async () => {
        // Given the user is on the Pin config screen
        await openPinConfigScreen();

        // And search for Pin "C4" in the search box
        await clearAndSearch(searchField, "C4");

        // Then the search results display the pin under Pins filter as "P1.1(C4)"
        const searchResultsPin = await UIUtils.findWebElement(
          view,
          By.css('[data-test="search-result-P1.1-(C4)"]'),
        );
        expect(
          await searchResultsPin.isDisplayed(),
          "Search result for P1.1-(C4) should be displayed",
        ).to.be.true;

        // Then I click on "P1.1(C4)" in search results and verify the details section

        await UIUtils.clickElement(
          view,
          By.css('[data-test="search-result-title"]'),
        );
        const resultsTitle = await UIUtils.findWebElement(
          view,
          By.css('[id="pin-details-title"]'),
        );

        const titleText = (await resultsTitle.getText())
          .replace(/\s+/g, " ")
          .trim();
        expect(titleText, "Pin details title should include P1.1")
          .to.include("P1.1")
          .and.to.include("C4");

        // Then the search results shows list of pins corresponding to C4 Pin

        await assertPeripheralSignalMappedToPin(view, "GPIO1", "P1.1", "C4");
        await assertPeripheralSignalMappedToPin(view, "SPI4", "MOSI", "C4");
      });
    });
  });
});

describe("PinMux Bug Automation - CFSIO-14738 - Clearing of the filters after assigning pins, peripherals & signals", () => {
  let workbench: Workbench;
  let browser: VSBrowser;
  let view: WebView;
  let editor: EditorView;
  const pins: string = "pins";
  const peripherals: string = "peripherals";
  const signals: string = "signals";
  browser = VSBrowser.instance;

  before(async function () {
    browser = VSBrowser.instance;
    editor = new EditorView();
    view = new WebView();
    await editor.closeAllEditors();
  });

  after(async function () {
    await view.switchBack();
    const wb = new Workbench();
    await wb.wait();
    await wb.executeCommand("revert and close editor");
  });

  /**
   * Scenario: Assigned filter resets after assigning GPIO1-P1.8 from search results
   *   Given the cfsconfig file "max32690-wlp.cfsconfig" is opened
   *   And the user is on the Pin tab
   *   And the Assigned filter is enabled
   *   When the user searches for "P1.8" and opens the pin details
   *   And the user assigns the "GPIO1-P1.8" signal
   *   And the user searches for "P1.8" again and opens the result
   *   Then the Assigned filter should be reset to disabled state
   */
  it("Verify the filtering by assigning GPIO1-P1.8 pins", async () => {
    const configPath = getConfigPathForFile("max32690-wlp.cfsconfig");

    await browser.openResources(configPath);
    workbench = new Workbench();

    console.log("Opened the cfsconfig file");
    await UIUtils.dismissAllNotifications(workbench, browser);
    console.log("Waiting for the element to be located in the DOM");
    view = new WebView();
    await view.switchToFrame();

    // When the user navigates to the Pin Menu
    await UIUtils.clickElement(view, pinTab);
    await UIUtils.clickElement(view, pinmuxAssignedFilter);
    const pinmuxSearch = await UIUtils.waitForElementToBeVisible(
      view,
      pinmuxSearchBox,
      2000,
    );
    await pinmuxSearch.click();
    await pinmuxSearch.sendKeys("P1.8");
    const pinmuxFilterControlsPins = await UIUtils.findWebElement(
      view,
      await pinmuxFilterControls(pins),
    );
    // Verify that the Pins filter control is selected by default
    expect(
      await pinmuxFilterControlsPins.getAttribute("appearance"),
      "Pins filter control should be selected by default",
    ).to.equal("primary");
    await UIUtils.clickElement(view, await pinmuxSearchResults("P1.8"));

    // Toggle on the "GPIO1-P1.8" signal in the pin details section
    await UIUtils.clickElement(view, await pinmuxToggleControl("GPIO1-P1.8"));

    // Search for P1.8
    await pinmuxSearch.click();
    await clearAndSearch(pinmuxSearch, "P1.8");
    await UIUtils.clickElement(view, await pinmuxSearchResults("P1.8"));
    const assignedFilter = await UIUtils.findWebElement(
      view,
      pinmuxAssignedFilter,
    );
    // Verify that the assigned filter is reset
    expect(
      await assignedFilter.getAttribute("class"),
      "Assigned filter should be reset",
    ).to.contain("disabled");
  });

  /**
   * Scenario: Assigned filter remains reset for AIN0 signal assignment flow
   *   Given the user returns to the pin search view
   *   And the Assigned filter is enabled
   *   When the user searches for "AIN0" and opens "ADC AIN0"
   *   And the user assigns the "ADC-AIN0" signal
   *   And the user searches for "AIN0" again and opens "ADC AIN0"
   *   Then the Assigned filter should remain reset (secondary appearance)
   */
  it("Verify the filtering by assigning ADC-AIN0 signals", async () => {
    await UIUtils.clickElement(view, pinmuxBackButton);
    await UIUtils.clickElement(view, pinmuxAssignedFilter);
    const pinmuxSearch = await UIUtils.waitForElementToBeVisible(
      view,
      pinmuxSearchBox,
      2000,
    );
    await pinmuxSearch.click();
    await pinmuxSearch.sendKeys("AIN0");
    const pinmuxFilterControlsPins = await UIUtils.findWebElement(
      view,
      await pinmuxFilterControls(signals),
    );
    // Verify that the Signals filter control is selected by default
    expect(
      await pinmuxFilterControlsPins.getAttribute("appearance"),
      "Signals filter control should be selected by default",
    ).to.equal("primary");
    await UIUtils.clickElement(view, await pinmuxSearchResults("ADC AIN0"));

    // Toggle on the "ADC-AIN0" signal in the pin details section
    await UIUtils.clickElement(view, await pinmuxToggleControl("ADC-AIN0"));

    // Search for AIN0
    await pinmuxSearch.click();
    await clearAndSearch(pinmuxSearch, "AIN0");
    await UIUtils.clickElement(view, await pinmuxSearchResults("ADC AIN0"));
    const assignedFilter = await UIUtils.findWebElement(
      view,
      pinmuxAssignedFilter,
    );
    // Verify that the assigned filter is reset
    expect(
      await assignedFilter.getAttribute("appearance"),
      "Assigned filter should be reset i.e. should not be enabled",
    ).to.equal("secondary");
  });

  /**
   * Scenario: Assigned filter remains reset for PT0 peripheral assignment flow
   *   Given the user is on the pin search view
   *   And the Assigned filter is enabled
   *   When the user searches for "PT0" under Peripherals and opens "PT0"
   *   And the user assigns the "PT0-PT0" peripheral mapping
   *   And the user searches for "PT0" again and opens "PT0"
   *   Then the Assigned filter should remain reset (secondary appearance)
   */
  it("Verify the filtering by assigning PT0 peripherals", async () => {
    await UIUtils.clickElement(view, pinmuxAssignedFilter);
    const pinmuxSearch = await UIUtils.waitForElementToBeVisible(
      view,
      pinmuxSearchBox,
      2000,
    );
    await pinmuxSearch.click();
    await pinmuxSearch.sendKeys("PT0");
    await UIUtils.clickElement(view, await pinmuxFilterControls(peripherals));
    await UIUtils.clickElement(view, await pinmuxSearchResults("PT0"));

    // Toggle on the "PT0" peripheral in the pin details section
    await UIUtils.clickElement(view, await pinmuxToggleControl("PT0-PT0"));

    // Search for PT0
    await pinmuxSearch.click();
    await clearAndSearch(pinmuxSearch, "PT0");
    await UIUtils.clickElement(view, await pinmuxSearchResults("PT0"));
    const assignedFilter = await UIUtils.findWebElement(
      view,
      pinmuxAssignedFilter,
    );
    // Verify that the assigned filter is reset
    expect(
      await assignedFilter.getAttribute("appearance"),
      "Assigned filter should be reset i.e. should not be enabled",
    ).to.equal("secondary");
  });
});
