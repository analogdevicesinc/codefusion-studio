/**
 *
 * Copyright (c) 2024 Analog Devices, Inc.
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
import {
  By,
  EditorView,
  ModalDialog,
  VSBrowser,
  WebDriver,
  WebView,
  Workbench,
} from "vscode-extension-tester";
import { expect } from "chai";
import * as path from "path";
import * as fs from "fs";
import { UIUtils } from "../../ui-test-utils/ui-utils";

async function closeAllNotifications() {
  const wb = new Workbench();
  const notifications = await wb
    .getNotifications()
    .then((notifications) => notifications);

  const notificationsPromises = notifications.map(
    (notification) =>
      new Promise((resolve) => {
        notification.getActions().then(async (actions) => {
          if (actions.length > 1) {
            // The second option will dismiss the notification
            await actions[1].click();
            resolve("closed");
          } else {
            await notification.dismiss();
            resolve("closed");
          }
        });
      }),
  );

  await Promise.all(notificationsPromises);
}

function cleanupWorkspace() {
  const idePath = path.join(__dirname, "../../../../../ide/test/");

  const deleteFolderRecursive = (folderPath: string) => {
    if (fs.existsSync(folderPath)) {
      fs.readdirSync(folderPath).forEach((file) => {
        const curPath = path.join(folderPath, file);
        if (fs.lstatSync(curPath).isDirectory()) {
          // Recurse into subdirectory
          deleteFolderRecursive(curPath);
        } else {
          // Delete file
          fs.unlinkSync(curPath);
        }
      });
      fs.rmdirSync(folderPath);
    }
  };

  deleteFolderRecursive(idePath);
}

describe("Editor Customization", () => {
  let browser: VSBrowser;
  let driver: WebDriver;
  let editor: EditorView;

  before(async function () {
    this.timeout(60000);

    browser = VSBrowser.instance;
    driver = browser.driver;
    editor = new EditorView();

    await editor.closeAllEditors();

    await UIUtils.sleep(3000);
  });

  it("Should restore the persisted workspace configuration from a *.cfsworkspace file @smoke", async () => {
    console.log(
      "Starting test: Should restore the persisted workspace configuration",
    );

    console.log("Opening persisted-sample.cfsworkspace file");
    await browser.openResources(
      path.join(
        "src",
        "tests",
        "ui-test-workspace-creation",
        "fixtures",
        "persisted-sample.cfsworkspace",
      ),
    );

    const boardId = "AD-APARD32690-SL___WLP";
    const firstCoreId = "corepart_01jrdgezrce69rsqvja125h3v2";
    console.log(
      `Test parameters - Board ID: ${boardId}, Core ID: ${firstCoreId}`,
    );

    console.log("Waiting for workspace to load (10 seconds)");
    await UIUtils.sleep(10000);
    console.log("Closing all notifications");
    await closeAllNotifications();

    console.log("Creating WebView instance");
    const view = new WebView();
    await UIUtils.sleep(10000);
    console.log("Switching to webview frame");
    await view.switchToFrame().then(async () => {
      console.log("Waiting for DOM elements to load (10 seconds)");
      await UIUtils.sleep(10000);

      console.log("expand all soc groups");
      const expandAllBtn = await UIUtils.findWebElement(
        view,
        By.css('[data-test="soc-selection:segmented-controls:expand"]'),
      );
      await UIUtils.clickElement(view, expandAllBtn);
      await UIUtils.sleep(1000);

      console.log("SoC Selection Screen - Finding MAX32690 card");
      const mainSocCard = await UIUtils.findWebElement(
        view,
        By.css('[data-test="soc-selection:option:MAX32690"]'),
      );

      const isActive = await mainSocCard.getAttribute("data-active");
      console.log(`SoC card MAX32690 active state: ${isActive}`);
      expect(isActive).to.equal("true");

      console.log("Waiting after SoC validation (5 seconds)");
      await UIUtils.sleep(5000);

      console.log("Finding continue button");
      const continueBtn = await UIUtils.findWebElement(
        view,
        By.css('[data-test="wrksp-footer:continue-btn"]'),
      );

      console.log("Closing any remaining notifications");
      await closeAllNotifications();
      await UIUtils.sleep(10000);

      console.log("Clicking continue button to proceed to board selection");
      await UIUtils.clickElement(view, continueBtn);

      console.log("Board Selection Screen - Finding board card");
      const selectedBoardCard = await UIUtils.findWebElement(
        view,
        By.css(`[data-test="boardSelection:card:${boardId}"]`),
      );

      const boardActive = await selectedBoardCard.getAttribute("data-active");
      console.log(`Board card ${boardId} active state: ${boardActive}`);
      expect(boardActive).to.equal("true");

      console.log("Proceeding to workspace options screen");
      await UIUtils.clickElement(view, continueBtn);

      console.log("Workspace Options Screen - Finding manual config card");
      const selectedWorkspaceCard = await UIUtils.findWebElement(
        view,
        By.css('[data-test="workspaceOptions:card:manualConfig"]'),
      );

      console.log("Selecting manual configuration option");
      await UIUtils.clickElement(view, selectedWorkspaceCard);

      console.log("Proceeding to cores selection screen");
      await UIUtils.clickElement(view, continueBtn);

      console.log("Cores Selection Screen - Finding first core card");
      const firstSelectedCoreCard = await UIUtils.findWebElement(
        view,
        By.css(`[data-test="coresSelection:card:${firstCoreId}"]`),
      );

      const coreActive =
        await firstSelectedCoreCard.getAttribute("data-active");
      console.log(`Core card ${firstCoreId} active state: ${coreActive}`);
      expect(coreActive).to.equal("true");

      console.log("Brief pause before proceeding (1 second)");
      await UIUtils.sleep(1000);

      console.log("Proceeding to core details screen");
      await UIUtils.clickElement(view, continueBtn);
      console.log("Core Details Screen - Configuring first core");
      await UIUtils.sleep(1000);
      console.log("Finding Zephyr plugin for first core");
      const firstCodeGenPluginZephyr = await UIUtils.findWebElement(
        view,
        By.css(
          '[data-test="coreConfig:card:com.analog.project.zephyr.mock.plugin"]',
        ),
      );

      console.log("Selecting Zephyr plugin for first core");
      await UIUtils.clickElement(view, firstCodeGenPluginZephyr);

      await UIUtils.sleep(1000);

      console.log("Proceeding to second core configuration");
      await UIUtils.clickElement(view, continueBtn);

      console.log("Finding MSDK plugin for second core");
      const secondCodeGenPluginZephyr = await UIUtils.findWebElement(
        view,
        By.css(
          '[data-test="coreConfig:card:com.analog.project.msdk.mock.plugin"]',
        ),
      );

      console.log("Selecting MSDK plugin for second core");
      await UIUtils.clickElement(view, secondCodeGenPluginZephyr);
      await UIUtils.sleep(1000);

      console.log("Proceeding to confirmation screen");
      await UIUtils.clickElement(view, continueBtn);

      console.log("Confirmation Screen - Validating summary section");
      console.log("Finding SoC summary element");
      const socSummary = await UIUtils.findWebElement(
        view,
        By.css('[data-test="confirmation-screen:summary:soc"]'),
      );

      console.log("Finding board summary element");
      const boardSummary = await UIUtils.findWebElement(
        view,
        By.css('[data-test="confirmation-screen:summary:board-package"]'),
      );

      console.log("Finding cores summary element");
      const coresSummary = await UIUtils.findWebElement(
        view,
        By.css('[data-test="confirmation-screen:summary:cores"]'),
      );

      const socText = await socSummary.getText();
      console.log(
        `SoC summary validation - Expected: MAX32690, Actual: ${socText}`,
      );
      expect(socText).to.equal("MAX32690");

      const boardText = await boardSummary.getText();
      console.log(
        `Board summary validation - Expected: AD-APARD32690-SL WLP, Actual: ${boardText}`,
      );
      expect(boardText).to.equal("AD-APARD32690-SL WLP");

      const coresText = await coresSummary.getText();
      console.log(
        `Cores summary validation - Expected: Arm Cortex-M4F and RISC-V, Actual: ${coresText}`,
      );
      expect(coresText).to.equal("Arm Cortex-M4F and RISC-V");

      console.log("Validating workspace name and path inputs");
      console.log("Finding workspace name input field");
      const workspaceNameInput = await UIUtils.findWebElement(
        view,
        By.css(
          '[data-test="confirmation-screen:workspace-name:text-field-control-input"]',
        ),
      );

      console.log("Finding workspace path input field");
      const workspacePathInput = await UIUtils.findWebElement(
        view,
        By.css(
          '[data-test="confirmation-screen:workspace-path:text-field-control-input"]',
        ),
      );

      console.log("Finding default location checkbox");
      const defaultLocationCheckbox = await UIUtils.findWebElement(
        view,
        By.css(
          '[data-test="confirmation-screen:workspace-path:default-location-checkbox"]',
        ),
      );

      const nameValue = await workspaceNameInput.getAttribute("value");
      console.log(
        `Workspace name validation - Expected: test-workspace-name, Actual: ${nameValue}`,
      );
      expect(nameValue).to.equal("test-workspace-name");

      const pathValue = await workspacePathInput.getAttribute("value");
      console.log(
        `Workspace path validation - Expected: test, Actual: ${pathValue}`,
      );
      expect(pathValue).to.equal("test");

      const checkboxValue =
        await defaultLocationCheckbox.getAttribute("current-checked");
      console.log(
        `Default location checkbox validation - Expected: false, Actual: ${checkboxValue}`,
      );
      expect(checkboxValue).to.equal("false");

      console.log("Switching back from webview frame");
      await view.switchBack();

      console.log("Cleaning up - closing all editors");
      const wb = new Workbench();
      await wb.wait();
      await wb.executeCommand("view: close all editors");

      await UIUtils.sleep(1000);

      console.log("Handling save dialog - selecting Don't Save");
      const dialog = new ModalDialog();
      await dialog.pushButton("Don't Save");

      console.log(
        "Test completed successfully: Should restore the persisted workspace configuration",
      );
    });
  }).timeout(120000);

  it("Should reset board/package/core selection from a *.cfsworkspace file when changing SOC @smoke", async () => {
    console.log(
      "Starting test: Should reset board/package/core selection when changing SOC",
    );

    const view = new WebView();
    const mainSoC = "MAX32690";
    const secondarySoC = "MAX32655";
    const boardId = "AD-APARD32690-SL___WLP";
    const firstCoreId = "corepart_01jrdgezrce69rsqvja125h3v2";
    console.log(
      `Test parameters - Main SoC: ${mainSoC}, Secondary SoC: ${secondarySoC}, Board ID: ${boardId}`,
    );

    console.log("Opening persisted-sample.cfsworkspace file");
    await browser.openResources(
      path.join(
        "src",
        "tests",
        "ui-test-workspace-creation",
        "fixtures",
        "persisted-sample.cfsworkspace",
      ),
    );
    console.log("Waiting for workspace to load (10 seconds)");
    await UIUtils.sleep(10000);
    console.log("Closing all notifications");
    await closeAllNotifications();

    console.log("Switching to webview frame");
    await view.switchToFrame().then(async () => {
      console.log("expand all soc groups");
      const expandAllBtn = await UIUtils.findWebElement(
        view,
        By.css('[data-test="soc-selection:segmented-controls:expand"]'),
      );
      await UIUtils.clickElement(view, expandAllBtn);
      await UIUtils.sleep(3000);

      console.log(`Finding main SoC card: ${mainSoC}`);
      const mainSocCard = await UIUtils.findWebElement(
        view,
        By.css(`[data-test="soc-selection:option:${mainSoC}"]`),
      );

      const initialActiveState = await mainSocCard.getAttribute("data-active");
      console.log(
        `Initial SoC card ${mainSoC} active state: ${initialActiveState}`,
      );
      expect(initialActiveState).to.equal("true");

      console.log(`Finding secondary SoC card: ${secondarySoC}`);
      const newSelectedSocCard = await UIUtils.findWebElement(
        view,
        By.css(`[data-test="soc-selection:option:${secondarySoC}"]`),
      );

      console.log(`Switching to ${secondarySoC} to test reset behavior`);
      await UIUtils.clickElement(view, newSelectedSocCard);

      console.log("Waiting for SoC change to process (4 seconds)");
      await UIUtils.sleep(4000);

      console.log(`Switching back to original SoC: ${mainSoC}`);
      await UIUtils.clickElement(view, mainSocCard);

      console.log("Waiting for SoC change to complete (4 seconds)");
      await UIUtils.sleep(4000);

      console.log("Finding continue button");
      const continueBtn = await UIUtils.findWebElement(
        view,
        By.css('[data-test="wrksp-footer:continue-btn"]'),
      );

      console.log("Clicking continue button to proceed to board selection");
      await UIUtils.clickElement(view, continueBtn);

      console.log("Waiting for board selection screen to load (5 seconds)");
      await UIUtils.sleep(5000);

      console.log(`Finding previously selected board card: ${boardId}`);
      const selectedBoardCard = await UIUtils.findWebElement(
        view,
        By.css(`[data-test="boardSelection:card:${boardId}"]`),
      );

      const resetBoardState =
        await selectedBoardCard.getAttribute("data-active");
      console.log(
        `Validating board reset - ${boardId} should be deselected after SoC change: ${resetBoardState}`,
      );
      expect(resetBoardState).to.equal("false");

      console.log("Finding new board package option: FTHR___TQFN");
      const newSelectedBoardPackage = await UIUtils.findWebElement(
        view,
        By.css('[data-test="boardSelection:card:FTHR___TQFN"]'),
      );

      console.log("Selecting new board package");
      await UIUtils.clickElement(view, newSelectedBoardPackage);

      const newBoardState =
        await newSelectedBoardPackage.getAttribute("data-active");
      console.log(`New board package selection confirmed: ${newBoardState}`);
      expect(newBoardState).to.equal("true");

      console.log("Proceeding to workspace options");
      await UIUtils.clickElement(view, continueBtn);

      console.log("Waiting for workspace options screen (5 seconds)");
      await UIUtils.sleep(5000);

      console.log("Workspace Options Screen - Finding manual config card");
      const selectedWorkspaceCard = await UIUtils.findWebElement(
        view,
        By.css('[data-test="workspaceOptions:card:manualConfig"]'),
      );

      console.log("Selecting manual configuration");
      await UIUtils.clickElement(view, selectedWorkspaceCard);

      console.log("Waiting after workspace option selection (5 seconds)");
      await UIUtils.sleep(5000);

      console.log("Proceeding to cores selection");
      await UIUtils.clickElement(view, continueBtn);

      console.log("Waiting for cores selection screen (5 seconds)");
      await UIUtils.sleep(5000);

      console.log(`Finding core card: ${firstCoreId}`);
      const firstSelectedCoreCard = await UIUtils.findWebElement(
        view,
        By.css(`[data-test="coresSelection:card:${firstCoreId}"]`),
      );

      const coreActiveState =
        await firstSelectedCoreCard.getAttribute("data-active");
      console.log(
        `Core selection validation - Primary core should be enabled by default: ${coreActiveState}`,
      );
      expect(coreActiveState).to.equal("true");

      console.log("Switching back from webview frame");
      await view.switchBack();

      console.log("Starting cleanup process");
      const wb = new Workbench();
      await wb.wait();

      console.log("Closing all editors");
      await wb.executeCommand("view: close all editors");

      console.log("Brief pause before dialog handling");
      await new Promise((res) => {
        setTimeout(res, 1000);
      });

      console.log("Handling save dialog - selecting Don't Save");
      const dialog = new ModalDialog();
      await dialog.pushButton("Don't Save");

      console.log(
        "Test completed successfully: Should reset board/package/core selection when changing SOC",
      );
    });
  }).timeout(120000);

  it('Should display the "Show Source" quick access button when opening *.cfsworkspace files', async () => {
    console.log(
      "Starting test: Should display Show Source quick access button",
    );

    console.log("Opening persisted-sample.cfsworkspace file");
    await browser.openResources(
      path.join(
        "src",
        "tests",
        "ui-test-workspace-creation",
        "fixtures",
        "persisted-sample.cfsworkspace",
      ),
    );

    console.log("Waiting for workspace to load (10 seconds)");
    await UIUtils.sleep(10000);

    console.log("Closing all notifications");
    await closeAllNotifications();

    console.log("Additional wait for UI stabilization (10 seconds)");
    await UIUtils.sleep(10000);

    console.log("Finding Show Source quick access button via XPath");
    const quickAccess = await driver.findElement(
      By.xpath(
        '//*[@id="workbench.parts.editor"]/div[1]/div/div/div/div/div[2]/div[1]/div/div/div[4]/div[1]/div[2]/div/div/ul/li[1]/a',
      ),
    );

    const ariaLabel = await quickAccess.getAttribute("aria-label");
    console.log(
      `Quick access button aria-label validation - Expected: (CFS) View Workspace File Source (JSON), Actual: ${ariaLabel}`,
    );
    expect(ariaLabel).to.equal("(CFS) View Workspace File Source (JSON)");

    console.log("Clicking Show Source button");
    await quickAccess.click().then(async () => {
      console.log("Checking open editor titles");
      const openTitles = await editor.getOpenEditorTitles();
      console.log(
        `Editor titles validation - Open editors: ${JSON.stringify(openTitles)}`,
      );
      expect(openTitles).to.include("persisted-sample.cfsworkspace");

      console.log("Closing all editors");
      await editor.closeAllEditors();

      console.log(
        "Test completed successfully: Should display Show Source quick access button",
      );
    });
  }).timeout(120000);

  it("Should generate workspace files using cfs-plugins", async () => {
    console.log(
      "Starting test: Should generate workspace files using cfs-plugins",
    );

    console.log("Opening persisted-sample.cfsworkspace file");
    await browser.openResources(
      path.join(
        "src",
        "tests",
        "ui-test-workspace-creation",
        "fixtures",
        "persisted-sample.cfsworkspace",
      ),
    );

    console.log("Waiting for workspace to load (10 seconds)");
    await UIUtils.sleep(10000);

    console.log("Closing all notifications");
    await closeAllNotifications();

    console.log("Creating WebView instance");
    const view = new WebView();

    console.log("Additional wait for WebView initialization (10 seconds)");
    await UIUtils.sleep(10000);

    console.log("Switching to webview frame");
    await view.switchToFrame();

    console.log("Waiting for DOM elements to stabilize (10 seconds)");
    await UIUtils.sleep(10000);

    console.log("Finding continue button");
    const continueBtn = await UIUtils.findWebElement(
      view,
      By.css('[data-test="wrksp-footer:continue-btn"]'),
    );

    console.log("Navigating through SoC selection screen");
    await UIUtils.clickElement(view, continueBtn);

    console.log("Brief pause between screen transitions");
    await UIUtils.sleep(1000);

    console.log(
      "Navigating through board selection to workspace options screen",
    );
    await UIUtils.clickElement(view, continueBtn);

    console.log(
      "Waiting for workspace options screen to fully load (10 seconds)",
    );
    await UIUtils.sleep(10000);

    console.log("Finding Zephyr Blinky template card");
    const selectedTemplateCard = await UIUtils.findWebElement(
      view,
      By.css('[data-test="templateSelection:card:mock.workspace.blinky"]'),
    );

    console.log("Scrolling template card into view");
    await driver.executeScript(
      "arguments[0].scrollIntoView({block: 'center'});",
      selectedTemplateCard,
    );

    console.log("Brief pause after scrolling");
    await UIUtils.sleep(500);

    console.log("Selecting Zephyr Blinky template");
    await UIUtils.clickElement(view, selectedTemplateCard);

    console.log("Waiting after template selection");
    await UIUtils.sleep(1000);

    console.log("Proceeding to confirmation screen");
    await UIUtils.clickElement(view, continueBtn);

    console.log("Waiting for confirmation screen to load");
    await UIUtils.sleep(1000);

    console.log("Finding Create Workspace button");
    const createWrkspBtn = await UIUtils.findWebElement(
      view,
      By.css('[data-test="wrksp-footer:continue-btn"]'),
    );

    const buttonText = await createWrkspBtn.getText();
    console.log(
      `Create button text validation - Expected: Create Workspace, Actual: ${buttonText}`,
    );
    expect(buttonText).to.equal("Create Workspace");

    console.log("Initiating workspace creation process");
    await UIUtils.clickElement(view, createWrkspBtn);

    console.log("Waiting for workspace generation to complete (20 seconds)");
    await UIUtils.sleep(20000);

    console.log("Validating workspace file creation on disk");
    const workspaceFilePath = path.join(
      __dirname,
      "../../../../../ide/test/test-workspace-name/.cfs/.cfsworkspace",
    );
    console.log(`Expected workspace file path: ${workspaceFilePath}`);

    console.log("Additional wait before file validation (5 seconds)");
    await UIUtils.sleep(5000);

    console.log("Checking if workspace file exists");
    const fileExists = fs.existsSync(workspaceFilePath);
    console.log(
      `Workspace file existence validation - File exists: ${fileExists}`,
    );
    expect(fileExists).to.equal(
      true,
      `Expected file ${workspaceFilePath} to exist, but it does not.`,
    );
    console.log(`Workspace file successfully created at: ${workspaceFilePath}`);

    console.log("Brief pause before cleanup (5 seconds)");
    await UIUtils.sleep(5000);

    console.log("Starting workspace cleanup process");
    cleanupWorkspace();

    console.log("Switching back from webview frame");
    await view.switchBack();

    console.log("Waiting after frame switch (2 seconds)");
    await UIUtils.sleep(2000);

    console.log("Closing all editors via Workbench");
    const wb = new Workbench();
    await wb.executeCommand("view: close all editors");

    console.log("Handling save dialog - selecting Don't Save");
    const dialog = new ModalDialog();
    await dialog.pushButton("Don't Save");

    console.log(
      "Test completed successfully: Should generate workspace files using cfs-plugins",
    );
  }).timeout(120000);
});
