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

// CFSIO-6874 Automation - Memory Allocation -> Loading from file
// Feature: Loading memory allocation from a .cfsconfig file
//   As a user
//   I want to load partitions from the CFS configuration
//   So that the UI matches the configuration on JSON
//
//   Background:
//     Given VS Code is open
//     And all editors are closed
//     And the CFS configuration file "max32690-wlp-dual-core-blinky.cfsconfig" exists
//
//   Scenario: Load config and validate CM4 & RV partitions and the Edit panel
//     When I open the configuration file "max32690-wlp-dual-core-blinky.cfsconfig"
//     And I dismiss all notifications
//     And I switch to the webview frame
//     And I click on the Memory menu
//
//     # Validate headers against JSON for Flash0 (CM4)
//     And I expand the "flash0" partition dropdown
//     Then the partition header should match JSON:
//       | Group  | PartitionId | Core | Index |
//       | flash0 | M4_FLASH    | CM4  | 0     |
//
//     # Validate headers against JSON for Flash1 (RV)
//     When I expand the "flash1" partition dropdown
//     Then the partition header should match JSON:
//       | Group  | PartitionId | Core | Index |
//       | flash1 | RISCV_FLASH | RV   | 0     |
//
//     # Open Edit for second visible partition and validate sidebar fields
//     When I expand the partition details for partition index 1
//     And I click the Edit partition button for partition index 1
//     Then the Edit panel fields should match JSON for core "CM4" at index 0:
//       | Field         | UI Source              | JSON Source                      |
//       | memoryType    | dropdown current-value | Config.CHOSEN                    |
//       | partitionName | textbox value          | Name                             |
//       | permCM4       | permission text (CM4)  | Access                           |
//       | isOwnerFlag   | owner checkbox boolean | IsOwner                          |
//       | isOwnerText   | owner checkbox text    | String(Boolean(IsOwner))         |
//       | startAddress  | startAddress value     | StartAddress (parsed)            |
//       | sizeBytes     | sizeStepper value      | Size (Number)                    |
//
//     # Teardown
//     And I restore the configuration file from git

import { expect } from "chai";
import {
  EditorView,
  VSBrowser,
  WebView,
  Workbench,
} from "vscode-extension-tester";
import { UIUtils } from "../../../ui-test-utils/ui-utils";
import {
  getConfigPathForFile,
  parseJSONFile,
  computeEndAddress,
} from "../../config-tools-utility/cfsconfig-utils";
import { memoryAllocationTab } from "../../page-objects/main-menu";
import {
  leftPartitionDropdown,
  getPartitionName,
  getStartAddressForMemoryType,
  getEndAddressForMemoryType,
  partitionDetailsChevron,
  getEditPartitionButton,
} from "../../page-objects/memory-allocation-section/memory-allocation-screen";
import {
  getCorePermissionValueText,
  getOwnerCheckedText,
  isOwnerCheckedBoolean,
  memoryTypeDropdown,
  partitionNameTextBox,
  sizeStepper,
  startAddress,
} from "../../page-objects/memory-allocation-section/create-partition-sidebar";

import {
  parseAddr,
  parseSizeBytes,
} from "../../config-tools-utility/cfs-utils-processing";

