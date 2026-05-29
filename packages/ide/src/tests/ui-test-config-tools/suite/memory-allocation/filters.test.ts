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
import {
  By,
  VSBrowser,
  WebView,
  Workbench,
  EditorView,
} from "vscode-extension-tester";
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
  let editor: EditorView;
  browser = VSBrowser.instance;

  let configPath: string | undefined;

  before(async function () {
    this.timeout(10000);
    browser = VSBrowser.instance;
    editor = new EditorView();
    await editor.closeAllEditors();
    await UIUtils.sleep(3000);
  });

  after(async () => {
    // Teardown - reset cfsconfig file
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
    console.log("Opened the cfsconfig file");

    await UIUtils.dismissAllNotifications(workbench, browser);
    await UIUtils.sleep(5000);
    console.log("Waiting for the element to be located in the DOM");
    view = new WebView();
    console.log("max32690-wlp-dual-core-blinky UI loaded");
    await view.switchToFrame();

    expect(
      await view.findWebElement(memoryAllocationTab),
      "Could not find Memory link in Nav Bar",
    ).to.exist;
    await UIUtils.clickElement(view, memoryAllocationTab);

    await UIUtils.clickElement(view, await memoryTypeFilterButton);
    await UIUtils.clickElement(view, await memoryTypeFilterOptionRAM);
    console.log("Selected memory type filter - RAM");

    // Check if filter works correctly
    let flashAccordions = await view.findWebElements(
      By.css('[data-test^="accordion:flash"]'),
    );
    expect(
      flashAccordions.length,
      "accordion:flash weren't filtered out",
    ).to.be.equal(0);

    let sysramAccordions = await view.findWebElements(
      By.css('[data-test^="accordion:sysram"]'),
    );
    expect(
      sysramAccordions.length,
      "No accordion:sysram elements found",
    ).to.be.greaterThan(0);

    // Exit memory alloaction
    expect(
      await view.findWebElement(peripheralTab),
      "Could not find Peripheral link in Nav Bar",
    ).to.exist;
    await UIUtils.clickElement(view, peripheralTab);
    console.log("Exited memory alloaction");

    // Re-enter memory alloaction
    expect(
      await view.findWebElement(memoryAllocationTab),
      "Could not find Memory link in Nav Bar",
    ).to.exist;
    await UIUtils.clickElement(view, memoryAllocationTab);
    console.log("Re-entered memory alloaction");

    // Check if filter was reset correctly
    flashAccordions = await view.findWebElements(
      By.css('[data-test^="accordion:flash"]'),
    );
    expect(
      flashAccordions.length,
      "No accordion:flash elements found",
    ).to.be.greaterThan(0);

    sysramAccordions = await view.findWebElements(
      By.css('[data-test^="accordion:sysram"]'),
    );
    expect(
      sysramAccordions.length,
      "No accordion:sysram elements found",
    ).to.be.greaterThan(0);

    await view.switchBack();
    await workbench.executeCommand("view: close all editors");
  }).timeout(60000);
});
