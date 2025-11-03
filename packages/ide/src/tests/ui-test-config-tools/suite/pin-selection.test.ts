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
import { VSBrowser, WebView, Workbench } from "vscode-extension-tester";
import { expect } from "chai";
import { getConfigPathForFile } from "../config-tools-utility/cfsconfig-utils";
import { UIUtils } from "../config-tools-utility/config-utils";
import { pinTab } from "../page-objects/main-menu";
import { focusedPinBackdrop, mainPanelPinOnLineAndColumn, pinDetailsContainer, pinTooltipTitle } from "../page-objects/pin-config-section/pin-config-screen";

describe("Pin Selection", () => {
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

  it("Displays the pin details sidebar when a pin is clicked", async () => {
    const configPath = getConfigPathForFile("max32690-tqfn.cfsconfig");
    await browser.openResources(configPath);

    view = new WebView();
    await view.wait();
    await view.switchToFrame();

    await UIUtils.clickElement(view, pinTab).then(async () => {
      await UIUtils.sleep(3000);

      const pin = await view.findWebElement(
        await mainPanelPinOnLineAndColumn(1, 2),
      );

      expect(await pin.getText()).to.contain("P2.26");

      await pin.click().then(async () => {
        expect(await view.findWebElement(pinDetailsContainer)).to
          .exist;

        const title = await view.findWebElement(
         pinTooltipTitle,
        );

        expect(await title.getText()).to.contain("P2.26");

        // Assert backdrop exists
        expect(await view.findWebElement(focusedPinBackdrop)).to
          .exist;
      });
    });
  }).timeout(60000);
});
