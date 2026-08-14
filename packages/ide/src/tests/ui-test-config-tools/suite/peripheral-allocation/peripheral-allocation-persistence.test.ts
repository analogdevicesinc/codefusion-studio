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
import { UIUtils } from "../../../ui-test-utils/ui-utils";
import { getConfigPathForFile } from "../../config-tools-utility/cfsconfig-utils";
import {
  allocatedFilterControl,
  peripheralTab,
} from "../../page-objects/main-menu";
import {
  mainPanelProjectCard,
  mainPanelProjectItem,
  signalPeripheralBlock,
} from "../../page-objects/peripheral-allocation-section/peripheral-allocation-screen";

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
    await browser.openResources(
      getConfigPathForFile("max32690-wlp-allocated-peripherals.cfsconfig"),
    );
    await UIUtils.sleep(5000);

    view = new WebView();
    await view.wait(60000);
    await view.switchToFrame();

    expect(
      await UIUtils.findWebElement(view, peripheralTab),
      "Peripheral tab not found.",
    ).to.exist;

    const navItem = await UIUtils.findWebElement(view, peripheralTab);

    await navItem.click().then(async () => {
      await UIUtils.sleep(3000);

      const filterControlAllocated = await UIUtils.findWebElement(
        view,
        allocatedFilterControl,
      );

      expect(filterControlAllocated).to.exist;

      await filterControlAllocated.click().then(async () => {
        await UIUtils.sleep(3000);
        // Check allocated peripherals in sidebar
        expect(
          await UIUtils.findWebElement(
            view,
            await signalPeripheralBlock("ADC"),
          ),
          "Allocated peripheral ADC not found in sidebar.",
        ).to.exist;
        expect(
          await UIUtils.findWebElement(
            view,
            await signalPeripheralBlock("DMA"),
          ),
          "Allocated peripheral DMA not found in sidebar",
        ).to.exist;
        expect(
          await UIUtils.findWebElement(
            view,
            await signalPeripheralBlock("GPIO0"),
          ),
          "Allocated peripheral GPIO0 not found in sidebar",
        ).to.exist;
        expect(
          await UIUtils.findWebElement(
            view,
            await signalPeripheralBlock("GPIO4"),
          ),
          "Allocated peripheral GPIO4 not found in sidebar",
        ).to.exist;

        // Check allocated peripherals in main panel
        expect(
          await UIUtils.findWebElement(view, await mainPanelProjectCard("CM4")),
          "Allocated peripheral CM4 not found in main panel",
        ).to.exist;
        const firstCard = await UIUtils.findWebElement(
          view,
          await mainPanelProjectCard("CM4"),
        );
        await firstCard.click().then(async () => {
          await UIUtils.sleep(3000);

          expect(
            await UIUtils.findWebElement(
              view,
              await mainPanelProjectItem("CM4", "ADC"),
            ),
            "Project item CM4 ADC not found in main panel.",
          ).to.exist;

          expect(
            await UIUtils.findWebElement(
              view,
              await mainPanelProjectItem("CM4", "GPIO0"),
            ),
            "Project item CM4 GPIO0 not found in main panel.",
          ).to.exist;
        });

        expect(
          await UIUtils.findWebElement(view, await mainPanelProjectCard("RV")),
          "Project card RV not found in main panel.",
        ).to.exist;

        await UIUtils.clickElement(view, await mainPanelProjectCard("RV"));

        expect(
          await UIUtils.findWebElement(
            view,
            await mainPanelProjectItem("RV", "DMA"),
          ),
          "Project item RV DMA not found in main panel.",
        ).to.exist;
        expect(
          await UIUtils.findWebElement(
            view,
            await mainPanelProjectItem("RV", "GPIO4"),
          ),
          "Project item RV GPIO4 not found in main panel.",
        ).to.exist;
      });
    });
  }).timeout(60000);
});