describe("CFSIO-6874 Loading from file", () => {
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
    await UIUtils.restoreFixtureFileFromGit(
      getConfigPathForFile("max32690-wlp-dual-core-blinky.cfsconfig"),
    );
  });

  it("Loading from file", async () => {
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

    const norm = (s: string) => s.trim().toLowerCase();
    const normHex = (s: string) => s.trim().toLowerCase();

    await UIUtils.clickElement(view, memoryAllocationTab);

    await UIUtils.clickElement(view, await leftPartitionDropdown("flash0"));

    const partitionNameM4Selector = await getPartitionName(
      "M4_FLASH",
      "m4_flash",
    );
    const partitionNameM4Element = await UIUtils.findWebElement(
      view,
      partitionNameM4Selector,
    );
    const partitionNameM4 = await partitionNameM4Element.getText();

    const startAddrM4Selector = await getStartAddressForMemoryType("flash0");
    const startAddrM4Element = await UIUtils.findWebElement(
      view,
      startAddrM4Selector,
    );
    const startAddrM4 = await startAddrM4Element.getText();

    const endAddrM4Selector = await getEndAddressForMemoryType("flash0");
    const endAddrM4Element = await UIUtils.findWebElement(
      view,
      endAddrM4Selector,
    );
    const endAddrM4 = await endAddrM4Element.getText();
    console.log(
      `Partition Name: ${partitionNameM4} | Start Address: ${startAddrM4} | End Address: ${endAddrM4}`,
    );

    await UIUtils.clickElement(view, await leftPartitionDropdown("flash1"));

    const partitionNameRVSelector = await getPartitionName(
      "RISCV_FLASH",
      "RISCV_FLASH",
    );
    const partitionNameRVElement = await UIUtils.findWebElement(
      view,
      partitionNameRVSelector,
    );
    const partitionNameRV = await partitionNameRVElement.getText();

    const startAddrRVSelector = await getStartAddressForMemoryType("flash1");
    const startAddrRVElement = await UIUtils.findWebElement(
      view,
      startAddrRVSelector,
    );
    const startAddrRV = await startAddrRVElement.getText();

    const endAddrRVSelector = await getEndAddressForMemoryType("flash1");
    const endAddrRVElement = await UIUtils.findWebElement(
      view,
      endAddrRVSelector,
    );
    const endAddrRV = await endAddrRVElement.getText();

    console.log(
      `Partition Name: ${partitionNameRV} | Start Address: ${startAddrRV} | End Address: ${endAddrRV}`,
    );

    const peripheralData = parseJSONFile(configPath);
    const cm4Project = peripheralData.Projects.find(
      (proj: any) => proj.CoreId === "CM4",
    );
    const cm4Partitions = cm4Project.Partitions;
    const firstPartition = {
      Name: cm4Partitions[0].Name,
      StartAddress: cm4Partitions[0].StartAddress,
      Size: cm4Partitions[0].Size,
      EndAddress: computeEndAddress(
        cm4Partitions[0].StartAddress,
        cm4Partitions[0].Size,
      ),
      IsOwner: cm4Partitions[0].IsOwner,
      Access: cm4Partitions[0].Access,
      Chosen: cm4Partitions[0].Config?.CHOSEN,
    };

    expect(
      norm(partitionNameM4) === norm(firstPartition.Name) &&
        normHex(startAddrM4) === normHex(firstPartition.StartAddress) &&
        normHex(endAddrM4) === normHex(firstPartition.EndAddress),
      "Partition mismatch",
    ).to.be.true;

    const peripheralDataRV = parseJSONFile(configPath);
    const RVproject = peripheralDataRV.Projects.find(
      (proj: any) => proj.CoreId === "RV",
    );
    const RVpartitions = RVproject.Partitions;

    const firstPartitionRV = {
      Name: RVpartitions[0].Name,
      StartAddress: RVpartitions[0].StartAddress,
      Size: RVpartitions[0].Size,
      EndAddress: computeEndAddress(
        RVpartitions[0].StartAddress,
        RVpartitions[0].Size,
      ),
    };

    expect(
      norm(partitionNameRV) === norm(firstPartitionRV.Name) &&
        normHex(startAddrRV) === normHex(firstPartitionRV.StartAddress) &&
        normHex(endAddrRV) === normHex(firstPartitionRV.EndAddress),
      "Partition mismatch",
    ).to.be.true;

    await UIUtils.clickElement(view, await leftPartitionDropdown("flash0"));
    await UIUtils.clickElement(view, await leftPartitionDropdown("flash1"));
    await UIUtils.clickElement(view, await partitionDetailsChevron(1));
    await UIUtils.clickElement(view, await getEditPartitionButton(1));

    const memoryType = await (
      await UIUtils.findWebElement(view, memoryTypeDropdown)
    ).getAttribute("current-value");
    const partitionNameText = await (
      await UIUtils.findWebElement(view, partitionNameTextBox)
    ).getAttribute("value");
    const permCM4Text = await getCorePermissionValueText(view, "CM4");
    const isChecked = await isOwnerCheckedBoolean(view);
    const isCheckedText = await getOwnerCheckedText(view);

    const startAddrText = await (
      await UIUtils.findWebElement(view, startAddress)
    ).getAttribute("value");
    const startJson = parseAddr(firstPartition.StartAddress);

    const sizeText = await (
      await UIUtils.findWebElement(view, sizeStepper)
    ).getAttribute("value");
    const startUi = parseAddr(startAddrText);
    const sizeUiBytes = parseSizeBytes(sizeText);

    const actual = {
      memoryType: norm(memoryType),
      partitionName: norm(partitionNameText),
      permCM4: (permCM4Text ?? "").trim(),
      isOwnerFlag: Boolean(isChecked),
      isOwnerText: isCheckedText,
      startAddress: startUi,
      sizeBytes: sizeUiBytes,
    };

    const expected = {
      memoryType: norm(firstPartition.Chosen),
      partitionName: norm(firstPartition.Name),
      permCM4: (firstPartition.Access ?? "").trim(),
      isOwnerFlag: Boolean(firstPartition.IsOwner),
      isOwnerText: String(Boolean(firstPartition.IsOwner)),
      startAddress: startJson,
      sizeBytes: Number(firstPartition.Size),
    };

    expect(
      actual,
      `Partition fields mismatch:
   UI=${JSON.stringify(actual)}
   JSON=${JSON.stringify(expected)}`,
    ).to.deep.equal(expected);

    await view.switchBack();
    await workbench.executeCommand("view: close all editors");
  }).timeout(150000);
});
