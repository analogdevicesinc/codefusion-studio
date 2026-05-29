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

// Feature: Partition editing
//   As a user
//   I want to edit partitions in the CFS configuration
//   So that the partition properties are updated correctly

//   Background:
//     Given VS Code is open
//     And all editors are closed
//     And the CFS configuration file "max32690-wlp-dual-core-blinky.cfsconfig" exists

//   Scenario: Edit a CM4 partition and validate configuration
//     When I open the configuration file "max32690-wlp-dual-core-blinky.cfsconfig"
//     And I dismiss all notifications
//     And I switch to the webview frame
//     And I click on the Memory menu
//     And I expand the partition details for partition index 2
//     And I delete the first RV Core partition
//     And I collapse the partition details for partition index 2
//     And I expand the CM4 Core partition dropdown
//     And I click the second edit button
//     And I select "Flash" from the memory type dropdown
//     And I set the partition name to "testEditPartition"
//     And I select "CM4" in assigned cores dropdown
//     And I enter "editPartition" in the chosen control input
//     And I enter "editPartition2" in the label control input
//     And I set the start address to "10300000"
//     And I set the size to "32"
//     And I click the "Create Configured Partition" button
//     And I save the configuration file
//     Then the CM4 partitions should match:
//       | Name              | StartAddress | Size    | Access | CHOSEN        | LABEL           |
//       | m4_flash          | 0x10000000   | 3145728 | R      | flash         |                 |
//       | testEditPartition | 0x10300000   | 32768   | R      | editPartition | editPartition2  |
//       | sram1             | 0x20020000   | 131072  | R/W    |               |                 |
//       | sram2             | 0x20040000   | 131072  | R/W    |               |                 |
//       | sram3             | 0x20060000   | 131072  | R/W    |               |                 |
//       | sram4             | 0x20080000   | 131072  | R/W    |               |                 |
//       | sram5             | 0x200A0000   | 131072  | R/W    |               |                 |
//       | sram6             | 0x200C0000   | 65536   | R/W    |               |                 |
//       | sram7             | 0x200D0000   | 196608  | R/W    |               |                 |
//     And the RV partitions should match:
//       | Name       | StartAddress | Size    | Access | NAME_OVERRIDE |
//       | RISCV_SRAM | 0x20100000   | 131072  | R      | SRAM          |

import { expect } from "chai";
import {
  VSBrowser,
  WebDriver,
  WebView,
  Workbench,
} from "vscode-extension-tester";
import { Locatorspaths } from "../../pageObjectsConfig/memory-page-objects";
import { UIUtils } from "../../../ui-test-utils/ui-utils";
import { getConfigPathForFile } from "../../config-tools-utility/cfsconfig-utils";
import * as fs from "node:fs";
import {
  memoryTypeDropdown,
  memoryTypeSelector,
} from "../../page-objects/memory-allocation-section/create-partition-sidebar";

