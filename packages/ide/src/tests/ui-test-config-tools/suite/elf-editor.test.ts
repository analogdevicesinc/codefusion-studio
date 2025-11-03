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
import {
  By,
  CustomEditor,
  EditorView,
  VSBrowser,
  WebView,
  Workbench,
} from "vscode-extension-tester";
import { getConfigPathForFile } from "../config-tools-utility/cfsconfig-utils";

describe("Elf file custom editor", () => {
  let browser: VSBrowser;
  let view: WebView;

  before(async function () {
    this.timeout(60000);

    browser = VSBrowser.instance;
    await browser.waitForWorkbench();
  });

  after(async function () {
    this.timeout(60000);

    await view.switchBack();

    await new Workbench().getNotifications().then(async (notifications) => {
      await Promise.all(
        notifications.map(
          (notification) =>
            new Promise((resolve) => {
              notification.dismiss().then(() => {
                resolve("closed");
              });
            }),
        ),
      );

      await new EditorView().closeAllEditors();
    });
  });

  it("Should open the elf viewer panel when opening a file with *.elf extension", async () => {
    const configPath = getConfigPathForFile("hello_world.elf");
    await browser.openResources(configPath);

    const editor = new CustomEditor();
    view = editor.getWebView();
    await view.switchToFrame();

    const title = await view.findWebElement(
      By.xpath('//*[@id="root"]/div[1]/div[2]'),
    );

    expect(await title.getText()).to.eq("STATISTICS");
  }).timeout(60000);
});
