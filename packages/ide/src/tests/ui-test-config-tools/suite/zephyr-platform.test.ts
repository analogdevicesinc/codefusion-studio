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
import { By, VSBrowser, WebView, Workbench } from "vscode-extension-tester";
import { expect } from "chai";
import * as path from "path";

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
    await browser.openResources(
      path.join(
        "src",
        "tests",
        "ui-test-config-tools",
        "fixtures",
        "max32690-tqfn.cfsconfig",
      ),
    );

    view = new WebView();

    await view.wait();

    await view.switchToFrame();

    const navItem = await view.findWebElement(By.css(`#pinmux`));

    await navItem.click().then(async () => {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      const pin = await view.findWebElement(
        By.css(
          "#pin-rows-container > div:nth-child(1) > div:nth-child(2) > div:nth-child(1)",
        ),
      );

      expect(await pin.getAttribute("class")).to.contain("unassigned");

      await pin.click().then(async () => {
        // assert pin details sidebar is rendered
        expect(await view.findWebElement(By.css("#details-container"))).to
          .exist;

        await new Promise((res) => {
          setTimeout(res, 500);
        });
      });

      const firstSignalToggle = await view.findWebElement(
        By.css(
          "#pin-details-signals-container > div:nth-child(1) > section > label",
        ),
      );

      firstSignalToggle.click().then(async () => {
        const navItem = await view.findWebElement(By.css("#config"));

        await navItem.click().then(async () => {
          await new Promise((resolve) => setTimeout(resolve, 1000));

          expect(
            await view.findWebElement(By.css("#MODE-P0.19-control-dropdown")),
          ).to.not.exist;

          expect(
            await view.findWebElement(
              By.css("#GPIO_TYPE-P2.26-control-dropdown"),
            ),
          ).to.exist;
        });
      });
    });
  }).timeout(60000);
});
