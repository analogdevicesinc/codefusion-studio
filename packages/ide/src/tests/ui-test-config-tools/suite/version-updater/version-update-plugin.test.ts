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

import { expect } from "chai";
import { VSBrowser, WebView, Workbench } from "vscode-extension-tester";

import { UIUtils } from "../../../ui-test-utils/ui-utils";
import {
  getConfigPathForFile,
  parseJSONFile,
} from "../../config-tools-utility/cfsconfig-utils";
import {
  continueBtn,
  criticalErrorHeader,
  futureVersionCheckbox,
  headerCss,
  homePageTitle,
  installLocallyAvailableVersionOption,
  missingPluginLabel,
  pluginCompleteState,
  pluginDropdown,
  pluginNameLabel,
  systemPlannerButton,
  troubleshootingLink,
} from "../../page-objects/version-updater-section/version-updater-screen";

/*
 * Feature: Version Updater - Resolve missing plugin dependency via locally-available version
 *     As a CodeFusion Studio user
 *     I want to update a cfsconfig file that references a missing plugin to a locally-available version
 *     So that I can proceed to the System Planner without a blocking critical error
 *
 * Background:
 *     Given VS Code is open with the CodeFusion Studio extension loaded
 *     And all editors are closed
 *     And all notifications are dismissed
 *
 * Scenario: User resolves a missing plugin using the locally-available version option
 *     Given a cfsconfig file referencing a plugin version that is not locally installed is opened
 *     Then the System Planner Critical Error screen is displayed with a "Missing Plugin" error
 *     And the "Allow all future compatible versions" checkbox is checked by default
 *     When the user opens the version resolution dropdown for the missing plugin
 *     And the user selects the "Upgrade to compatible locally-available version" option
 *     And any error notifications (e.g. "searching packages") are dismissed
 *     And the user clicks the Continue button to apply the update
 *     Then the plugin is shown in a resolved/complete state
 *     And the "Continue to System Planner" button appears
 *     When the user clicks "Continue to System Planner"
 *     Then the System Planner loads and a peripheral card is visible
 *     Then save to view the updated cfsconfig file with the applied version update
 *     And the first project's PluginVersion is updated to the locally-available version
 */
describe("Version Updater - System Critical Error", () => {
  const configFile = "mock-plugin-outdated-version.cfsconfig";
  const configPath = getConfigPathForFile(configFile);
  const PLUGIN_ID = "com.analog.project.msdk.mock.plugin";

  // Dynamic selectors scoped to PLUGIN_ID
  const componentCompleteState = pluginCompleteState(PLUGIN_ID);
  const componentDropdown = pluginDropdown(PLUGIN_ID);
  const localVersionOption = installLocallyAvailableVersionOption(PLUGIN_ID);
  const componentNameLabel = pluginNameLabel(PLUGIN_ID);
  let workbench: Workbench;
  let browser: VSBrowser;
  let view: WebView;

  // ===Test Setup===

  before(async () => {
    ({ browser, workbench } = await UIUtils.setupTestSuite({
      sleepMs: 3000,
    }));
  });

  after(async () => {
    // Teardown - reset cfsconfig file
    await UIUtils.teardownTestSuite(view, configPath);
  });

  it("Verify locally-available resolution option for plugin  and continue to version update @regression", async function () {
    this.timeout(120000);
    // === GIVEN: A cfsconfig file referencing a missing plugin version is opened ===

    await browser.openResources(configPath);
    await UIUtils.dismissAllNotifications(workbench, browser);
    view = new WebView();
    await view.wait(4000);
    await view.switchToFrame(2000);

    // === THEN: The System Planner Critical Error screen is displayed ===
    const titleElement = await UIUtils.waitForElement(
      view,
      criticalErrorHeader,
    );
    expect((await titleElement.getText()).trim()).to.equal(
      "System Planner Critical Error",
    );
    console.log("✓ Critical error header text is correct");

    // === AND: The "Missing Plugin" error label is visible ===
    const missingPluginElement = await UIUtils.findWebElement(
      view,
      missingPluginLabel,
    );
    expect(await missingPluginElement.isDisplayed()).to.be.true;

    await UIUtils.dismissAllNotifications(workbench, browser);
    // === AND: The continue button exists on the critical error page ===
    expect(await UIUtils.waitForElement(view, continueBtn)).to.exist;
    console.log("✓ Continue button exists on critical error page");

    // === AND: The "Allow all future compatible versions" checkbox is checked by default ===
    const checkbox = await UIUtils.findWebElement(view, futureVersionCheckbox);
    expect(await checkbox.getAttribute("aria-checked")).to.equal("true");
    console.log("✓ 'Allow all future compatible versions' checkbox is checked");

    // === WHEN: The user opens the version resolution dropdown and selects locally-available version ===

    await UIUtils.selectOptionFromDropdown(
      view,
      componentDropdown,
      localVersionOption,
    );
    console.log("✓ Selected locally-available version option");

    // === AND: Dismiss any error notifications (e.g. "searching packages") before clicking Continue ===
    // These toasts appear in the bottom-right and can overlap the Continue button
    // when it is scrolled into view, causing ElementClickInterceptedException.
    await view.switchBack();
    await UIUtils.dismissAllNotifications(workbench, browser);
    await view.switchToFrame(5000);

    // === AND: The user clicks Continue to apply the update ===
    // The button renders below the fold — scroll it to center before clicking.
    const continueBtnEl = await UIUtils.waitForElement(view, continueBtn);
    await view
      .getDriver()
      .executeScript(
        "arguments[0].scrollIntoView({block: 'center'})",
        continueBtnEl,
      );
    await UIUtils.sleep(500);
    await view
      .getDriver()
      .actions({ async: true })
      .move({ origin: continueBtnEl })
      .click()
      .perform();
    console.log("✓ Clicked Continue button");

    // === THEN: The plugin is shown in resolved/complete state ===
    const completedElement = await UIUtils.waitForElementToBeVisible(
      view,
      componentCompleteState,
      15000,
    );
    expect(await completedElement.isDisplayed()).to.be.true;

    expect(await UIUtils.findWebElement(view, componentNameLabel)).to.exist;

    await UIUtils.clickElement(view, systemPlannerButton);

    // === THEN: The System Planner loads and shows the home page ===
    await UIUtils.sleep(3000);
    await view.switchBack();

    view = new WebView();
    await view.wait(8000);

    // Webview frame can take longer to attach when extension host is under load.
    await view.switchToFrame(5000);

    const pageTitle = await UIUtils.waitForElementToBeVisible(
      view,
      homePageTitle,
      15000,
    );

    const pageTitleText = await pageTitle.getText();
    expect(pageTitleText).to.equal(
      "TEST690",
      "TEST690 title should be visible in the WebView",
    );

    const headerElement = await UIUtils.waitForElementToBeVisible(
      view,
      headerCss,
    );
    const headerText = (await headerElement.getText()).trim();
    expect(headerText).to.equal(
      "System Planner Configuration Tools",
      "System Planner title should be visible in the WebView",
    );

    //=== Then save to view the updated cfsconfig file with the applied version update ===

    await view.switchBack();
    await workbench.executeCommand("workbench.action.files.save");

    // === AND: The first project's PluginVersion is updated to the locally-available version ===
    const config = await parseJSONFile(configPath);
    const updatedProject = config.Projects.find(
      (p: { PluginId: string }) => p.PluginId === PLUGIN_ID,
    );
    expect(updatedProject).to.exist;
    expect(updatedProject.PluginVersion).to.equal("^1.1.0");
    console.log(
      `✓ Config file PluginVersion for ${PLUGIN_ID} updated to ^1.1.0`,
    );
  });
});

