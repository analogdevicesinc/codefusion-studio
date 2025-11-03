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
import { exec } from "child_process";
import {
  By,
  EditorView,
  ModalDialog,
  VSBrowser,
  WebView,
  Workbench,
} from "vscode-extension-tester";
import {
  getConfigPathForFile,
  parseJSONFile,
} from "../../config-tools-utility/cfsconfig-utils";
import { UIUtils } from "../../config-tools-utility/config-utils";
import { memoryAllocationTab } from "../../page-objects/main-menu";
import {
  cm4PartitionCardTitles,
  getDeletePartitionButton,
  partitionDetailsChevron,
  partitionDetailsDropdowns,
} from "../../page-objects/memory-allocation-section/memory-allocation-screen";

describe("Memory Allocation", () => {
  let workbench: Workbench;
  let browser: VSBrowser;
  let view: WebView;

  let editor: EditorView;
  browser = VSBrowser.instance;

  before(async function () {
    this.timeout(10000);
    browser = VSBrowser.instance;
  });

  it("Renders existing partitions from the config file", async () => {
    await browser.openResources(
      getConfigPathForFile("max32690-wlp-core-config.cfsconfig"),
    );
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

    expect(
      await UIUtils.findWebElement(view, partitionDetailsDropdowns, 2),
      "Could not find partition details cards",
    ).to.exist;

    const dropdowns = await view.findWebElements(partitionDetailsDropdowns);
    await dropdowns[dropdowns.length - 1].click();
    console.log("Expanded the last partition card");
    await UIUtils.sleep(3000);
    expect(
      await UIUtils.findWebElement(view, cm4PartitionCardTitles),
      "Could not find Partition Card Title",
    ).to.exist;

    const cardItem = await UIUtils.findWebElement(view, cm4PartitionCardTitles);
    const title = await cardItem.findElement(By.css(`h3`));
    expect(
      await title.getText(),
      "Partition found does not match expected shared partition",
    ).to.contain("Shared_Partition");

    await UIUtils.sleep(3000);
    await view.switchBack();
    const ev = new EditorView();
    await ev.closeAllEditors();
  }).timeout(60000);

  it("Deletes the existing partition and verifies the schema", async () => {
    editor = new EditorView();
    await editor.closeAllEditors();
    await UIUtils.sleep(3000);

    const configPath = getConfigPathForFile(
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

    await UIUtils.clickElement(view, memoryAllocationTab);
    await UIUtils.clickElement(view, await partitionDetailsChevron(1));
    await UIUtils.waitForElement(view, await getDeletePartitionButton(2));
    await UIUtils.clickElement(view, await getDeletePartitionButton(2));
    await UIUtils.clickElement(view, await partitionDetailsChevron(1));

    await UIUtils.clickElement(view, await partitionDetailsChevron(2));
    await UIUtils.clickElement(view, await getDeletePartitionButton(1));

    console.log("Save the configuration file changes");
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

    // Teardown - reset cfsconfig files
    exec(`git checkout ${configPath}`);
  }).timeout(150000);
});
