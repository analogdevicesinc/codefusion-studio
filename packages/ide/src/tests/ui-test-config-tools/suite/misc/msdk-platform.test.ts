/**
 *
 * Copyright (c) 2024-2026 Analog Devices, Inc.
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
import { VSBrowser, WebView } from "vscode-extension-tester";
import { expect } from "chai";
import { UIUtils } from "../../../ui-test-utils/ui-utils";
import { getConfigPathForFile } from "../../config-tools-utility/cfsconfig-utils";
import { pinTab } from "../../page-objects/main-menu";
import {
  configButton,
  mainPanelPinOnLineAndColumn,
  pinDetailsContainer,
  pinDetailsSignalsContainer,
  signalControlDropdown,
  signalToggleWithIndex,
} from "../../page-objects/pin-config-section/pin-config-screen";

describe("MSDK Firmware Platform", () => {
  let browser: VSBrowser;
  let view: WebView;
  const configPath = getConfigPathForFile("max32690-wlp.cfsconfig");

  before(async function () {
    this.timeout(60000);
    ({ browser } = await UIUtils.setupTestSuite({ waitForWorkbench: true }));
  });

  after(async function () {
    this.timeout(60000);
    await UIUtils.teardownTestSuite(view, configPath);
  });

  it("Should only allow MSDK specific controls @regression", async () => {
    await browser.openResources(configPath);

    view = new WebView();
    await view.wait();
    await view.switchToFrame();

    const navItem = await UIUtils.findWebElement(view, pinTab);
    await navItem.click().then(async () => {
      await UIUtils.sleep(3000);
      const pin = await UIUtils.findWebElement(
        view,
        await mainPanelPinOnLineAndColumn(1, 3),
      );

      expect(await pin.getAttribute("class")).to.contain("unassigned");

      await pin.click().then(async () => {
        // Assert pin details sidebar is rendered
        expect(await UIUtils.findWebElement(view, pinDetailsContainer)).to
          .exist;
      });

      // Wait for signals container to be populated
      await UIUtils.waitForElement(view, pinDetailsSignalsContainer, 5000);
      await UIUtils.sleep(500);

      const firstSignalToggle = await UIUtils.waitForElement(
        view,
        await signalToggleWithIndex(1),
        5000,
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
