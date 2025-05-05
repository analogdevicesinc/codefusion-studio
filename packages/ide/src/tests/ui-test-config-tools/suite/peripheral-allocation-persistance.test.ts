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
import {
  By,
  ModalDialog,
  VSBrowser,
  WebView,
  Workbench,
} from "vscode-extension-tester";
import * as path from "path";
import { expect } from "chai";

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
      path.join(
        "src",
        "tests",
        "ui-test-config-tools",
        "fixtures",
        "max32690-wlp-allocated-peripherals.cfsconfig",
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

      const filterControlAllocated = await view.findWebElement(
        By.css('[data-test="filter-control:allocated"]'),
      );

      expect(filterControlAllocated).to.exist;

      await filterControlAllocated.click().then(async () => {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        // Check allocated peripherals in sidebar
        expect(
          await view.findWebElement(
            By.css(`[data-test="peripheral-block-ADC"]`),
          ),
        ).to.exist;
        expect(
          await view.findWebElement(
            By.css(`[data-test="peripheral-block-DMA"]`),
          ),
        ).to.exist;
        expect(
          await view.findWebElement(
            By.css(`[data-test="peripheral-block-GPIO0"]`),
          ),
        ).to.exist;
        expect(
          await view.findWebElement(
            By.css(`[data-test="peripheral-block-GPIO4"]`),
          ),
        ).to.exist;

        // Check allocated peripherals in main panel
        expect(
          await view.findWebElement(
            By.css(`[data-test="core:CM4-proj:allocation:ADC"]`),
          ),
        ).to.exist;
        expect(
          await view.findWebElement(
            By.css(`[data-test="core:CM4-proj:allocation:GPIO0"]`),
          ),
        ).to.exist;
        expect(
          await view.findWebElement(
            By.css(`[data-test="core:RV-proj:allocation:DMA"]`),
          ),
        ).to.exist;
        expect(
          await view.findWebElement(
            By.css(`[data-test="core:RV-proj:allocation:GPIO4"]`),
          ),
        ).to.exist;
      });
    });
  }).timeout(60000);
});
