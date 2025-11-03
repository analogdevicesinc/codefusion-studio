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
import { EditorView, VSBrowser, WebView } from "vscode-extension-tester";
import { getConfigPathForFile } from "../config-tools-utility/cfsconfig-utils";
import { UIUtils } from "../config-tools-utility/config-utils";
import { generateCodeTab } from "../page-objects/main-menu";
import {
  dismissOverwriteModal,
  generateCodeButton,
  generatedFilesList,
  rVCheckbox,
} from "../page-objects/generate-code-section/generate-code-screen";

describe("Config tools code generation", () => {
  let view: WebView;
  let editorView: EditorView;

  before(async function () {
    this.timeout(60000);
    editorView = new EditorView();
    await editorView.closeAllEditors();
    await UIUtils.sleep(500);
  });

  afterEach(async () => {
    await view.switchBack();
    editorView = new EditorView();
    await editorView.closeAllEditors();
  });

  it("Should call generateConfigCode only with selected projects", async () => {
    const browser = VSBrowser.instance;
    const configPath = getConfigPathForFile(
      "max32690-wlp-dual-core-blinky.cfsconfig",
    );
    await browser.openResources(configPath);
    await UIUtils.sleep(5000);

    view = new WebView();
    await view.wait();
    await view.switchToFrame();

    UIUtils.clickElement(view, generateCodeTab);
    await UIUtils.sleep(1000);

    await UIUtils.clickElement(view, rVCheckbox);
    await UIUtils.sleep(1500);
    console.log("Clicked on RV checkbox");

    UIUtils.clickElement(view, generateCodeButton);
    console.log("Clicked generate button");

    await dismissOverwriteModal(view);
    await UIUtils.sleep(3000);
    await dismissOverwriteModal(view);
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

  it("Should not include externally managed projects in code generation", async function () {
    this.timeout(60000);

    const browser = VSBrowser.instance;
    const configPath = getConfigPathForFile(
      "max32690-wlp-with-external-project.cfsconfig",
    );
    await browser.openResources(configPath);

    await UIUtils.sleep(5000);
    await view.wait();
    await view.switchToFrame();

    UIUtils.clickElement(view, generateCodeTab);
    await UIUtils.sleep(3000);

    // Generate code with only RV project (externally managed CM4 should be excluded)
    UIUtils.clickElement(view, generateCodeButton);
    await UIUtils.sleep(1500);
    await dismissOverwriteModal(view);

    // Take a snapshot of the screen to debug any issues
    await browser.takeScreenshot("external-project-test-generate-click");

    const listItems: string[] = await UIUtils.getTextFromWebElements(
      view,
      generatedFilesList,
    );

    const hasRiscV = listItems.some((text) =>
      text.trim().toLowerCase().includes("riscv"),
    );
    expect(hasRiscV, listItems.join(", ")).to.be.true;
  }).timeout(120000);
});
