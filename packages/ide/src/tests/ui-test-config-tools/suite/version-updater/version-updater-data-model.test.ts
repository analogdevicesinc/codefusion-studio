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
import {
  getConfigPathForFile,
  parseJSONFile,
} from "../../config-tools-utility/cfsconfig-utils";
import { UIUtils } from "../../../ui-test-utils/ui-utils";
import {
  continueBtn,
  criticalErrorHeader,
  futureVersionCheckbox,
  headerCss,
  homePageTitle,
  installLocallyAvailableVersionOption,
  missingDataModelLabel,
  pluginCompleteState,
  pluginDropdown,
  pluginNameLabel,
  resolutionContainer,
  systemPlannerButton,
  troubleshootingLink,
} from "../../page-objects/version-updater-section/version-updater-screen";

describe("Version Updater Tests - Outdated Data Model Version", () => {
  // ===Test Setup===
  let workbench: Workbench;
  let browser: VSBrowser;
  let view: WebView;
  const configFile = "mock-version-updater-1.0.0.cfsconfig";
  const configPath = getConfigPathForFile(configFile);
  const packageName = "TQFN";
  const soc = "MAX32690";

  // Dynamic selectors scoped to DATA MODEL VERSION
  const resolutionDropdown = pluginDropdown(packageName);
  const resolutionOption = installLocallyAvailableVersionOption(packageName);
  const componentCompleteState = pluginCompleteState(packageName);
  const componentNameLabel = pluginNameLabel(`${soc}-${packageName}`);

  before(async function () {
    browser = VSBrowser.instance;
    await browser.waitForWorkbench();
    workbench = new Workbench();
    await new Workbench().executeCommand("workbench.action.closeAllEditors");
  });

  after(async function () {
    // Teardown - reset cfsconfig file
    if (view) {
      await view.switchBack();
      await new Workbench().executeCommand("revert and close editor");
    }
    await UIUtils.restoreFixtureFileFromGit(configPath);
  });

  /*
   * Given: A .cfsconfig file whose DataModelVersion is set to an outdated value (1.0.0)
   * When:  The file is opened in VS Code and the System Planner webview loads
   * Then:  The "System Planner Critical Error" header is displayed
   * When:  The user selects a resolution from the dropdown and clicks Continue
   * And:   The user clicks "Continue to System Planner"
   * Then:  The System Planner home page loads showing the MAX32690 chip title
   * And:   The "System Planner Configuration Tools" header is visible
   */
  it("Verify System Planner Critical Error for an incorrect data model version - 1.0.0", async function () {
    await browser.openResources(configPath);
    await UIUtils.dismissAllNotifications(workbench, browser);
    view = new WebView();
    await view.wait(4000);

    // Webview frame can take longer to attach when extension host is under load.
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

    // === AND: The "Missing Data Model" error label is visible ===
    const missingDataModelElement = await UIUtils.findWebElement(
      view,
      missingDataModelLabel,
    );
    expect(await missingDataModelElement.isDisplayed()).to.be.true;

    const troubleshootingLinkEle = await UIUtils.findWebElement(
      view,
      troubleshootingLink,
    );
    expect(await troubleshootingLinkEle.isDisplayed()).to.be.true;

    await UIUtils.selectOptionFromDropdown(
      view,
      resolutionDropdown,
      resolutionOption,
    );

    console.log("✓ Selected locally-available version option");

    // === AND: The continue button exists on the critical error page ===
    expect(await UIUtils.waitForElement(view, continueBtn)).to.exist;
    console.log("✓ Continue button exists on critical error page");

    // === AND: The "Allow all future compatible versions" checkbox is checked by default ===
    const checkbox = await UIUtils.findWebElement(view, futureVersionCheckbox);
    expect(await checkbox.getAttribute("aria-checked")).to.equal("true");
    console.log("✓ 'Allow all future compatible versions' checkbox is checked");

    // === AND: Dismiss any error notifications (e.g. "searching packages") before clicking Continue ===
    // These toasts appear in the bottom-right and can overlap the Continue button
    // when it is scrolled into view, causing ElementClickInterceptedException.
    await view.switchBack();
    await UIUtils.dismissAllNotifications(workbench, browser);
    await view.switchToFrame(5000);

    // === AND: The user clicks Continue to apply the update ===
    // The button renders below the fold — scroll it to center before clicking.
    const continueBtnEl = await UIUtils.waitForElementToBeVisible(
      view,
      continueBtn,
    );

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

    const completedStateEl = await UIUtils.waitForElementToBeVisible(
      view,
      componentCompleteState,
      15000,
    );
    expect(await completedStateEl.isDisplayed()).to.be.true;

    expect(await UIUtils.findWebElement(view, componentNameLabel)).to.exist;

    await UIUtils.clickElement(view, systemPlannerButton);

    // Waiting for the webview to reload after clicking continue to system planner button.
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
      "MAX32690",
      "MAX32690 title should be visible in the WebView",
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

    const config = await parseJSONFile(configPath);
    const updatedDataModelVersion = config.DataModelVersion;
    expect(updatedDataModelVersion).to.exist;
    expect(
      updatedDataModelVersion,
      "DataModelVersion should be updated to latest version to load the config file in System Planner",
    ).to.not.equal("1.0.0");
  });
});

describe("Version Updater Tests - Unsupported Data Model Version", () => {
  // ===Test Setup===
  let workbench: Workbench;
  let browser: VSBrowser;
  let view: WebView;
  const configFile = "mock-version-updater-2.0.0.cfsconfig";
  const configPath = getConfigPathForFile(configFile);

  before(async function () {
    browser = VSBrowser.instance;
    await browser.waitForWorkbench();
    workbench = new Workbench();
    await new Workbench().executeCommand("workbench.action.closeAllEditors");
  });

  after(async function () {
    // Teardown - reset cfsconfig file
    if (view) {
      await view.switchBack();
      await new Workbench().executeCommand("revert and close editor");
    }
    await UIUtils.restoreFixtureFileFromGit(configPath);
  });
  /*
   * Given: A .cfsconfig file whose DataModelVersion is set to an unsupported future value (2.0.0)
   * When:  The file is opened in VS Code and the System Planner webview loads
   * Then:  The "System Planner Critical Error" header is displayed
   * And:   No resolution options are rendered (resolution container is absent from the DOM)
   */
  it("Verify no resolution option is available for unsupported data model version - 2.0.0", async function () {
    await browser.openResources(configPath);
    await UIUtils.dismissAllNotifications(workbench, browser);
    view = new WebView();
    await view.wait(8000);
    // Give VS Code enough time to initialize the webview host in CI/slow runs.

    // Webview frame can take longer to attach when extension host is under load.
    await view.switchToFrame(5000);

    // === THEN: The System Planner Critical Error screen is displayed ===
    // Waiting until the spinner disappears and the page loads to avoid false negative
    const titleElement = await UIUtils.waitForElementToBeVisible(
      view,
      criticalErrorHeader,
      15000,
    );
    console.log(
      "Switched to webview frame and found critical error header element",
    );
    const titleText = (await titleElement.getText()).trim();
    expect(titleText).to.equal("System Planner Critical Error");

    const resolutionContainerElement =
      await view.findWebElements(resolutionContainer);

    expect(resolutionContainerElement.length).to.equal(
      0,
      "Resolution container should not be visible for unsupported data model versions",
    );
  });
});
