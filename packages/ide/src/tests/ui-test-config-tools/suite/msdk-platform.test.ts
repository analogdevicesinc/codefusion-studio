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
import { UIUtils } from "../config-tools-utility/config-utils";
import { getConfigPathForFile } from "../config-tools-utility/cfsconfig-utils";
import { pinTab } from "../page-objects/main-menu";
import {
  configButton,
  mainPanelPinOnLineAndColumn,
  pinDetailsContainer,
  signalControlDropdown,
  signalToggleWithIndex,
} from "../page-objects/pin-config-section/pin-config-screen";

describe("MSDK Firmware Platform", () => {
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
    await wb.executeCommand("revert and close editor");
  });

  it("Should only allow MSDK specific controls", async () => {
    await browser.openResources(getConfigPathForFile("max32690-wlp.cfsconfig"));

    view = new WebView();
    await view.wait();
    await view.switchToFrame();

    const navItem = await view.findWebElement(pinTab);
    await navItem.click().then(async () => {
      await UIUtils.sleep(3000);
      const pin = await UIUtils.findWebElement(
        view,
        await mainPanelPinOnLineAndColumn(1, 3),
      );

      expect(await pin.getAttribute("class")).to.contain("unassigned");

      await pin.click().then(async () => {
        // Assert pin details sidebar is rendered
        expect(await view.findWebElement(pinDetailsContainer)).to.exist;

        await new Promise((res) => {
          setTimeout(res, 500);
        });
      });

      const firstSignalToggle = await UIUtils.findWebElement(
        view,
        await signalToggleWithIndex(1),
      );
      firstSignalToggle.click().then(async () => {
        const navItem = await UIUtils.findWebElement(view, configButton);

        await navItem.click().then(async () => {
          await UIUtils.sleep(1000);

          expect(
            await UIUtils.findWebElement(
              view,
              await signalControlDropdown("GPIO_TYPE-P2.26"),
            ),
          ).to.not.exist;

          expect(
            await UIUtils.findWebElement(
              view,
              await signalControlDropdown("MODE-P0.19"),
            ),
          ).to.exist;
        });
      });
    });
  }).timeout(60000);
});
