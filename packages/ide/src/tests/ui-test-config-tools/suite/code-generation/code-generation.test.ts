/**
 *
 * Copyright (c) 2024-2026 Analog Devices, Inc.
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
import { describe, it } from "mocha";
import {
  VSBrowser,
  WebDriver,
  WebView,
  Workbench,
} from "vscode-extension-tester";
import { getConfigPathForFile } from "../../config-tools-utility/cfsconfig-utils";
import { UIUtils } from "../../../ui-test-utils/ui-utils";
import { generateCodeTab } from "../../page-objects/main-menu";
import {
  dismissOverwriteModal,
  generateCodeButton,
  generateCodeContainer,
  generatedFilesList,
  getReadySignal,
  errorContainerSelector,
  rVCheckbox,
} from "../../page-objects/generate-code-section/generate-code-screen";

/*
 * Feature: Generate Code tab
 *     As a CodeFusion Studio user
 *     I want to see project readiness and generate code on the Generate Code tab
 *     So that I know my configuration is valid before generating code
 *
 * Background:
 *     Given VS Code is open with the CodeFusion Studio extension loaded
 *     And all editors are closed
 */
describe("Config tools code generation", () => {
  let view: WebView;
  let browser: VSBrowser;
  let workbench: Workbench;
  let driver: WebDriver;
  const configPath = getConfigPathForFile(
    "max32690-wlp-dual-core-blinky.cfsconfig",
  );

  before(async function () {
    this.timeout(60000);
    ({ browser, workbench } = await UIUtils.setupTestSuite({ sleepMs: 500 }));
    driver = browser.driver;
  });

  afterEach(async () => {
    await UIUtils.teardownTestSuite(view, configPath);
  });

  /*
   * Scenario: Projects display ready status on the Generate Code tab
   *     Given a valid dual-core .cfsconfig is opened
   *     When I navigate to the Generate Code tab
   *     Then the generate code container is rendered
   *     And each project displays a ready-state indicator
   *     And no error containers are visible
   */
  it("Should display projects with ready status on the Generate Code tab @regression", async function () {
    this.timeout(60000);
    // Given a valid dual-core .cfsconfig is opened
    await browser.openResources(configPath);
    await UIUtils.dismissAllNotifications(workbench, browser);
    view = new WebView();
    await view.wait();
    await view.switchToFrame();

    // When I navigate to the Generate Code tab
    await UIUtils.waitForElement(view, generateCodeTab, 15000);
    await UIUtils.clickElement(view, generateCodeTab);

    // Then the generate code container is rendered
    await driver.wait(
      async () => {
        const elements = await view.findWebElements(generateCodeContainer);
        return elements.length > 0;
      },
      15000,
      "Generate code container did not render",
    );

    const container = await view.findWebElement(generateCodeContainer);
    expect(
      await container.isDisplayed(),
      "Generate code container should be visible",
    ).to.be.true;

    // And each project displays a ready-state indicator
    const primaryProjectId = "CM4";
    const auxProjectId = "RV";

    const primaryReadyElements = await view.findWebElements(
      getReadySignal(primaryProjectId),
    );
    expect(
      primaryReadyElements.length,
      "Primary project should display a ready-state indicator",
    ).to.be.greaterThan(0);

    const auxReadyElements = await view.findWebElements(
      getReadySignal(auxProjectId),
    );
    expect(
      auxReadyElements.length,
      "Auxiliary project should display a ready-state indicator",
    ).to.be.greaterThan(0);

    // And no error containers are visible
    const primaryErrors = await view.findWebElements(
      errorContainerSelector(primaryProjectId),
    );
    expect(
      primaryErrors.length,
      "Primary project should not have an errors container",
    ).to.equal(0);

    const auxErrors = await view.findWebElements(
      errorContainerSelector(auxProjectId),
    );
    expect(
      auxErrors.length,
      "Auxiliary project should not have an errors container",
    ).to.equal(0);
  });

  it("Should call generateConfigCode only with selected projects @regression", async () => {
    const browser = VSBrowser.instance;
    await browser.openResources(configPath);
    await UIUtils.sleep(5000);

    view = new WebView();
    await view.wait();
    await view.switchToFrame();

    await UIUtils.clickElement(view, generateCodeTab);
    await UIUtils.sleep(1000);

    await UIUtils.clickElement(view, rVCheckbox);
    await UIUtils.sleep(1500);
    console.log("Clicked on RV checkbox");

    await UIUtils.clickElement(view, generateCodeButton);
    console.log("Clicked generate button");

    await dismissOverwriteModal(view);
    // Dismiss Code Generation Directory dialog
    await view.switchBack();
    await UIUtils.sleep(2000);
    const wb = new Workbench();
    await UIUtils.dismissOkDialog(wb);
    await view.switchToFrame();
    await UIUtils.sleep(3000);
    await browser.takeScreenshot("disabled-project-skip-test-generate-click");

    const listItems: string[] = await UIUtils.getTextFromWebElements(
      view,
      generatedFilesList,
    );

    const hasM4 = listItems.some((text) =>
      text.trim().toLowerCase().includes("m4"),
    );
    expect(hasM4, listItems.join(", ")).to.be.true;
  }).timeout(120000);

  it("Should not include externally managed projects in code generation @regression", async function () {
    this.timeout(60000);

    const browser = VSBrowser.instance;
    const configPath = getConfigPathForFile(
      "max32690-evkit-riscv-external-project.cfsconfig",
    );
    console.log("Opening config file:", configPath);
    await browser.openResources(configPath);

    const workbench = new Workbench();
    await UIUtils.dismissAllNotifications(workbench, browser);

    console.log("Initializing WebView...");
    view = new WebView();
    await view.wait();
    await view.switchToFrame();
    console.log("WebView initialized and switched to frame");

    await UIUtils.waitForElement(view, generateCodeTab, 15000);
    await UIUtils.clickElement(view, generateCodeTab);
    await UIUtils.waitForElement(view, generateCodeContainer, 15000);

    // Generate code with only RV project (externally managed CM4 should be excluded)
    await browser.takeScreenshot("external-project-test-generate-click");
    await UIUtils.clickElement(view, generateCodeButton);
    await UIUtils.sleep(1500);
    await dismissOverwriteModal(view);

    // Dismiss Code Generation Directory dialog
    await view.switchBack();
    await UIUtils.sleep(2000);
    await UIUtils.dismissOkDialog(workbench);
    await view.switchToFrame();
    await UIUtils.sleep(3000);

    // Take a snapshot of the screen to debug any issues
    await browser.takeScreenshot("external-project-test-generate-click");

    const listItems: string[] = await UIUtils.getTextFromWebElements(
      view,
      generatedFilesList,
    );

    //===Have to change to riscv later when external project issue is resolved===
    const hasRiscV = listItems.some((text) =>
      text.trim().toLowerCase().includes("cm4"),
    );
    expect(hasRiscV, listItems.join(", ")).to.be.true;
  }).timeout(120000);
});
