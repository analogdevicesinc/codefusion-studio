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
import { VSBrowser, WebView } from "vscode-extension-tester";
import { expect } from "chai";
import { getConfigPathForFile } from "../config-tools-utility/cfsconfig-utils";
import { UIUtils } from "../config-tools-utility/config-utils";
import {
  assignedFilterControl,
  availableFilterControl,
  conflictFilterControl,
  pinTab,
} from "../page-objects/main-menu";
import {
  signalConflictIcon,
  mainPanelPinOnLineAndColumn,
  pinDetailsContainer,
  signalToggleWithIndex,
} from "../page-objects/pin-config-section/pin-config-screen";

describe("Pin Assignment", () => {
  let view: WebView;

  // @TODO: Enable back when filter controls are enabled.
  it.skip(
    "Assigns signals to pins and updates the UI according to the current pin state",
    async () => {
      const configPath = getConfigPathForFile("max32690-tqfn.cfsconfig");
      await VSBrowser.instance.openResources(configPath);

      view = new WebView();
      await view.wait();
      await view.switchToFrame();

      await (await view.findWebElement(pinTab)).click().then(async () => {
        await UIUtils.sleep(3000);
        const pin = await view.findWebElement(
          await mainPanelPinOnLineAndColumn(1, 2),
        );

        const assignedFilter = await UIUtils.findWebElement(
          view,
          assignedFilterControl,
        );
        const availableFilter = await UIUtils.findWebElement(
          view,
          availableFilterControl,
        );
        const conflictFilter = await UIUtils.findWebElement(
          view,
          conflictFilterControl,
        );

        expect(await pin.getAttribute("class")).to.contain("unassigned");
        expect(await assignedFilter.getAttribute("data-value")).to.eq("30");
        expect(await availableFilter.getAttribute("data-value")).to.eq("38");
        expect(await conflictFilter.getAttribute("disabled")).to.eq("true");

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
        const secondSignalToggle = await view.findWebElement(
          await signalToggleWithIndex(2),
        );

        // Assert counters are updated
        expect(await availableFilter.getAttribute("data-value")).to.eq("1");
        expect(await assignedFilter.getAttribute("disabled")).to.eq("true");
        expect(await conflictFilter.getAttribute("disabled")).to.eq("true");

        firstSignalToggle.click().then(async () => {
          // Assert single pin assignment renders as assigned
          expect(await pin.getAttribute("class")).to.contain("assigned");

          // Assert counters are updated
          expect(await availableFilter.getAttribute("disabled")).to.eq("true");
          expect(await assignedFilter.getAttribute("data-value")).to.eq("1");
          expect(await conflictFilter.getAttribute("disabled")).to.eq("true");

          await new Promise((res) => {
            setTimeout(res, 500);
          });
        });

        secondSignalToggle.click().then(async () => {
          // Assert double pin assignemnt renders a conflict
          expect(await pin.getAttribute("class")).to.contain("conflict");
          // Assert conflict icons are rendered
          expect(await view.findWebElement(await signalConflictIcon("WS"))).to
            .exist;
          expect(await view.findWebElement(await signalConflictIcon("SS1"))).to
            .exist;
          // Assert counters are updated
          expect(await availableFilter.getAttribute("disabled")).to.eq("true");
          expect(await assignedFilter.getAttribute("disabled")).to.eq("true");
          expect(await conflictFilter.getAttribute("data-value")).to.eq("1");

          await new Promise((res) => {
            setTimeout(res, 500);
          });
        });

        firstSignalToggle.click().then(async () => {
          // Assert app is able to resolve conflict
          expect(await pin.getAttribute("class")).to.contain("assigned");
          // Assert counters are updated
          expect(await availableFilter.getAttribute("disabled")).to.eq("true");
          expect(await assignedFilter.getAttribute("data-value")).to.eq("1");
          expect(await conflictFilter.getAttribute("disabled")).to.eq("true");

          await new Promise((res) => {
            setTimeout(res, 500);
          });
        });
      });
    },
  ).timeout(60000);
});
