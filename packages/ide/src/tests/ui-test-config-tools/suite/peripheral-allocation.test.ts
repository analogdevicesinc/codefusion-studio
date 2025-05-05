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
  VSBrowser,
  WebView,
  Workbench,
  EditorView,
} from "vscode-extension-tester";
import * as path from "path";
import { expect } from "chai";

describe("Peripheral Allocation", () => {
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

    const wb = new Workbench();
    await wb.wait();
    await wb.executeCommand("workbench.action.closeAllEditors");
  });

  it("Should not display 'Getting Started' Help Banner if previously dismissed by the user", async () => {
    await browser.openResources(
      path.join(
        "src",
        "tests",
        "ui-test-config-tools",
        "fixtures",
        "max32690-wlp.cfsconfig",
      ),
    );

    await new Promise((resolve) => setTimeout(resolve, 5000));
    view = new WebView();
    await view.wait(60000);
    await view.switchToFrame();

    expect(
      await view.findWebElement(By.css(`[data-test="nav-item:peripherals"]`)),
    ).to.exist;
    const navItem = await view.findWebElement(
      By.css(`[data-test="nav-item:peripherals"]`),
    );

    await navItem.click().then(async () => {
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Check if the help banner is displayed
      expect(
        await view.findWebElement(
          By.css('[data-test="peripheral-help-banner:container"]'),
        ),
      ).to.exist;

      const onContinueBtn = await view.findWebElement(
        By.css('[data-test="help-banner:continue-button"]'),
      );

      // Check if the banner is not displayed after clicking on the 'Continue' button
      await onContinueBtn.click().then(async () => {
        await new Promise((resolve) => setTimeout(resolve, 3000));

        try {
          await view.findWebElement(
            By.css('[data-test="peripheral-help-banner:container"]'),
          );
        } catch (err: any) {
          expect(err.name).to.equal("NoSuchElementError");
        }
      });

      // Close the file
      await view.switchBack();
      const ev = new EditorView();
      await ev.closeAllEditors();

      // Open another file
      await browser.openResources(
        path.join(
          "src",
          "tests",
          "ui-test-config-tools",
          "fixtures",
          "max32690-tqfn.cfsconfig",
        ),
      );

      await new Promise((resolve) => setTimeout(resolve, 5000));
      view = new WebView();
      await view.wait(60000);
      await view.switchToFrame();

      expect(
        await view.findWebElement(By.css(`[data-test="nav-item:peripherals"]`)),
      ).to.exist;
      const navItem1 = await view.findWebElement(
        By.css(`[data-test="nav-item:peripherals"]`),
      );

      await navItem1.click().then(async () => {
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // Check if the help banner is not displayed
        try {
          await view.findWebElement(
            By.css('[data-test="peripheral-help-banner:container"]'),
          );
        } catch (err: any) {
          expect(err.name).to.equal("NoSuchElementError");
        }
      });

      await view.switchBack();
      // const ev = new EditorView();
      await ev.closeAllEditors();
    });
  }).timeout(60000);
});
