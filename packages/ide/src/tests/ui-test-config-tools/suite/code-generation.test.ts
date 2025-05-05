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
import { expect } from "chai";
import { describe, it } from "mocha";
import * as path from "path";
import { By, EditorView, VSBrowser, WebView } from "vscode-extension-tester";

// Helper function to dismiss the overwrite modal if it appears
async function dismissOverwriteModal(view: WebView): Promise<void> {
  try {
    const dismissBtn = await view
      .findWebElement(By.css('[data-test="generate-code:modal:overwrite"]'))
      .catch(() => null);

    if (dismissBtn) {
      await dismissBtn.click();
      await new Promise((resolve) => setTimeout(resolve, 3000));
      console.log("Dismissed overwrite modal");
    }
  } catch (error) {
    console.warn("no dismiss button found");
  }
}

describe("Config tools code generation", function () {
  before(async function () {
    this.timeout(60000);

    const editorView = new EditorView();

    await editorView.closeAllEditors();

    await new Promise((resolve) => setTimeout(resolve, 500));
  });

  it("Should call generateConfigCode only with selected projects", async function () {
    const browser = VSBrowser.instance;

    await browser.openResources(
      path.join(
        "src",
        "tests",
        "ui-test-config-tools",
        "fixtures",
        "max32690-wlp-dual-core-blinky.cfsconfig",
      ),
    );

    await new Promise((resolve) => setTimeout(resolve, 5000));

    const view = new WebView();

    await view.wait();

    await view.switchToFrame();

    const navItem = await view.findWebElement(By.css("#generate"));

    await navItem.click();

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const projectRVCheckbox = await view.findWebElement(
      By.css('[data-test="generate-code:core:RV:checkbox"]'),
    );

    await projectRVCheckbox.click();

    await new Promise((resolve) => setTimeout(resolve, 1500));

    console.log("Clicked on RV checkbox");

    const generateBtn = await view.findWebElement(
      By.xpath('//*[@id="root"]/div/section/div[2]/vscode-button'),
    );

    console.log("Found generate button");

    await generateBtn.click();

    console.log("Clicked generate button");

    await dismissOverwriteModal(view);

    await new Promise((resolve) => setTimeout(resolve, 3000));

    await dismissOverwriteModal(view);

    await new Promise((resolve) => setTimeout(resolve, 3000));

    await browser.takeScreenshot("disabled-project-skip-test-generate-click");

    const generatedFilesList = await view.findWebElement(
      By.css('[data-test="generated-files:list-container"]'),
    );

    const listItems = await generatedFilesList.findElements(By.css("li"));

    await Promise.all(
      listItems.map(async (child) => {
        const text = await child.getText();

        expect(text.toLowerCase()).to.include("m4");
      }),
    );

    await view.switchBack();

    const ev = new EditorView();

    await ev.closeAllEditors();
  }).timeout(120000);

  it("Should not include externally managed projects in code generation", async function () {
    this.timeout(60000);

    const browser = VSBrowser.instance;

    await browser.openResources(
      path.join(
        "src",
        "tests",
        "ui-test-config-tools",
        "fixtures",
        "max32690-wlp-with-external-project.cfsconfig",
      ),
    );

    await new Promise((resolve) => setTimeout(resolve, 5000));

    const view = new WebView();

    await view.wait();

    await view.switchToFrame();

    expect(await view.findWebElement(By.css("#generate"))).to.exist;

    const navItem = await view.findWebElement(By.css("#generate"));

    await navItem.click();

    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Generate code with only RV project (externally managed CM4 should be excluded)
    const generateBtn = await view.findWebElement(
      By.xpath('//*[@id="root"]/div/section/div[2]/vscode-button'),
    );

    console.log("Found generate button");

    await generateBtn.click();

    await new Promise((resolve) => setTimeout(resolve, 1500));

    await dismissOverwriteModal(view);

    // take a snapshot of the screen to debug any issues
    await browser.takeScreenshot("external-project-test-generate-click");

    const generatedFilesList = await view.findWebElement(
      By.css('[data-test="generated-files:list-container"]'),
    );

    const listItems = await generatedFilesList.findElements(By.css("li"));

    await Promise.all(
      listItems.map(async (child) => {
        const text = await child.getText();

        expect(text.toLowerCase()).to.include("riscv");
      }),
    );

    await view.switchBack();

    const ev = new EditorView();

    await ev.closeAllEditors();
  }).timeout(120000);
});
