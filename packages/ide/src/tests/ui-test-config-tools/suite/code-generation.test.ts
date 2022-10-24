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
import * as path from "path";
import {
  By,
  CustomEditor,
  EditorView,
  VSBrowser,
  Workbench,
} from "vscode-extension-tester";

describe.skip("Config tools code generation", () => {
  let browser: VSBrowser;

  before(function () {
    this.timeout(60000);

    if (browser === undefined) {
      browser = VSBrowser.instance;
    }
  });

  it("Should generate code files when the firmware platform is Zephyr", async function () {
    this.timeout(60000);

    await browser.openResources(
      path.join(
        "src",
        "tests",
        "ui-test-config-tools",
        "fixtures",
        "max32690-wlp-zephyr-configured.cfsconfig",
      ),
    );

    await new Promise((resolve) => setTimeout(resolve, 3000));

    const editor = new CustomEditor();

    const view = await editor.getWebView();

    await view.wait();

    await view.switchToFrame();

    const navItem = await view.findWebElement(By.css("#generate"));

    await navItem.click().then(async () => {
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // assert engine list is rendered
      expect(await view.findWebElement(By.css("#zephyr"))).to.exist;
    });

    const generateBtn = await view.findWebElement(
      By.xpath('//*[@id="root"]/div/section/div[2]/vscode-button'),
    );

    await generateBtn.click().then(async () => {
      await new Promise((resolve) => setTimeout(resolve, 3000));

      await view.switchBack();

      const editorView = new EditorView();

      const files = await editorView.getOpenEditorTitles();

      const expectedFiles = [
        "max32690-wlp-zephyr-configured.cfsconfig",
        "cfs_config.overlay",
        "prj.conf",
      ];

      expect(files).to.have.members(expectedFiles);
    });

    const wb = new Workbench();

    // Close prj.conf
    await wb.executeCommand("Revert and close editor");
    // Close cfs_config.overlay
    await wb.executeCommand("Revert and close editor");
    // Close max32690-wlp-zephyr-configured.cfsconfig
    await wb.executeCommand("Revert and close editor");
  }).timeout(60000);

  it("Should generate code files when the firmware platform is MSDK", async function () {
    this.timeout(60000);

    await browser.openResources(
      path.join(
        "src",
        "tests",
        "ui-test-config-tools",
        "fixtures",
        "max32690-wlp-msdk-configured.cfsconfig",
      ),
    );

    const editor = new CustomEditor();

    const view = await editor.getWebView();

    await view.wait();

    await view.switchToFrame();

    const navItem = await view.findWebElement(By.css("#generate"));

    await navItem.click().then(async () => {
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // assert engine list is rendered
      expect(await view.findWebElement(By.css("#msdk"))).to.exist;

      const generateBtn = await view.findWebElement(
        By.xpath('//*[@id="root"]/div/section/div[2]/vscode-button'),
      );

      await generateBtn.click().then(async () => {
        await new Promise((resolve) => setTimeout(resolve, 3000));

        await view.switchBack();

        // Assert the code files are created successfully
        const editor = new EditorView();

        const files = await editor.getOpenEditorTitles();

        const expectedFiles = [
          "max32690-wlp-msdk-configured.cfsconfig",
          "MAX32690_soc_init.c",
        ];

        expect(files).to.have.members(expectedFiles);

        await new Promise((resolve) => setTimeout(resolve, 500));
      });

      const wb = new Workbench();

      // Close MAX32690_soc_init.c
      await wb.executeCommand("Revert and close editor");
      // Close max32690-wlp-msdk-configured.cfsconfig
      await wb.executeCommand("Revert and close editor");
    });
  }).timeout(60_000);
});
