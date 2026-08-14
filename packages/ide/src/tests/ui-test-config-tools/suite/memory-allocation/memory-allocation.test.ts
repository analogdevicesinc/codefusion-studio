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

// CFSIO-6339 Automation - Memory Allocation-> Deleting the existing Partition and Verifying the schema
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
//     And I expand the partition details for partition index 1
//     And I delete the second RV Core partition
//     And I collapse the partition details for partition index 1
//     And I expand the CM4 Core partition dropdown
//     And I delete the first CM4 Core partition
//     And I save the configuration file
//     Then the CM4 partitions should match:
//       | Name              | StartAddress | Size    | Access | CHOSEN        |
//       | m4_flash          | 0x10000000   | 3145728 | R      | flash         |
//       | sram1             | 0x20020000   | 131072  | R/W    |               |
//       | sram2             | 0x20040000   | 131072  | R/W    |               |
//       | sram3             | 0x20060000   | 131072  | R/W    |               |
//       | sram4             | 0x20080000   | 131072  | R/W    |               |
//       | sram5             | 0x200A0000   | 131072  | R/W    |               |
//       | sram6             | 0x200C0000   | 65536   | R/W    |               |
//       | sram7             | 0x200D0000   | 196608  | R/W    |               |
//     And the RV partitions should match:
//       | Name       | StartAddress | Size    | Access | NAME_OVERRIDE |
//       | RISCV_SRAM | 0x20100000   | 131072  | R      | SRAM          |

import { expect } from "chai";
import {
  By,
  ModalDialog,
  VSBrowser,
  WebView,
  Workbench,
} from "vscode-extension-tester";
import {
  getConfigPathForFile,
  parseJSONFile,
} from "../../config-tools-utility/cfsconfig-utils";
import { memoryAllocationTab } from "../../page-objects/main-menu";
import {
  cm4PartitionCardTitles,
  getDeletePartitionButton,
  partitionDetailsChevron,
  partitionDetailsDropdowns,
} from "../../page-objects/memory-allocation-section/memory-allocation-screen";
import { UIUtils } from "../../../ui-test-utils/ui-utils";

describe("Memory Allocation", () => {
  let workbench: Workbench;
  let browser: VSBrowser;
  let view: WebView;

  // let editor: EditorView;
  browser = VSBrowser.instance;

  let configPath: string | undefined;

  before(async function () {
    this.timeout(10000);
    browser = VSBrowser.instance;
    workbench = new Workbench();

    await new Workbench().executeCommand("workbench.action.closeAllEditors");
  });

  afterEach(async () => {
    if (view) {
      await view.switchBack();
    }
    await new Workbench().executeCommand("workbench.action.closeAllEditors");

    if (configPath) {
      await UIUtils.restoreFixtureFileFromGit(configPath);
      configPath = undefined;
    }
  });

  it("Renders existing partitions from the config file", async () => {
    configPath = getConfigPathForFile("max32690-wlp-core-config.cfsconfig");
    await browser.openResources(configPath);
    console.log("Opened config file: " + configPath);

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

    const partitionCardsElements = await view.findWebElements(
      partitionDetailsDropdowns,
    );
    expect(
      partitionCardsElements.length,
      "Partition details cards should be displayed in the memory allocation view after clicking Memory tab",
    ).to.be.greaterThan(0);

    const dropdowns = await view.findWebElements(partitionDetailsDropdowns);
    await dropdowns[dropdowns.length - 1].click();

    const partitionTitleElements = await view.findWebElements(
      cm4PartitionCardTitles,
    );
    expect(
      partitionTitleElements.length,
      "Partition card title should appear after expanding the partition dropdown",
    ).to.be.greaterThan(0);

    const cardItem = await UIUtils.findWebElement(view, cm4PartitionCardTitles);
    const title = await cardItem.findElement(By.css(`h3`));
    const titleText = await title.getText();
    expect(
      titleText,
      "Expected partition name 'Shared_Partition' but found '" +
        titleText +
        "'. Verify partition was loaded correctly from config file.",
    ).to.contain("Shared_Partition");
  }).timeout(60000);

  it("Deletes the existing partition and verifies the schema", async () => {
    configPath = getConfigPathForFile(
      "max32690-wlp-dual-core-blinky.cfsconfig",
    );
    await browser.openResources(configPath);
    workbench = new Workbench();

    await UIUtils.dismissAllNotifications(workbench, browser);
    view = new WebView();
    await view.wait(5000);
    await view.switchToFrame();

    await UIUtils.clickElement(view, memoryAllocationTab);
    await UIUtils.clickElement(view, await partitionDetailsChevron(1));
    await UIUtils.waitForElement(view, await getDeletePartitionButton(2));
    await UIUtils.clickElement(view, await getDeletePartitionButton(2));
    await UIUtils.clickElement(view, await partitionDetailsChevron(1));

    await UIUtils.clickElement(view, await partitionDetailsChevron(2));
    await UIUtils.clickElement(view, await getDeletePartitionButton(1));

    await view.switchBack();
    await workbench.executeCommand("view: close all editors");
    const dialog = new ModalDialog();
    await dialog.pushButton("Save");
    console.log("Saved the configuration file");
    await UIUtils.sleep(300);

    const peripheralData = parseJSONFile(configPath);
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
