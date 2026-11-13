/**
 *
 * Copyright (c) 2024, 2026 Analog Devices, Inc.
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
import { By, CustomEditor, VSBrowser, WebView } from "vscode-extension-tester";
import { getConfigPathForFile } from "../../config-tools-utility/cfsconfig-utils";
import { UIUtils } from "../../../ui-test-utils/ui-utils";

describe("Elf file custom editor", () => {
  let browser: VSBrowser;
  let view: WebView;

  before(async function () {
    this.timeout(60000);
    ({ browser } = await UIUtils.setupTestSuite({ waitForWorkbench: true }));
  });

  after(async function () {
    this.timeout(60000);
    await UIUtils.teardownTestSuite(view);
    // await view.switchBack();
    // workbench = new Workbench();
    // await UIUtils.dismissAllNotifications(workbench, browser);
    // await workbench.wait();
    // await workbench.executeCommand("View: revert and close editor");
  });

  it("Should open the elf viewer panel when opening a file with *.elf extension @regression", async () => {
    const configPath = getConfigPathForFile("hello_world.elf");
    await browser.openResources(configPath);

    const editor = new CustomEditor();
    view = editor.getWebView();
    await view.switchToFrame();

    const title = await UIUtils.findWebElement(
      view,
      By.xpath('//*[@id="root"]/div[1]/div[2]'),
    );

    expect(await title.getText()).to.eq("STATISTICS");
  }).timeout(60000);
});
