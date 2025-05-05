/**
 *
 * Copyright (c) 2025 Analog Devices, Inc.
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
import { By, EditorView, VSBrowser, WebView } from "vscode-extension-tester";
import { expect } from "chai";
import { join } from "path";

describe("Memory Allocation", () => {
  it("Renders existing partitions from the config file", async () => {
    const browser = VSBrowser.instance;
    await browser.openResources(
      join(
        "src",
        "tests",
        "ui-test-config-tools",
        "fixtures",
        "max32690-wlp-core-config.cfsconfig",
      ),
    );
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const view = new WebView();
    await view.wait(60000);
    await view.switchToFrame();

    expect(await view.findWebElement(By.css(`[data-test="nav-item:memory"]`)))
      .to.exist;
    const navItem = await view.findWebElement(
      By.css(`[data-test="nav-item:memory"]`),
    );

    await navItem.click().then(async () => {
      await new Promise((resolve) => setTimeout(resolve, 3000));

      expect(
        await view.findWebElement(
          By.css(`[data-test="accordion:Shared_Partition"]`),
        ),
      ).to.exist;

      await new Promise((resolve) => setTimeout(resolve, 3000));

      await view.switchBack();

      const ev = new EditorView();

      await ev.closeAllEditors();
    });
  }).timeout(60000);
});
