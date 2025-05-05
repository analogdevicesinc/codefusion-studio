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

async function closeAllNotifications() {
  const wb = new Workbench();
  const notifications = await wb.getNotifications().then((notifications) => {
    return notifications;
  });

  const notificationsPromises = notifications.map(
    (notification) =>
      new Promise((resolve) => {
        notification.getActions().then(async (actions) => {
          if (actions.length > 1) {
            // the second option will dismiss the notification
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

    await new Promise((resolve) => setTimeout(resolve, 3000));
  });

  it("Should restore the persisted workspace configuration from a *.cfsworkspace file", async () => {
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

    await new Promise((resolve) => setTimeout(resolve, 10000));
    await closeAllNotifications();

    const view = new WebView();
    await new Promise((resolve) => setTimeout(resolve, 10000));
    await view.switchToFrame().then(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10000));
      // Soc Selection Screen
      const selectedSocCard = await view.findWebElement(
        By.css('[data-test="socSelection:card:MAX32690"]'),
      );

      expect(await selectedSocCard.getAttribute("data-active")).to.equal(
        "true",
      );

      const continueBtn = await view.findWebElement(
        By.css('[data-test="wrksp-footer:continue-btn"]'),
      );

      await closeAllNotifications();
      await new Promise((resolve) => setTimeout(resolve, 10000));

      await continueBtn.click();

      // Board selection screen
      const selectedBoardCard = await view.findWebElement(
        By.css(`[data-test="boardSelection:card:${boardId}"]`),
      );

      expect(await selectedBoardCard.getAttribute("data-active")).to.equal(
        "true",
      );

      await continueBtn.click();

      // Worspace options screen
      const selectedWorkspaceCard = await view.findWebElement(
        By.css('[data-test="workspaceOptions:card:manualConfig"]'),
      );

      await selectedWorkspaceCard.click();

      await continueBtn.click();

      // Cores selection screen
      const firstSelectedCoreCard = await view.findWebElement(
        By.css(`[data-test="coresSelection:card:${firstCoreId}"]`),
      );

      expect(await firstSelectedCoreCard.getAttribute("data-active")).to.equal(
        "true",
      );

      const firstSelectedCoreCardConfigIcon = await view.findWebElement(
        By.css(`[data-test="coresSelection:card:configIcon:${firstCoreId}"]`),
      );

      await firstSelectedCoreCardConfigIcon.click();

      // Core details screen
      // @TODO: enable back once setting up plugins for extester is completed.
      // const codeGenPluginZephyr = await view.findWebElement(
      //   By.css('[data-test="coreConfig:card:MAX32690_zephyr.plugin"]'),
      // );

      // expect(await codeGenPluginZephyr.getAttribute("data-active")).to.equal(
      //   "true",
      // );

      const backBtn = await view.findWebElement(
        By.css('[data-test="wrksp-footer:back-btn"]'),
      );

      await backBtn.click();

      await new Promise((res) => {
        setTimeout(res, 1000);
      });

      await continueBtn.click();

      // Confirmation screen
      // Summary section should reflect the persisted configuration
      const socSummary = await view.findWebElement(
        By.css('[data-test="confirmation-screen:summary:soc"]'),
      );

      const boardSummary = await view.findWebElement(
        By.css('[data-test="confirmation-screen:summary:board-package"]'),
      );

      const coresSummary = await view.findWebElement(
        By.css('[data-test="confirmation-screen:summary:cores"]'),
      );

      expect(await socSummary.getText()).to.equal("MAX32690");

      expect(await boardSummary.getText()).to.equal("AD-APARD32690-SL WLP");

      expect(await coresSummary.getText()).to.equal(
        "Arm Cortex-M4F and RISC-V",
      );

      // Name and path inputs should reflect the persisted configuration
      const workspaceNameInput = await view.findWebElement(
        By.css(
          '[data-test="confirmation-screen:workspace-name:text-field-control-input"]',
        ),
      );

      const workspacePathInput = await view.findWebElement(
        By.css(
          '[data-test="confirmation-screen:workspace-path:text-field-control-input"]',
        ),
      );

      const defaultLocationCheckbox = await view.findWebElement(
        By.css(
          '[data-test="confirmation-screen:workspace-path:default-location-checkbox"]',
        ),
      );

      expect(await workspaceNameInput.getAttribute("value")).to.equal(
        "test-workspace-name",
      );
      expect(await workspacePathInput.getAttribute("value")).to.equal(
        "test/workspace/path",
      );
      expect(
        await defaultLocationCheckbox.getAttribute("current-checked"),
      ).to.equal("false");

      await view.switchBack();

      const wb = new Workbench();
      await wb.wait();
      await wb.executeCommand("view: close all editors");

      await new Promise((res) => {
        setTimeout(res, 1000);
      });
    });
  }).timeout(120000);

  it("Should reset board/package/core selection from a *.cfsworkspace file when changing SOC", async () => {
    const view = new WebView();
    const mainSoC = "MAX32690";
    const secondarySoC = "MAX32655";
    const boardId = "AD-APARD32690-SL___WLP";
    const firstCoreId = "corepart_01jrdgezrce69rsqvja125h3v2";

    await browser.openResources(
      path.join(
        "src",
        "tests",
        "ui-test-workspace-creation",
        "fixtures",
        "persisted-sample.cfsworkspace",
      ),
    );

    view.wait();
    await closeAllNotifications();

    await view.switchToFrame().then(async () => {
      const selectedSocCard = await view.findWebElement(
        By.css(`[data-test="socSelection:card:${mainSoC}"]`),
      );

      expect(await selectedSocCard.getAttribute("data-active")).to.equal(
        "true",
      );

      const newSelectedSocCard = await view.findWebElement(
        By.css(`[data-test="socSelection:card:${secondarySoC}"]`),
      );

      await newSelectedSocCard.click();

      await new Promise((resolve) => setTimeout(resolve, 1000));

      await selectedSocCard.click();

      const continueBtn = await view.findWebElement(
        By.css('[data-test="wrksp-footer:continue-btn"]'),
      );

      await continueBtn.click();

      await new Promise((resolve) => setTimeout(resolve, 5000));

      const selectedBoardCard = await view.findWebElement(
        By.css(`[data-test="boardSelection:card:${boardId}"]`),
      );

      expect(await selectedBoardCard.getAttribute("data-active")).to.equal(
        "false",
      );

      const newSelectedBoardPackage = await view.findWebElement(
        By.css('[data-test="boardSelection:card:FTHR___TQFN"]'),
      );

      await newSelectedBoardPackage.click();

      expect(
        await newSelectedBoardPackage.getAttribute("data-active"),
      ).to.equal("true");

      await continueBtn.click();

      await new Promise((resolve) => setTimeout(resolve, 5000));

      const selectedWorkspaceCard = await view.findWebElement(
        By.css('[data-test="workspaceOptions:card:manualConfig"]'),
      );

      await selectedWorkspaceCard.click();

      await continueBtn.click();

      await new Promise((resolve) => setTimeout(resolve, 5000));

      const firstSelectedCoreCard = await view.findWebElement(
        By.css(`[data-test="coresSelection:card:${firstCoreId}"]`),
      );

      expect(await firstSelectedCoreCard.getAttribute("data-active")).to.equal(
        "false",
      );

      await view.switchBack();

      const wb = new Workbench();

      await wb.wait();

      await wb.executeCommand("view: close all editors");

      await new Promise((res) => {
        setTimeout(res, 1000);
      });

      const dialog = new ModalDialog();

      await dialog.pushButton("Don't Save");
    });
  }).timeout(120000);

  it('Should display the "Show Source" quick access button when opening *.cfsworkspace files', async () => {
    await browser.openResources(
      path.join(
        "src",
        "tests",
        "ui-test-workspace-creation",
        "fixtures",
        "persisted-sample.cfsworkspace",
      ),
    );

    await new Promise((resolve) => setTimeout(resolve, 10000));
    await closeAllNotifications();
    await new Promise((resolve) => setTimeout(resolve, 10000));

    const quickAccess = await driver.findElement(
      By.xpath(
        '//*[@id="workbench.parts.editor"]/div[1]/div/div/div/div/div[2]/div[1]/div/div/div[4]/div[1]/div[2]/div/div/ul/li[1]/a',
      ),
    );

    expect(await quickAccess.getAttribute("aria-label")).to.equal(
      "(CFSworkspace) View Config File Source (JSON)",
    );

    await quickAccess.click().then(async () => {
      expect(await editor.getOpenEditorTitles()).to.include(
        "persisted-sample.cfsworkspace",
      );

      await editor.closeAllEditors();
    });
  }).timeout(120000);
});
