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
import {
  By,
  EditorView,
  VSBrowser,
  WebDriver,
  Workbench,
  until,
} from "vscode-extension-tester";
import { expect } from "chai";
import { getConfigPathForFile } from "../../config-tools-utility/cfsconfig-utils";
import { UIUtils } from "../../../ui-test-utils/ui-utils";

describe("Editor Customization", () => {
  let browser: VSBrowser;
  let driver: WebDriver;
  let editor: EditorView;

  before(async function () {
    this.timeout(60000);

    ({ browser } = await UIUtils.setupTestSuite({ sleepMs: 3000 }));
    driver = browser.driver;
    editor = new EditorView();
  });

  it('Should display the "Show Source" quick access button when opening *.cfsconfig files @regression', async () => {
    const configPath = getConfigPathForFile("manual32690.cfsconfig");
    await browser.openResources(configPath);
    await UIUtils.sleep(3000);

    // Locate by aria-label rather than an absolute DOM path, since VS Code's
    // internal editor-actions wrapper nesting shifts between releases.
    const quickAccess = await driver.wait(
      until.elementLocated(
        By.css(
          '[id="workbench.parts.editor"] a.action-label[aria-label="(CFS) View Config File Source (JSON)"]',
        ),
      ),
      10000,
    );

    expect(await quickAccess.getAttribute("aria-label")).to.equal(
      "(CFS) View Config File Source (JSON)",
    );

    await quickAccess.click().then(async () => {
      const openTitles = await editor.getOpenEditorTitles();
      expect(
        openTitles.some((title) => title.includes("manual32690")),
        `Expected an open editor title to include 'manual32690', got: ${JSON.stringify(openTitles)}`,
      ).to.be.true;

      await new Workbench().executeCommand("workbench.action.closeAllEditors");
    });
  }).timeout(60000);
});
