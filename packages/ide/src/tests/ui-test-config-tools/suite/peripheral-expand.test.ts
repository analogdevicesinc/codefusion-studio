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
  CustomEditor,
  VSBrowser,
  WebView,
  Workbench,
} from "vscode-extension-tester";
import { expect } from "chai";
import { getConfigPathForFile } from "../config-tools-utility/cfsconfig-utils";
import { UIUtils } from "../config-tools-utility/config-utils";
import { pinTab } from "../page-objects/main-menu";
import {
  mainPanelPinOnLineAndColumn,
  pinConfigButton,
  pinDropdown,
  pinToggle,
} from "../page-objects/pin-config-section/pin-config-screen";

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
    const configPath = getConfigPathForFile("max32690-tqfn.cfsconfig");
    await browser.openResources(configPath);
    const editor = new CustomEditor();
    view = editor.getWebView();
    await view.wait();
    await view.switchToFrame();

    await (await view.findWebElement(pinTab)).click().then(async () => {
      await UIUtils.sleep(3000);
      const peripheral = await view.findWebElement(await pinDropdown("UART0"));
      await peripheral.click().then(async () => {
        // Assert peripheral expanded
        expect(await view.findWebElement(await pinConfigButton("UART0", "RX")))
          .to.exist;
      });
      // Assert pins focused
      const firstPinToBeFocused = await view.findWebElement(
        await mainPanelPinOnLineAndColumn(1, 2),
      );
      const secondPinToBeFocused = await view.findWebElement(
        await mainPanelPinOnLineAndColumn(1, 3),
      );
      expect(
        (await firstPinToBeFocused.getAttribute("class")) &&
          (await secondPinToBeFocused.getAttribute("class")),
      ).to.contain("focused");

      const firstSignalToggle = await view.findWebElement(
        await pinToggle("UART0", "RX"),
      );
      const pinToBeActivated = await view.findWebElement(
        await mainPanelPinOnLineAndColumn(1, 3),
      );
      await firstSignalToggle.click().then(async () => {
        // Assert single pin assignment renders as assigned
        expect(await pinToBeActivated.getAttribute("class")).to.contain(
          "assigned",
        );
      });
    });
  }).timeout(60_000);
});