describe("CFSIO-6338 Partition editing", () => {
  const locatorspath = new Locatorspaths();
  const configPath = getConfigPathForFile(
    "max32690-wlp-dual-core-blinky.cfsconfig",
  );

  let workbench: Workbench;
  let browser: VSBrowser;
  let view: WebView;
  let driver: WebDriver;

  browser = VSBrowser.instance;
  before(async function () {
    this.timeout(10000);
    browser = VSBrowser.instance;
    driver = browser.driver;

    workbench = new Workbench();
    await workbench.waitForStable(10000);
  });

  afterEach(async () => {
    // Teardown - reset cfsconfig file
    await UIUtils.restoreFixtureFileFromGit(configPath);

    await view.switchBack();
    await workbench.executeCommand("view: close all editors");
  });

  it("Partition editing", async () => {
    await browser.openResources(configPath);
    console.log("Opened the cfsconfig file");

    await UIUtils.dismissAllNotifications(workbench, browser);
    await UIUtils.sleep(5000);
    console.log("Waiting for the element to be located in the DOM");
    view = new WebView();
    console.log("max32690-wlp-dual-core-blinky UI loaded");
    await view.switchToFrame();

    await UIUtils.clickElement(view, locatorspath.memoryMenu);
    await UIUtils.clickElement(view, locatorspath.partitionDetailsChevron(2));
    await UIUtils.clickElement(view, locatorspath.getDeletePartitionButton(1));
    await UIUtils.clickElement(view, locatorspath.partitionDetailsChevron(1));
    await UIUtils.clickElement(view, locatorspath.getEditPartitionButton(2));
    await UIUtils.selectOptionFromDropdown(
      view,
      memoryTypeDropdown,
      await memoryTypeSelector("Flash"),
    );
    await UIUtils.clickElement(view, locatorspath.partitionNameTextBox);
    const locators = new Locatorspaths();
    await locators.setPartitionName(driver, "testEditPartition");

    await UIUtils.selectOptionFromDropdown(
      view,
      locatorspath.assignedCoresDropdown,
      locatorspath.assignedCoresSelector("multiselect-option-CM4"),
    );

    await UIUtils.sendKeysToElements(
      view,
      locatorspath.chosenControlInput,
      "editpartition",
    );
    await UIUtils.sendKeysToElements(
      view,
      locatorspath.labelControlInput,
      "editpartition2",
    );

    await UIUtils.clickElement(view, locatorspath.startAddress);
    await UIUtils.sendKeysToElements(
      view,
      locatorspath.startAddress,
      "10300000",
    );

    await UIUtils.clickElement(view, locatorspath.sizeStepper);
    await UIUtils.sendKeysToElements(view, locatorspath.sizeStepper, "32");
    await UIUtils.clickElement(view, locatorspath.createConfiguredPartition);

    try {
      // save document
      await view.switchBack();
      await workbench.executeCommand("File: Save without formatting");
      await UIUtils.sleep(1000);
      console.log("Saved the file");
    } catch {
      console.error("Error saving the file");
    }

    // Assert the file content.
    const fileContent = await fs.promises.readFile(configPath, "utf-8");
    const peripheralData = JSON.parse(fileContent);

    const cm4Project = peripheralData.Projects.find(
      (proj: any) => proj.CoreId === "CM4",
    );

    const cm4Partitions = cm4Project.Partitions;
    console.log(cm4Partitions);

    const expectedCM4Partitions = [
      {
        Name: "m4_flash",
        StartAddress: "0x10000000",
        Size: 3145728,
        IsOwner: true,
        Access: "R",
        Config: {
          CHOSEN: "flash",
        },
      },
      {
        Name: "testEditPartition",
        StartAddress: "0x10300000",
        Size: 32768,
        DisplayUnit: "KB",
        IsOwner: true,
        Access: "R/W/X",
        Config: {
          CHOSEN: "editpartition",
          LABEL: "editpartition2",
        },
      },
      {
        Name: "sram1",
        StartAddress: "0x20020000",
        Size: 131072,
        IsOwner: true,
        Access: "R/W",
        Config: {},
      },
      {
        Name: "sram2",
        StartAddress: "0x20040000",
        Size: 131072,
        IsOwner: true,
        Access: "R/W",
        Config: {},
      },
      {
        Name: "sram3",
        StartAddress: "0x20060000",
        Size: 131072,
        IsOwner: true,
        Access: "R/W",
        Config: {},
      },
      {
        Name: "sram4",
        StartAddress: "0x20080000",
        Size: 131072,
        IsOwner: true,
        Access: "R/W",
        Config: {},
      },
      {
        Name: "sram5",
        StartAddress: "0x200A0000",
        Size: 131072,
        IsOwner: true,
        Access: "R/W",
        Config: {},
      },
      {
        Name: "sram6",
        StartAddress: "0x200C0000",
        Size: 65536,
        IsOwner: true,
        Access: "R/W",
        Config: {},
      },
      {
        Name: "sram7",
        StartAddress: "0x200D0000",
        Size: 196608,
        IsOwner: true,
        Access: "R/W",
        Config: {},
      },
    ];

    expect(cm4Partitions).to.deep.equal(
      expectedCM4Partitions,
      "CM4 Partition is empty or not matching your config",
    );

    const rvProject = peripheralData.Projects.find(
      (proj: any) => proj.CoreId === "RV",
    );

    const rVPartitions = rvProject.Partitions;
    console.log(rVPartitions);

    const expectedRVPartitions = [
      {
        Name: "RISCV_SRAM",
        StartAddress: "0x20100000",
        Size: 131072,
        IsOwner: true,
        Access: "R",
        Config: {
          NAME_OVERRIDE: "SRAM",
        },
      },
    ];

    expect(rVPartitions).to.deep.equal(
      expectedRVPartitions,
      "RV Partition is empty or not matching your config",
    );
    console.log("RV Partition config OK");
  }).timeout(150000);
});
