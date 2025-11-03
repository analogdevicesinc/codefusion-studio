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
import { VSBrowser, WebView, Workbench } from "vscode-extension-tester";
import { expect } from "chai";
import { UIUtils } from "../config-tools-utility/config-utils";
import { getConfigPathForFile } from "../config-tools-utility/cfsconfig-utils";
import { allocatedFilterControl, peripheralTab } from "../page-objects/main-menu";
import { mainPanelProjectCard, mainPanelProjectItem, signalPeripheralBlock } from "../page-objects/peripheral-allocation-section/peripheral-allocation-screen";

describe("Peripheral Allocation Persistance", () => {
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

  it("Renders existing peripheral allocations from the config file", async () => {
    await browser.openResources(getConfigPathForFile("max32690-wlp-allocated-peripherals.cfsconfig"));
    await UIUtils.sleep(5000);

    view = new WebView();
    await view.wait(60000);
    await view.switchToFrame();

    expect(
      await view.findWebElement(peripheralTab),
    ).to.exist;

    const navItem = await view.findWebElement(
      peripheralTab,
    );

    await navItem.click().then(async () => {
      await UIUtils.sleep(3000);

      const filterControlAllocated = await view.findWebElement(
        allocatedFilterControl,
      );

      expect(filterControlAllocated).to.exist;

      await filterControlAllocated.click().then(async () => {
        await UIUtils.sleep(3000);
        // Check allocated peripherals in sidebar
        expect(
          await view.findWebElement(await signalPeripheralBlock("ADC")),
        ).to.exist;
        expect(
          await view.findWebElement(await signalPeripheralBlock("DMA")),
        ).to.exist;
        expect(
          await view.findWebElement(await signalPeripheralBlock("GPIO0")),
        ).to.exist;
        expect(
          await view.findWebElement(await signalPeripheralBlock("GPIO4")),
        ).to.exist;

        // Check allocated peripherals in main panel
        expect(
          await view.findWebElement(await mainPanelProjectCard("CM4"))
        ).to.exist;
        const firstCard = await view.findWebElement(await mainPanelProjectCard("CM4"));
        await firstCard.click().then(async () => {
          await UIUtils.sleep(3000);

          expect(
            await view.findWebElement(await mainPanelProjectItem("CM4", "ADC"))
          ).to.exist;

          expect(
            await view.findWebElement(await mainPanelProjectItem("CM4", "GPIO0"))
          ).to.exist;
        });

        expect(await view.findWebElement(await mainPanelProjectCard("RV"))).to
          .exist;

        await UIUtils.clickElement(
          view,
          await mainPanelProjectCard("RV"),
        );

        expect(
          await view.findWebElement(await mainPanelProjectItem("RV", "DMA"))
        ).to.exist;
        expect(
          await view.findWebElement(await mainPanelProjectItem("RV", "GPIO4"))
        ).to.exist;
      });
    });
  }).timeout(60000);
});
