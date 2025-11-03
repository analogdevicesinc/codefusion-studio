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
import {
  configButton,
  mainPanelPinOnLineAndColumn,
  pinDetailsContainer,
  signalControlDropdown,
  signalToggleWithIndex,
} from "../page-objects/pin-config-section/pin-config-screen";

describe("Zephyr Firmware Platform", () => {
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

  it("Should only allow Zephyr specific controls", async () => {
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

      expect(await pin.getAttribute("class")).to.contain("unassigned");

      await pin.click().then(async () => {
        // Assert pin details sidebar is rendered
        expect(await view.findWebElement(pinDetailsContainer)).to.exist;

        await new Promise((res) => {
          setTimeout(res, 500);
        });
      });

      const firstSignalToggle = await view.findWebElement(
        await signalToggleWithIndex(1),
      );

      firstSignalToggle.click().then(async () => {
        const navItem = await view.findWebElement(configButton);

        await navItem.click().then(async () => {
          await UIUtils.sleep(1000);

          expect(
            await view.findWebElement(
              await signalControlDropdown("MODE-P0.19"),
            ),
          ).to.not.exist;

          expect(
            await view.findWebElement(
              await signalControlDropdown("GPIO_TYPE-P2.26"),
            ),
          ).to.exist;
        });
      });
    });
  }).timeout(60000);
});
