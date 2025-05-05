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
import { By, EditorView, VSBrowser, WebDriver } from "vscode-extension-tester";
import { expect } from "chai";
import * as path from "path";

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

  it('Should display the "Show Source" quick access button when opening *.cfsconfig files', async () => {
    await browser.openResources(
      path.join(
        "src",
        "tests",
        "ui-test-config-tools",
        "fixtures",
        "test.cfsconfig",
      ),
    );

    await new Promise((resolve) => setTimeout(resolve, 3000));

    const quickAccess = await driver.findElement(
      By.xpath(
        '//*[@id="workbench.parts.editor"]/div[1]/div/div/div/div/div[2]/div[1]/div/div/div[4]/div[1]/div[2]/div/div/ul/li[1]/a',
      ),
    );

    expect(await quickAccess.getAttribute("aria-label")).to.equal(
      "(CFS) View Config File Source (JSON)",
    );

    await quickAccess.click().then(async () => {
      expect(await editor.getOpenEditorTitles()).to.include("test.cfsconfig");

      await editor.closeAllEditors();
    });
  }).timeout(60000);
});
