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
  CustomEditor,
  VSBrowser,
  WebView,
  Workbench,
} from "vscode-extension-tester";
import { expect } from "chai";
import * as path from "path";

describe("Peripheral Expansion", () => {
  let browser: VSBrowser;
  let view: WebView;

  before(function () {
    this.timeout(60000);

    browser = VSBrowser.instance;
  });

  after(async function () {
    this.timeout(60000);

    await view.switchBack();

    const wb = new Workbench();

    await wb.wait();

    await wb.executeCommand("View: revert and close editor");
  });

  it("Opens the correct peripheral group and focuses when clicking on a chevron", async () => {
    await browser.openResources(
      path.join(
        "src",
        "tests",
        "ui-test-config-tools",
        "fixtures",
        "max32690-tqfn.cfsconfig",
      ),
    );

    const editor = new CustomEditor();

    view = editor.getWebView();

    await view.wait();

    await view.switchToFrame();

    const navItem = await view.findWebElement(By.css(`#pinmux`));

    await navItem.click().then(async () => {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      const peripheral = await view.findWebElement(
        By.css("#peripheral-navigation > div:nth-child(36) > section"),
      );
      await peripheral.click().then(async () => {
        // assert peripheral expanded
        expect(
          await view.findWebElement(
            By.css(
              "#peripheral-navigation > div:nth-child(36) > section:nth-child(2)",
            ),
          ),
        ).to.exist;
      });
      // assert pins focused
      const firstPinToBeFocused = await view.findWebElement(
        By.css("#pin-row-0 > div:nth-child(2) > div:nth-child(1)"),
      );
      const secondPinToBeFocused = await view.findWebElement(
        By.css("#pin-row-0 > div:nth-child(3) > div:nth-child(1)"),
      );
      expect(
        (await firstPinToBeFocused.getAttribute("class")) &&
          (await secondPinToBeFocused.getAttribute("class")),
      ).to.contain("focused");
      const firstSignalToggle = await view.findWebElement(
        By.css(
          "#peripheral-navigation > div:nth-child(36) > section:nth-child(2) > section:nth-child(1) > label",
        ),
      );
      const pinToBeActivated = await view.findWebElement(
        By.css("#pin-row-0 > div:nth-child(3) > div:nth-child(1)"),
      );
      await firstSignalToggle.click().then(async function () {
        // assert single pin assignment renders as assigned
        expect(await pinToBeActivated.getAttribute("class")).to.contain(
          "assigned",
        );
      });
    });
  }).timeout(60_000);
});
