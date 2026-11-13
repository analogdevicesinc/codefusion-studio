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
import {
  ActivityBar,
  By,
  EditorView,
  InputBox,
  VSBrowser,
  WebView,
  Workbench,
} from "vscode-extension-tester";

import { UIUtils } from "../../../ui-test-utils/ui-utils";
import {
  newWorkspaceLink,
  openWorkspaceLink,
  browseExamplesLink,
  openConfigFileLink,
  openElfFileLink,
  showAtStartupCheckbox,
  helpfulResourcesTitle,
  carouselPrevButton,
  carouselNextButton,
  carouselResourceCards,
  walkthroughTitle,
} from "../../page-objects/cfs-home-section/cfs-home-screen";

/** Title for the Home page editor window */
//const HOME_PAGE_TITLE = "CFS Home Page";

/** Name of the CFS view container in the activity bar */
const CFS_VIEW_CONTAINER = "CodeFusion Studio";

/**
 * Resets the driver to the top-level workbench content, recovering from a
 * stuck iframe context left over by a prior webview interaction or failure.
 */
async function resetToWorkbench(): Promise<void> {
  const browser = VSBrowser.instance;
  await browser.driver.switchTo().defaultContent();
  await browser.waitForWorkbench();
}

/**
 * Opens the CFS Home Page and switches into its webview frame.
 * @returns the `WebView` instance, already switched to the home page's frame
 */
async function openCfsHomePageWebview(): Promise<WebView> {
  await resetToWorkbench();

  const activityBar = new ActivityBar();
  const cfsViewControl = await activityBar.getViewControl(CFS_VIEW_CONTAINER);
  expect(cfsViewControl, "CFS icon not found in activity bar").to.not.be
    .undefined;

  await cfsViewControl?.openView();
  await UIUtils.sleep(5000); // Wait for sidebar to load

  const workbench = new Workbench();
  const sideBar = workbench.getSideBar();
  const content = sideBar.getContent();
  const section = await content.getSection("Home");
  await UIUtils.sleep(2000); // Wait for items to load

  const visibleItems = await section.getVisibleItems();
  for (const item of visibleItems) {
    const text = await item.getText();
    if (text.includes("Open Home Page")) {
      await item.click();
      break;
    }
  }
  await UIUtils.sleep(3000); // Wait for home page to open

  const editorView = new EditorView();
  const driver = editorView.getDriver();
  const homePageTabElement = await driver.findElement(
    By.xpath(
      "//span[@class='monaco-highlighted-label' and contains(text(), 'CFS Home Page')]",
    ),
  );
  expect(homePageTabElement, "CFS Home Page tab not found").to.not.be
    .undefined;

  await homePageTabElement.click();
  await UIUtils.sleep(2000); // Wait for tab to be selected

  const view = new WebView();
  await view.wait();
  await view.switchToFrame(5000);
  await UIUtils.sleep(2000); // Wait for webview content to load

  return view;
}

/*
 * Feature: CFS Home Page Navigation and Quick Access Links
 *     As a CodeFusion Studio user
 *     I want to open the CFS Home Page and verify quick access links
 *     So that I can quickly navigate to common tasks and features
 *
 * Background:
 *     Given VS Code is open with the CodeFusion Studio extension loaded
 *     And all editors are closed
 *     And all notifications are dismissed
 */

