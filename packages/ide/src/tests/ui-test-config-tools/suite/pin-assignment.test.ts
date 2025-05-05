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
import { By, VSBrowser, WebView } from "vscode-extension-tester";
import { expect } from "chai";
import * as path from "path";

describe("Pin Assignment", () => {
  let view: WebView;

  // after(async function () {
  //   this.timeout(60000);

  //   await view.switchBack();

  //   const wb = new Workbench();

  //   await wb.wait();

  //   await wb.executeCommand("revert and close editor");
  // });

  // @TODO: Enable back when filter controls are enabled.
  it.skip(
    "Assigns signals to pins and updates the UI according to the current pin state",
    async () => {
      await VSBrowser.instance.openResources(
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

        const assignedFilterControl = await view.findWebElement(
          By.css("#filterControl-assigned"),
        );

        const availableFilterControl = await view.findWebElement(
          By.css("#filterControl-available"),
        );

        const conflictFilterControl = await view.findWebElement(
          By.css("#filterControl-conflicts"),
        );

        expect(await pin.getAttribute("class")).to.contain("unassigned");

        expect(await assignedFilterControl.getAttribute("data-value")).to.eq(
          "30",
        );

        expect(await availableFilterControl.getAttribute("data-value")).to.eq(
          "38",
        );

        expect(await conflictFilterControl.getAttribute("disabled")).to.eq(
          "true",
        );

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

        const secondSignalToggle = await view.findWebElement(
          By.css(
            "#pin-details-signals-container > div:nth-child(2) > section > label",
          ),
        );

        // assert counters are updated
        expect(await availableFilterControl.getAttribute("data-value")).to.eq(
          "1",
        );

        expect(await assignedFilterControl.getAttribute("disabled")).to.eq(
          "true",
        );

        expect(await conflictFilterControl.getAttribute("disabled")).to.eq(
          "true",
        );

        firstSignalToggle.click().then(async function () {
          // assert single pin assignment renders as assigned
          expect(await pin.getAttribute("class")).to.contain("assigned");

          // assert counters are updated
          expect(await availableFilterControl.getAttribute("disabled")).to.eq(
            "true",
          );

          expect(await assignedFilterControl.getAttribute("data-value")).to.eq(
            "1",
          );

          expect(await conflictFilterControl.getAttribute("disabled")).to.eq(
            "true",
          );

          await new Promise((res) => {
            setTimeout(res, 500);
          });
        });

        secondSignalToggle.click().then(async function () {
          // assert double pin assignemnt renders a conflict
          expect(await pin.getAttribute("class")).to.contain("conflict");

          // assert conflict icons are rendered
          expect(await view.findWebElement(By.css("div#signal-WS-conflict"))).to
            .exist;

          expect(await view.findWebElement(By.css("div#signal-SS1-conflict")))
            .to.exist;

          // assert counters are updated
          expect(await availableFilterControl.getAttribute("disabled")).to.eq(
            "true",
          );

          expect(await assignedFilterControl.getAttribute("disabled")).to.eq(
            "true",
          );

          expect(await conflictFilterControl.getAttribute("data-value")).to.eq(
            "1",
          );

          await new Promise((res) => {
            setTimeout(res, 500);
          });
        });

        firstSignalToggle.click().then(async function () {
          // assert app is able to resolve conflict
          expect(await pin.getAttribute("class")).to.contain("assigned");

          // assert counters are updated
          expect(await availableFilterControl.getAttribute("disabled")).to.eq(
            "true",
          );

          expect(await assignedFilterControl.getAttribute("data-value")).to.eq(
            "1",
          );

          expect(await conflictFilterControl.getAttribute("disabled")).to.eq(
            "true",
          );

          await new Promise((res) => {
            setTimeout(res, 500);
          });
        });
      });
    },
  ).timeout(60000);
});
