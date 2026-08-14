/**
 *
 * Copyright (c) 2025-2026 Analog Devices, Inc.
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

// Feature: Filters
//   As a user
//   I want filters to reset when re-entering the Memory Allocation view
//   So that I always start with an unfiltered view

//   Background:
//     Given VS Code is open
//     And all editors are closed
//     And the CFS configuration file "max32690-wlp-dual-core-blinky.cfsconfig" exists

//   Scenario: Reset memory filter on re-entry
//     Given I have opened a CFS configuration file
//     And I have applied a RAM filter in the Memory Allocation tab
//     When I leave and re-enter the Memory Allocation tab
//     Then all memory types should be visible again

import { expect } from "chai";
import { By, VSBrowser, WebView, Workbench } from "vscode-extension-tester";
import { getConfigPathForFile } from "../../config-tools-utility/cfsconfig-utils";
import {
  memoryAllocationTab,
  peripheralTab,
} from "../../page-objects/main-menu";
import {
  memoryTypeFilterButton,
  memoryTypeFilterOptionRAM,
} from "../../page-objects/memory-allocation-section/memory-allocation-screen";
import { UIUtils } from "../../../ui-test-utils/ui-utils";

describe("Memory Allocation Filters", () => {
  let workbench: Workbench;
  let browser: VSBrowser;
  let view: WebView;
  browser = VSBrowser.instance;

  let configPath: string | undefined;

  before(async function () {
    this.timeout(10000);
    browser = VSBrowser.instance;
    await new Workbench().executeCommand("workbench.action.closeAllEditors");
  });

  after(async () => {
    if (view) {
      await view.switchBack();
    }
    await new Workbench().executeCommand("workbench.action.closeAllEditors");

    if (configPath) {
      await UIUtils.restoreFixtureFileFromGit(configPath);
      configPath = undefined;
    }
  });

  it("Resets filter on re-entry", async () => {
    configPath = getConfigPathForFile(
      "max32690-wlp-dual-core-blinky.cfsconfig",
    );
    await browser.openResources(configPath);
    workbench = new Workbench();

    await UIUtils.dismissAllNotifications(workbench, browser);
    view = new WebView();
    await view.wait(5000);
    await view.switchToFrame();

    const memTabElements = await view.findWebElements(memoryAllocationTab);
    expect(
      memTabElements.length,
      "Memory Allocation tab should be visible in the navigation bar after opening config file",
    ).to.be.greaterThan(0);
    await UIUtils.clickElement(view, memoryAllocationTab);

    await UIUtils.clickElement(view, await memoryTypeFilterButton);
    await UIUtils.clickElement(view, await memoryTypeFilterOptionRAM);

    // Check if filter works correctly
    let flashAccordions = await view.findWebElements(
      By.css('[data-test^="accordion:flash"]'),
    );
    expect(
      flashAccordions.length,
      "Flash accordions should be filtered out (count should be 0) after selecting RAM filter",
    ).to.be.equal(0);

    let sysramAccordions = await view.findWebElements(
      By.css('[data-test^="accordion:sysram"]'),
    );
    expect(
      sysramAccordions.length,
      "SYSRAM accordions should be visible (count > 0) after selecting RAM filter",
    ).to.be.greaterThan(0);

    // Exit memory allocation
    const peripheralTabElements = await view.findWebElements(peripheralTab);
    expect(
      peripheralTabElements.length,
      "Peripheral tab should be visible in the navigation bar",
    ).to.be.greaterThan(0);
    await UIUtils.clickElement(view, peripheralTab);

    // Re-enter memory allocation
    const memTabElements2 = await view.findWebElements(memoryAllocationTab);
    expect(
      memTabElements2.length,
      "Memory Allocation tab should still be visible in the navigation bar",
    ).to.be.greaterThan(0);
    await UIUtils.clickElement(view, memoryAllocationTab);

    // Check if filter was reset correctly
    flashAccordions = await view.findWebElements(
      By.css('[data-test^="accordion:flash"]'),
    );
    expect(
      flashAccordions.length,
      "Flash accordions should be visible again (count > 0) after re-entering Memory tab - filter should reset",
    ).to.be.greaterThan(0);

    sysramAccordions = await view.findWebElements(
      By.css('[data-test^="accordion:sysram"]'),
    );
    expect(
      sysramAccordions.length,
      "SYSRAM accordions should still be visible (count > 0) after re-entering Memory tab",
    ).to.be.greaterThan(0);

    await view.switchBack();
    await workbench.executeCommand("view: close all editors");
  }).timeout(60000);
});