describe("CFS Home Page Tests", function () {
  // Allow retries for flaky UI tests
  this.retries(3);

  let view: WebView;

  before(async function () {
    this.timeout(60000);
    await resetToWorkbench();
    await new Workbench().executeCommand("workbench.action.closeAllEditors");
    //await UIUtils.sleep(3000);
  });

  afterEach(async function () {
    await resetToWorkbench();
    await new Workbench().executeCommand("workbench.action.closeAllEditors");
  });

  /*
   * Scenario: Verify Quick Access links are visible on the CFS Home Page
   *     Given I open the CFS Home Page webview
   *     When I look at the Quick Access section
   *     Then the "New Workspace" link should be visible
   */
  it("should open the CFS Home Page and verify quick access links @smoke", async function () {

    //--- Given I open the CFS Home Page webview ---
    view = await openCfsHomePageWebview();

    //--- When I look at the Quick Access section ---
    console.log("Waiting for 'New Workspace' link to be visible...");
    const firstLink = await UIUtils.waitForElement(view, newWorkspaceLink);
    expect(firstLink, "New Workspace link not found").to.not.be.undefined;

    //--- Then the "New Workspace" link should be visible ---
    const isDisplayed = await firstLink.isDisplayed();
    expect(isDisplayed, "New Workspace link is not visible").to.be.true;
    console.log("'New Workspace' link verified successfully!");

    // Switch back to default content after verification
    await resetToWorkbench();
  });

  /*
   * Scenario: Open the workspace creation wizard from the Home Page
   *     Given I open the CFS Home Page webview
   *     When I click the "New Workspace" quick access link
   *     Then a new workspace creation wizard tab should open
   */
  it("should open the workspace creation wizard when 'New Workspace' quick access link is clicked", async function () {

    //--- Given I open the CFS Home Page webview ---
    view = await openCfsHomePageWebview();

    //--- When I click the "New Workspace" quick access link ---
    const newWorkspace = await UIUtils.waitForElement(view, newWorkspaceLink);
    await newWorkspace.click();
    await resetToWorkbench();

    //--- Then a new workspace creation wizard tab should open ---
    // Poll for a new editor tab (the wizard) rather than its webview content,
    const editorView = new EditorView();
    await VSBrowser.instance.driver.wait(
      async () => {
        const titles = await editorView.getOpenEditorTitles();
        return titles.some((title) => title !== "CFS Home Page");
      },
      3000,
      "Workspace creation wizard tab did not open",
    );
    await resetToWorkbench();

    // Revert (discard unsaved temp workspace file) and close, otherwise
    // "Close All Editors" in afterEach prompts an unsaved-changes dialog
    // that blocks and fails the hook, leaving the tab open for the next test.
    await new Workbench().executeCommand("View: Revert and Close Editor");
  });

  /*
   * Scenario: Open an existing workspace from the Home Page
   *     Given I open the CFS Home Page webview
   *     When I click the "Open Workspace" quick access link
   *     Then a workspace file selection dialog should be shown
   */
  it("should prompt a workspace file selection dialog when 'Open Workspace' quick access link is clicked", async function () {

    //--- Given I open the CFS Home Page webview ---
    view = await openCfsHomePageWebview();

    //--- When I click the "Open Workspace" quick access link ---
    const openWorkspace = await UIUtils.waitForElement(
      view,
      openWorkspaceLink,
    );
    await openWorkspace.click();
    await resetToWorkbench();

    //--- Then a workspace file selection dialog should be shown ---
    const input = await InputBox.create(15000);
    expect(input, "Open Workspace file dialog was not shown").to.not.be
      .undefined;

    // Cancel without selecting a file so no side effects remain
    await input.cancel();
  });

  /*
   * Scenario: Browse MSDK examples from the Home Page
   *     Given I open the CFS Home Page webview
   *     When I click the "Browse MSDK Examples" quick access link
   *     Then a folder selection dialog should be shown
   */
  it("should prompt a folder selection dialog when 'Browse MSDK Examples' quick access link is clicked", async function () {

    //--- Given I open the CFS Home Page webview ---
    view = await openCfsHomePageWebview();

    //--- When I click the "Browse MSDK Examples" quick access link ---
    const browseExamples = await UIUtils.waitForElement(
      view,
      browseExamplesLink,
    );
    await browseExamples.click();
    await resetToWorkbench();

    //--- Then a folder selection dialog should be shown ---
    const input = await InputBox.create(15000);
    expect(input, "Browse MSDK Examples folder dialog was not shown").to.not
      .be.undefined;

    // Cancel without selecting an example so no side effects remain
    await input.cancel();
  });

  /*
   * Scenario: Open a config file from the Home Page
   *     Given I open the CFS Home Page webview
   *     When I click the "Open Config File" quick access link
   *     Then a file selection dialog should be shown
   */
  it("should prompt a file selection dialog when 'Open Config File' quick access link is clicked", async function () {

    //--- Given I open the CFS Home Page webview ---
    view = await openCfsHomePageWebview();

    //--- When I click the "Open Config File" quick access link ---
    const openConfigFile = await UIUtils.waitForElement(
      view,
      openConfigFileLink,
    );
    await openConfigFile.click();
    await resetToWorkbench();

    //--- Then a file selection dialog should be shown ---
    const input = await InputBox.create(15000);
    expect(input, "Open Config File dialog was not shown").to.not.be
      .undefined;

    // Cancel without selecting a file so no side effects remain
    await input.cancel();
  });

  /*
   * Scenario: Open an ELF file from the Home Page
   *     Given I open the CFS Home Page webview
   *     When I click the "Open ELF File" quick access link
   *     Then a file selection dialog should be shown
   */
  it("should prompt a file selection dialog when 'Open ELF File' quick access link is clicked", async function () {

    //--- Given I open the CFS Home Page webview ---
    view = await openCfsHomePageWebview();

    //--- When I click the "Open ELF File" quick access link ---
    const openElfFile = await UIUtils.waitForElement(view, openElfFileLink);
    await openElfFile.click();
    await resetToWorkbench();

    //--- Then a file selection dialog should be shown ---
    const input = await InputBox.create(15000);
    expect(input, "Open ELF File dialog was not shown").to.not.be.undefined;

    // Cancel without selecting a file so no side effects remain
    await input.cancel();
  });

  /*
   * Scenario: Verify the "Show at startup" checkbox default state
   *     Given I open the CFS Home Page webview
   *     When I look at the "Show at startup" checkbox
   *     Then it should be checked by default
   */
  it("should have the 'Show at startup' checkbox checked by default", async function () {

    //--- Given I open the CFS Home Page webview ---
    view = await openCfsHomePageWebview();

    //--- When I look at the "Show at startup" checkbox ---
    const checkedState = await UIUtils.getAttributeFromWebElementBy(
      view,
      showAtStartupCheckbox,
      "checked",
    );

    //--- Then it should be checked by default ---
    expect(checkedState, "'Show at startup' checkbox is not checked by default")
      .to.equal("true");

    await resetToWorkbench();
  });

  /*
   * Scenario: Verify the Helpful Resources carousel
   *     Given I open the CFS Home Page webview
   *     When I look at the "Helpful Resources" section
   *     Then the carousel previous and next navigation buttons should be visible
   *     And 7 resource cards should be present in the carousel
   */
  it("should show the Helpful Resources carousel with navigation buttons and 7 resources", async function () {

    //--- Given I open the CFS Home Page webview ---
    view = await openCfsHomePageWebview();

    //--- When I look at the "Helpful Resources" section ---
    const title = await UIUtils.waitForElement(view, helpfulResourcesTitle);
    expect(title, "'Helpful Resources' title not found").to.not.be.undefined;

    //--- Then the carousel previous and next navigation buttons should be visible ---
    const prevButton = await UIUtils.findWebElement(view, carouselPrevButton);
    expect(prevButton, "Carousel previous button not found").to.not.be
      .undefined;
    expect(
      await prevButton.isDisplayed(),
      "Carousel previous button is not visible",
    ).to.be.true;

    const nextButton = await UIUtils.findWebElement(view, carouselNextButton);
    expect(nextButton, "Carousel next button not found").to.not.be.undefined;
    expect(
      await nextButton.isDisplayed(),
      "Carousel next button is not visible",
    ).to.be.true;

    //--- And 7 resource cards should be present in the carousel ---
    const resourceCards = await view.findWebElements(carouselResourceCards);
    expect(
      resourceCards.length,
      "Expected 7 helpful resources in the carousel",
    ).to.equal(7);

    await resetToWorkbench();
  });

  /*
   * Scenario: Verify the Walkthrough section is present on the Home Page
   *     Given I open the CFS Home Page webview
   *     When I look at the page
   *     Then the "Walkthrough" section should be visible
   */
  it("should show the Walkthrough section on the CFS Home Page", async function () {
    //--- Given I open the CFS Home Page webview ---
    view = await openCfsHomePageWebview();

    //--- When I look at the page ---
    const walkthrough = await UIUtils.waitForElement(view, walkthroughTitle);

    //--- Then the "Walkthrough" section should be visible ---
    expect(walkthrough, "'Walkthrough' section not found").to.not.be.undefined;
    expect(await walkthrough.isDisplayed(), "'Walkthrough' section is not visible")
      .to.be.true;

    await resetToWorkbench();
  });
});