/*
 * Feature: Version Updater - No resolution dropdown when required plugin version is unavailable
 *     As a CodeFusion Studio user
 *     I want to see only the Troubleshooting Guide link when no locally-available version can resolve the missing plugin
 *     So that I am directed to the documentation without a confusing empty dropdown
 *
 * Background:
 *     Given VS Code is open with the CodeFusion Studio extension loaded
 *     And all editors are closed
 *     And all notifications are dismissed
 *
 * Scenario: No resolution dropdown appears for an unavailable plugin version
 *     Given a cfsconfig file referencing a plugin version higher than any locally-installed version is opened
 *     Then the System Planner Critical Error screen is displayed with a "Missing Plugin" error
 *     And the resolution dropdown is not present
 *     And the Troubleshooting Guide link is visible
 *     And continue button is not present
 */
describe("Version Updater - No Resolution Dropdown For Unavailable Plugin Version", () => {
  const configFile = "mock-plugin-unavailable-version.cfsconfig";
  const configPath = getConfigPathForFile(configFile);
  const PLUGIN_ID = "com.analog.project.msdk.mock.plugin";

  // Dynamic selectors scoped to PLUGIN_ID
  const componentDropdown = pluginDropdown(PLUGIN_ID);

  let browser: VSBrowser;
  let view: WebView;
  let workbench: Workbench;

  before(async () => {
    ({ browser, workbench } = await UIUtils.setupTestSuite({
      sleepMs: 3000,
    }));
  });

  after(async () => {
    await UIUtils.teardownTestSuite(view, configPath);
  });

  it("Verify no resolution dropdown and troubleshooting link for unavailable plugin version @regression", async function () {
    this.timeout(60000);

    // === GIVEN: A cfsconfig referencing a plugin version newer than any locally-installed version ===
    await browser.openResources(configPath);
    await UIUtils.dismissAllNotifications(workbench, browser);

    view = new WebView();
    await view.wait(4000);
    await view.switchToFrame(3000);

    // === THEN: The System Planner Critical Error screen is displayed ===
    const titleElement = await UIUtils.waitForElement(
      view,
      criticalErrorHeader,
    );
    expect((await titleElement.getText()).trim()).to.equal(
      "System Planner Critical Error",
    );
    console.log("✓ Critical error header text is correct");

    // === AND: The "Missing Plugin" error label is visible ===
    const missingPluginElement = await UIUtils.findWebElement(
      view,
      missingPluginLabel,
    );
    expect(await missingPluginElement.isDisplayed()).to.be.true;
    console.log("✓ Missing Plugin error element is displayed");

    // === AND: The resolution dropdown is NOT present ===
    const dropdownElements = await view
      .getDriver()
      .findElements(componentDropdown);
    expect(dropdownElements.length).to.equal(0);
    console.log(
      "✓ Resolution dropdown is not present (no compatible local version)",
    );

    // === AND: The Troubleshooting Guide link is visible ===
    const linkElement = await UIUtils.waitForElement(view, troubleshootingLink);
    expect(await linkElement.isDisplayed()).to.be.true;
    expect(await linkElement.getAttribute("href")).to.include(
      "install-required",
    );
    // === AND: The Continue button is NOT present ===
    const continueBtnElements = await view
      .getDriver()
      .findElements(continueBtn);
    expect(continueBtnElements.length).to.equal(0);
    console.log(
      "✓ Elements: Troubleshooting Guide link is visible and no Continue button is displayed",
    );
  });
});
