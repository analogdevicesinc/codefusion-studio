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

// Feature: Partition creation and validation in CFS Config:

// Background:
//   Given the CFS config file "max32690-wlp-allocated-peripherals.cfsconfig" is opened
//   And all editors are closed
//   And all notifications are dismissed

// CFSIO-6337 Partition creation and validation

// CFSIO-6340 Memory Allocation -> Check Trustzone Address Alias Support
// When I open the cfsconfig file
// And I navigate to the Memory Menu in the UI
// And I click the "Create Partition" button
// And I select "RAM" from the memory type dropdown
// And I set the partition name to "testpartition"
// And I assign CM33 secure and CM33 non-secure cores
// When I select the "sysram1" core
// Then the start address and the CM33 secure start address should have the expected values
// When I set the size to "32"
// And I click the "Create Configured Partition" button
// And I save the configuration file
// Then the CM33 project should contain two partition with:
//   | Name         | testpartition |
//   | StartAddress | 0x20008000    |
//   | Size         | 32768         |
//   | DisplayUnit  | KB            |
//   | IsOwner      | true          |
//   | Access       | R             |
//   | Config       | Default (empty) settings |

//   | Name         | testpartition |
//   | StartAddress | 0x20008000    |
//   | Size         | 32768         |
//   | DisplayUnit  | KB            |
//   | IsOwner      | false         |
//   | Access       | R             |
//   | Config       | Default (empty) settings |
// When I open the cfsconfig file
// And I navigate to the Memory Menu in the UI
// And I edit the partition address
// And I click the "Save Changes" button
// And I save the configuration file
// Then the CM33 project should contain two partition with:
//   | Name         | testpartition |
//   | StartAddress | 0x20009000    |
//   | Size         | 32768         |
//   | DisplayUnit  | KB            |
//   | IsOwner      | true          |
//   | Access       | R             |
//   | Config       | Default (empty) settings |

//   | Name         | testpartition |
//   | StartAddress | 0x20009000    |
//   | Size         | 32768         |
//   | DisplayUnit  | KB            |
//   | IsOwner      | false         |
//   | Access       | R             |
//   | Config       | Default (empty) settings |

import { expect } from "chai";
import {
  ModalDialog,
  VSBrowser,
  WebView,
  Workbench,
} from "vscode-extension-tester";

import {
  getConfigPathForFile,
  getPartitionsByCoreId,
  parseJSONFile,
} from "../../config-tools-utility/cfsconfig-utils";
import { UIUtils } from "../../../ui-test-utils/ui-utils";
import { memoryAllocationTab } from "../../page-objects/main-menu";
import {
  assignCores,
  assignedCoresDropdownOptions,
  baseBlockDropdown,
  createConfiguredPartition,
  createPartitionButton,
  createSharcfxMemoryPartition,
  getBaseBlockOption,
  memoryTypeDropdown,
  memoryTypeSelector,
  partitionDeleteButton,
  partitionEditButton,
  partitionNameError,
  partitionNameTextBox,
  physicalStartAddress,
  pluginCoreText,
  projectCorePermission,
  secureStartAddress,
  sizeDropdown,
  sizeDropdownOption,
  sizeStepper,
  verifyPartitionPersistence,
} from "../../page-objects/memory-allocation-section/create-partition-sidebar";
import {
  getEditPartitionButton,
  partitionDetailsChevron,
  sizeStepperError,
} from "../../page-objects/memory-allocation-section/memory-allocation-screen";
import { clearAndSearch } from "../../page-objects/pin-config-section/pin-config-screen";

describe("Partition creation and validation", () => {
  let workbench: Workbench;
  let browser: VSBrowser;
  let view: WebView;
  let configPath: string | undefined;
  browser = VSBrowser.instance;

  before(async function () {
    browser = VSBrowser.instance;
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

  it("Partition creation and validation", async () => {
    configPath = getConfigPathForFile(
      "max32690-wlp-allocated-peripherals.cfsconfig",
    );

    await browser.openResources(configPath);
    workbench = new Workbench();

    await UIUtils.dismissAllNotifications(workbench, browser);
    view = new WebView();
    await view.wait(5000);
    await view.switchToFrame();

    // When I navigate to the Memory Menu in the UI
    await UIUtils.clickElement(view, memoryAllocationTab);

    // And I click the "Create Partition" button
    await UIUtils.clickElement(view, createPartitionButton);

    // And I select "Flash" from the memory type dropdown
    await UIUtils.selectOptionFromDropdown(
      view,
      memoryTypeDropdown,
      await memoryTypeSelector("Flash"),
    );

    // And I set the partition name to "testpartition"
    await UIUtils.clickElement(view, partitionNameTextBox);
    await UIUtils.sendKeysToElements(
      view,
      partitionNameTextBox,
      "testpartition",
    );

    // And I assign CM4 and RV cores
    const cores: string[] = [
      "multiselect-option-CM4-proj",
      "multiselect-option-RV-proj",
    ];
    await assignCores(view, cores);

    // And I open the CM4 permission dropdown
    await UIUtils.clickElement(
      view,
      await assignedCoresDropdownOptions("CM4-proj"),
    );

    // And I set the CM4 core permission to "R/W"
    await UIUtils.clickElement(view, await projectCorePermission("R/W"));

    // And I set the CM4 plugin override to "CM4Test"
    await UIUtils.sendKeysToElements(view, await pluginCoreText(1), "CM4Test");

    // And I set the RV plugin override to "RVTest"
    await UIUtils.sendKeysToElements(view, await pluginCoreText(2), "RVTest");

    // And I set the start address to "10300000"
    await UIUtils.clickElement(view, physicalStartAddress);
    await UIUtils.sendKeysToElements(view, physicalStartAddress, "10300000");

    // And I set the size to "32"
    await UIUtils.clickElement(view, sizeStepper);
    await UIUtils.sendKeysToElements(view, sizeStepper, "32");

    // And I click the "Create Configured Partition" button
    await UIUtils.clickElement(view, createConfiguredPartition);

    // And I save the configuration file
    console.log("Save the configuration file changes");
    await view.switchBack();
    await workbench.executeCommand("view: close all editors");
    const dialog = new ModalDialog();
    await dialog.pushButton("Save");
    console.log("Saved the configuration file");
    await UIUtils.sleep(300);

    // Then the CM4 project should contain a partition with:
    //   | Name         | testpartition |
    //   | StartAddress | 0x10300000    |
    //   | Size         | 32768         |
    //   | DisplayUnit  | KB            |
    //   | IsOwner      | true          |
    //   | Access       | R/W           |
    //   | NAME_OVERRIDE| CM4Test       |
    // And the RV project should contain a partition with:
    //   | Name         | testpartition |
    //   | StartAddress | 0x10300000    |
    //   | Size         | 32768         |
    //   | DisplayUnit  | KB            |
    //   | IsOwner      | false         |
    //   | Access       | R             |
    //   | NAME_OVERRIDE| RVTest        |

    const peripheralData = parseJSONFile(configPath);
    const cm4Partitions = getPartitionsByCoreId(peripheralData, "CM4");
    const expectedCM4Partitions = [
      {
        Name: "testpartition",
        StartAddress: "0x10300000",
        Size: 32768,
        DisplayUnit: "KB",
        IsOwner: true,
        Access: "R/W",
        Config: { NAME_OVERRIDE: "CM4Test" },
      },
    ];

    expect(cm4Partitions).to.deep.equal(
      expectedCM4Partitions,
      "CM4 Partition is empty or not matching your config",
    );

    const RVPartitions = getPartitionsByCoreId(peripheralData, "RV");
    const expectedRVPartitions = [
      {
        Name: "testpartition",
        StartAddress: "0x10300000",
        Size: 32768,
        DisplayUnit: "KB",
        IsOwner: false,
        Access: "R/W/X",
        Config: { NAME_OVERRIDE: "RVTest" },
      },
    ];

    expect(RVPartitions).to.deep.equal(
      expectedRVPartitions,
      "RV Partition is empty or not matching your config",
    );
    console.log("RV Partition config OK");
  }).timeout(150000);

  it("Trustzone partition creation and editing", async () => {
    // When I open the cfsconfig file
    configPath = getConfigPathForFile("max32657-wlp-trustzone.cfsconfig");
    await browser.openResources(configPath);
    workbench = new Workbench();

    await UIUtils.dismissAllNotifications(workbench, browser);
    view = new WebView();
    await view.wait(5000);
    await view.switchToFrame();

    // And I navigate to the Memory Menu in the UI
    await UIUtils.clickElement(view, memoryAllocationTab);

    // And I click the "Create Partition" button
    await UIUtils.clickElement(view, createPartitionButton);

    // And I select "RAM" from the memory type dropdown
    await UIUtils.selectOptionFromDropdown(
      view,
      memoryTypeDropdown,
      await memoryTypeSelector("RAM"),
    );

    // And I set the partition name to "testpartition"
    await UIUtils.clickElement(view, partitionNameTextBox);
    await UIUtils.sendKeysToElements(
      view,
      partitionNameTextBox,
      "testpartition",
    );

    // And I assign CM33 secure and CM33 non-secure cores
    const cores: string[] = [
      "multiselect-option-CM33-secure",
      "multiselect-option-CM33-nonsecure",
    ];
    await assignCores(view, cores);

    // When I select the "sysram1" core
    await UIUtils.clickElement(view, baseBlockDropdown);
    await UIUtils.clickElement(view, await getBaseBlockOption("sysram1"));

    // Then the start address and the CM33 secure start address should have the expected values
    const startAddressValue = await UIUtils.getAttributeFromWebElementBy(
      view,
      physicalStartAddress,
      "value",
    );
    const secureStartAddressValue = await UIUtils.getAttributeFromWebElementBy(
      view,
      secureStartAddress,
      "value",
    );
    expect(
      startAddressValue,
      "Expected Physical Starting Address to be 20008000, but was not",
    ).to.equal("20008000");
    expect(
      secureStartAddressValue,
      "Expected CM33 Secure Starting Address to be 30008000, but was not",
    ).to.equal("30008000");

    // When I set the size to "32"
    await UIUtils.clickElement(view, sizeStepper);
    await UIUtils.sendKeysToElements(view, sizeStepper, "32");

    // And I click the "Create Configured Partition" button
    await UIUtils.clickElement(view, createConfiguredPartition);

    // And I save the configuration file
    console.log("Save the configuration file changes");
    await view.switchBack();
    await workbench.executeCommand("view: close all editors");
    let dialog = new ModalDialog();
    await dialog.pushButton("Save");
    console.log("Saved the configuration file");
    await UIUtils.sleep(300);

    // Then the CM33 project should contain two partitions with:
    //   | Name         | testpartition |
    //   | StartAddress | 0x20008000    |
    //   | Size         | 32768         |
    //   | DisplayUnit  | KB            |
    //   | IsOwner      | true          |
    //   | Access       | R             |
    //   | Config       | Default (empty) settings |
    //
    //   | Name         | testpartition |
    //   | StartAddress | 0x20008000    |
    //   | Size         | 32768         |
    //   | DisplayUnit  | KB            |
    //   | IsOwner      | false         |
    //   | Access       | R             |
    //   | Config       | Default (empty) settings |
    let peripheralData = parseJSONFile(configPath);
    let actualCm33Partitions = getPartitionsByCoreId(peripheralData, "CM33");
    let expectedCM33Partitions = [
      {
        Name: "testpartition",
        StartAddress: "0x" + startAddressValue,
        Size: 32768,
        DisplayUnit: "KB",
        IsOwner: true,
        Access: "R/W/X",
        Config: {
          CHOSEN: "",
          LABEL: "",
        },
      },
      {
        Name: "testpartition",
        StartAddress: "0x" + startAddressValue,
        Size: 32768,
        DisplayUnit: "KB",
        IsOwner: false,
        Access: "R/W/X",
        Config: {
          CHOSEN: "",
          LABEL: "",
        },
      },
    ];

    expect(actualCm33Partitions).to.deep.equal(
      expectedCM33Partitions,
      "CM33 Partition is empty or not matching your config",
    );

    // When I open the cfsconfig file
    await browser.openResources(configPath);
    workbench = new Workbench();

    console.log("Opened the cfsconfig file");
    await UIUtils.dismissAllNotifications(workbench, browser);
    await UIUtils.sleep(300);
    console.log("Waiting for the element to be located in the DOM");
    view = new WebView();
    await view.switchToFrame();

    // And I navigate to the Memory Menu in the UI
    await UIUtils.clickElement(view, memoryAllocationTab);

    // And I edit the partition address
    await UIUtils.clickElement(view, await partitionDetailsChevron(1));
    await UIUtils.clickElement(view, await getEditPartitionButton(1));
    //Adding waitforelement to be visible to avoid flaky test
    await UIUtils.waitForElementToBeVisible(view, secureStartAddress);
    await UIUtils.clickElement(view, secureStartAddress);
    await (await UIUtils.findWebElement(view, secureStartAddress)).clear();
    await UIUtils.sendKeysToElements(view, secureStartAddress, "30009000");

    // And I click the "Save Changes" button
    await UIUtils.clickElement(view, createConfiguredPartition);

    // And I save the configuration file
    console.log("Save the configuration file changes");
    await view.switchBack();
    await workbench.executeCommand("view: close all editors");
    dialog = new ModalDialog();
    await dialog.pushButton("Save");
    console.log("Saved the configuration file");
    await UIUtils.sleep(300);

    // Then the CM33 project should contain two partitions with:
    //   | Name         | testpartition |
    //   | StartAddress | 0x20009000    |
    //   | Size         | 32768         |
    //   | DisplayUnit  | KB            |
    //   | IsOwner      | true          |
    //   | Access       | R             |
    //   | Config       | Default (empty) settings |
    //
    //   | Name         | testpartition |
    //   | StartAddress | 0x20009000    |
    //   | Size         | 32768         |
    //   | DisplayUnit  | KB            |
    //   | IsOwner      | false         |
    //   | Access       | R             |
    //   | Config       | Default (empty) settings |
    peripheralData = parseJSONFile(configPath);
    actualCm33Partitions = getPartitionsByCoreId(peripheralData, "CM33");
    expectedCM33Partitions = [
      {
        Name: "testpartition",
        StartAddress: "0x20009000",
        Size: 32768,
        DisplayUnit: "KB",
        IsOwner: true,
        Access: "R/W/X",
        Config: {
          CHOSEN: "",
          LABEL: "",
        },
      },
      {
        Name: "testpartition",
        StartAddress: "0x20009000",
        Size: 32768,
        DisplayUnit: "KB",
        IsOwner: false,
        Access: "R/W/X",
        Config: {
          CHOSEN: "",
          LABEL: "",
        },
      },
    ];

    expect(actualCm33Partitions).to.deep.equal(
      expectedCM33Partitions,
      "CM33 Partition is empty or not matching your config",
    );
  }).timeout(150000);
});

// Feature: SharcFX Partition creation and validation in CFS Config
//
// Background:
//   Given the CFS config file "sharcfx_core.cfsconfig" is opened
//   And all editors are closed
//   And all notifications are dismissed
//

describe("Sharcfx - Partition creation and validation", () => {
  let workbench: Workbench;
  let browser: VSBrowser;
  let view: WebView;
  let configPath: string;
  browser = VSBrowser.instance;
  configPath = getConfigPathForFile("sharcfx_core.cfsconfig");

  async function openMemoryAllocationTab() {
    await browser.openResources(configPath);
    workbench = new Workbench();

    console.log("Opened the cfsconfig file");
    await UIUtils.dismissAllNotifications(workbench, browser);
    await UIUtils.sleep(300);
    console.log("Waiting for the element to be located in the DOM");
    view = new WebView();
    await view.wait(300);

    console.log("sharcfx_core.cfsconfig UI loaded");
    await view.switchToFrame();

    // When I navigate to the Memory Menu in the UI
    await UIUtils.clickElement(view, memoryAllocationTab);
  }

  before(async function () {
    browser = VSBrowser.instance;
    await new Workbench().executeCommand("workbench.action.closeAllEditors");
  });

  afterEach(async () => {
    if (view) {
      await view.switchBack();
    }
    await new Workbench().executeCommand("workbench.action.closeAllEditors");
    // Teardown - reset cfsconfig files
    await UIUtils.restoreFixtureFileFromGit(configPath);
  });

  // Scenario: Flash partition creation for FX core
  //   When I navigate to the Memory menu
  //   And I click the "Create Partition" button
  //   And I select "Flash" from the memory type dropdown
  //   And I set the partition name to "testpartitionFlash"
  //   And I assign the FX core
  //   And I set the FX core permission to "R/W"
  //   And I set the start address to "60000000"
  //   And I set the size to "2048" KB
  //   And I click the "Create Configured Partition" button
  //   And I save the configuration file
  //   Then the FX project should contain a Flash partition with:
  //     | Name         | testpartitionFlash |
  //     | StartAddress | 0x60000000         |
  //     | Size         | 2097152            |
  //     | DisplayUnit  | KB                 |
  //     | IsOwner      | true               |
  //     | Access       | R/W                |
  //     | CHOSEN       |                    |
  //     | LABEL        |                    |
  //

  it("Partition creation and validation - Sharcfx Flash", async () => {
    await openMemoryAllocationTab();

    await createSharcfxMemoryPartition(
      view,
      "Flash",
      "testpartitionFlash",
      "R/W",
      "",
      "",
      "60000000",
      "KB",
      "2048",
    );

    // Save the configuration file and verify the partition persistence
    const partitions = await verifyPartitionPersistence(
      view,
      workbench,
      configPath,
    );

    // Then the FX project should contain a partition with:
    //   | Name         | testpartitionFlash |
    //   | StartAddress | 0x60000000         |
    //   | Size         | 2097152            |
    //   | DisplayUnit  | KB                 |
    //   | IsOwner      | true               |
    //   | Access       | R/W                |
    //   | CHOSEN       |                    |
    //   | LABEL        |                    |

    const expectedPartitions = [
      {
        Name: "testpartitionFlash",
        StartAddress: "0x60000000",
        Size: 2097152,
        DisplayUnit: "KB",
        IsOwner: true,
        Access: "R/W",
        Config: {
          CHOSEN: "",
          LABEL: "",
        },
      },
    ];

    expect(partitions).to.deep.equal(
      expectedPartitions,
      "FX Partition is empty or not matching your config",
    );
    console.log("FX Partition config OK");
  }).timeout(150000);

  // Scenario: RAM partition creation for FX core
  //   When I navigate to the Memory menu
  //   And I click the "Create Partition" button
  //   And I select "RAM" from the memory type dropdown
  //   And I set the partition name to "testpartitionRAM"
  //   And I assign the FX core
  //   And I set the FX core permission to "R/W"
  //   And I set the start address to "20000000"
  //   And I set the size to "1024" KB
  //   And I click the "Create Configured Partition" button
  //   And I save the configuration file
  //   Then the FX project should contain a RAM partition with:
  //     | Name         | testpartitionRAM |
  //     | StartAddress | 0x20000000       |
  //     | Size         | 1048576          |
  //     | DisplayUnit  | KB               |
  //     | IsOwner      | true             |
  //     | Access       | R/W              |
  //     | CHOSEN       |                  |
  //     | LABEL        |                  |
  //

  it("Partition creation and validation - Sharcfx RAM", async () => {
    await openMemoryAllocationTab();

    await createSharcfxMemoryPartition(
      view,
      "RAM",
      "testpartitionRAM",
      "R/W",
      "",
      "",
      "20000000",
      "KB",
      "1024",
    );

    // Save the configuration file and verify the partition persistence
    const partitions = await verifyPartitionPersistence(
      view,
      workbench,
      configPath,
    );

    // Then the FX project should contain a partition with:
    //   | Name         | testpartitionRAM   |
    //   | StartAddress | 0x20000000         |
    //   | Size         | 1048576            |
    //   | DisplayUnit  | KB                 |
    //   | IsOwner      | true               |
    //   | Access       | R/W                |
    //   | CHOSEN       |                    |
    //   | LABEL        |                    |

    const expectedPartitions = [
      {
        Name: "testpartitionRAM",
        StartAddress: "0x20000000",
        Size: 1048576,
        DisplayUnit: "KB",
        IsOwner: true,
        Access: "R/W",
        Config: {
          CHOSEN: "",
          LABEL: "",
        },
      },
    ];

    expect(partitions).to.deep.equal(
      expectedPartitions,
      "FX Partition is empty or not matching your config",
    );
    console.log("FX Partition config OK");
  }).timeout(150000);

  // Scenario: Flash partition creation with CHOSEN and LABEL fields populated
  //   When I navigate to the Memory menu
  //   And I click the "Create Partition" button
  //   And I select "Flash" from the memory type dropdown
  //   And I set the partition name to "testpartitionFlash_ChosenAndLabel"
  //   And I assign the FX core
  //   And I set the FX core permission to "R/W"
  //   And I set the CHOSEN field to "a123"
  //   And I set the LABEL field to "SharcFX Partition"
  //   And I set the start address to "60000000"
  //   And I set the size to "2048" KB
  //   And I click the "Create Configured Partition" button
  //   And I save the configuration file
  //   Then the FX project should contain a Flash partition with:
  //     | Name         | testpartitionFlash_ChosenAndLabel |
  //     | StartAddress | 0x60000000                        |
  //     | Size         | 2097152                           |
  //     | DisplayUnit  | KB                                |
  //     | IsOwner      | true                              |
  //     | Access       | R/W                               |
  //     | CHOSEN       | a123                              |
  //     | LABEL        | SharcFX Partition                 |
  //

  it("Sharcfx Flash partition creation and validation - Chosen and Label fields with non-empty values", async () => {
    const chosenFieldValue = "a123";
    const labelFieldValue = "SharcFX Partition";
    await openMemoryAllocationTab();

    await createSharcfxMemoryPartition(
      view,
      "Flash",
      "testpartitionFlash_ChosenAndLabel",
      "R/W",
      chosenFieldValue,
      labelFieldValue,
      "60000000",
      "KB",
      "2048",
    );

    const partitions = await verifyPartitionPersistence(
      view,
      workbench,
      configPath,
    );

    // Then the FX project should contain a partition with:
    //   | Name         | testpartitionFlash_ChosenAndLabel |
    //   | StartAddress | 0x60000000         |
    //   | Size         | 2097152            |
    //   | DisplayUnit  | KB                 |
    //   | IsOwner      | true               |
    //   | Access       | R/W                |
    //   | CHOSEN       | a123               |
    //   | LABEL        | SharcFX Partition  |

    const expectedPartitions = [
      {
        Name: "testpartitionFlash_ChosenAndLabel",
        StartAddress: "0x60000000",
        Size: 2097152,
        DisplayUnit: "KB",
        IsOwner: true,
        Access: "R/W",
        Config: {
          CHOSEN: chosenFieldValue,
          LABEL: labelFieldValue,
        },
      },
    ];

    expect(partitions).to.deep.equal(
      expectedPartitions,
      "FX Partition is empty or not matching your config",
    );
    console.log("FX Partition config OK");
  }).timeout(150000);

  // Scenario: Flash partition creation with MB as the size display unit
  //   When I navigate to the Memory menu
  //   And I click the "Create Partition" button
  //   And I select "Flash" from the memory type dropdown
  //   And I set the partition name to "testpartitionFlash_MB"
  //   And I assign the FX core
  //   And I set the FX core permission to "R/W"
  //   And I set the start address to "60000000"
  //   And I change the size display unit to "MB"
  //   And I set the size to "500" MB
  //   And I click the "Create Configured Partition" button
  //   And I save the configuration file
  //   Then the FX project should contain a Flash partition with:
  //     | Name         | testpartitionFlash_MB |
  //     | StartAddress | 0x60000000            |
  //     | Size         | 524288000             |
  //     | DisplayUnit  | MB                    |
  //     | IsOwner      | true                  |
  //     | Access       | R/W                   |
  //     | CHOSEN       |                       |
  //     | LABEL        |                       |
  //

  it("Sharcfx Flash partition creation and validation - Select MB as size unit", async () => {
    await openMemoryAllocationTab();

    await createSharcfxMemoryPartition(
      view,
      "Flash",
      "testpartitionFlash_MB",
      "R/W",
      "",
      "",
      "60000000",
      "MB",
      "500",
    );

    const partitions = await verifyPartitionPersistence(
      view,
      workbench,
      configPath,
    );

    // Then the FX project should contain a partition with:
    //   | Name         | testpartitionFlash_MB |
    //   | StartAddress | 0x60000000           |
    //   | Size         | 524288000            |
    //   | DisplayUnit  | MB                   |
    //   | IsOwner      | true                 |
    //   | Access       | R/W                  |
    //   | CHOSEN       |                      |
    //   | LABEL        |                      |

    const expectedPartitions = [
      {
        Name: "testpartitionFlash_MB",
        StartAddress: "0x60000000",
        Size: 524288000,
        DisplayUnit: "MB",
        IsOwner: true,
        Access: "R/W",
        Config: {
          CHOSEN: "",
          LABEL: "",
        },
      },
    ];

    expect(partitions).to.deep.equal(
      expectedPartitions,
      "FX Partition is empty or not matching your config",
    );
    console.log("FX Partition config OK");
  }).timeout(150000);

  // Scenario: Partition creation blocked when partition name is empty
  //   When I navigate to the Memory menu
  //   And I click the "Create Partition" button
  //   And I select "Flash" from the memory type dropdown
  //   And I leave the partition name empty
  //   And I assign the FX core
  //   And I set the FX core permission to "R/W"
  //   And I set the start address to "60000000"
  //   And I set the size to "2048" KB
  //   And I click the "Create Configured Partition" button
  //   Then a validation error "Partition name is required" should be displayed
  //   When I set the partition name to "testing_empty_partition_name"
  //   And I click the "Create Configured Partition" button
  //   And I save the configuration file
  //   Then the FX project should contain a Flash partition with:
  //     | Name         | testing_empty_partition_name |
  //     | StartAddress | 0x60000000                  |
  //     | Size         | 2097152                     |
  //     | DisplayUnit  | KB                          |
  //     | IsOwner      | true                        |
  //     | Access       | R/W                         |
  //     | CHOSEN       |                             |
  //     | LABEL        |                             |

  it("Sharcfx Flash partition creation and validation - Empty partition name", async () => {
    await openMemoryAllocationTab();

    await createSharcfxMemoryPartition(
      view,
      "Flash",
      "",
      "R/W",
      "",
      "",
      "60000000",
      "KB",
      "2048",
    );

    const partitionNameErrorElement = await UIUtils.findWebElement(
      view,
      partitionNameError,
    );

    expect(await partitionNameErrorElement.isDisplayed()).to.be.true;
    const errorText = (await partitionNameErrorElement.getText()).trim();
    expect(errorText, "Partition name error message is incorrect").to.equal(
      "Partition name is required",
    );

    // And I set the partition name to "testing_empty_partition_name"
    await UIUtils.clickElement(view, partitionNameTextBox);
    await UIUtils.sendKeysToElements(
      view,
      partitionNameTextBox,
      "testing_empty_partition_name",
    );

    // And I click the "Create Configured Partition" button
    await UIUtils.clickElement(view, createConfiguredPartition);

    const partitions = await verifyPartitionPersistence(
      view,
      workbench,
      configPath,
    );

    // Then the FX project should contain a partition with:
    //   | Name         | testing_empty_partition_name |
    //   | StartAddress | 0x60000000                   |
    //   | Size         | 2097152                      |
    //   | DisplayUnit  | KB                            |
    //   | IsOwner      | true                          |
    //   | Access       | R/W                           |
    //   | CHOSEN       |                               |
    //   | LABEL        |                               |

    const expectedPartitions = [
      {
        Name: "testing_empty_partition_name",
        StartAddress: "0x60000000",
        Size: 2097152,
        DisplayUnit: "KB",
        IsOwner: true,
        Access: "R/W",
        Config: {
          CHOSEN: "",
          LABEL: "",
        },
      },
    ];

    expect(partitions).to.deep.equal(
      expectedPartitions,
      "FX Partition is empty or not matching your config",
    );
    console.log("FX Partition config OK");
  }).timeout(150000);

  // Scenario: Flash partition size exceeding memory block range is rejected
  //   When I navigate to the Memory menu
  //   And I click the "Create Partition" button
  //   And I select "Flash" from the memory type dropdown
  //   And I set the partition name to "testpartitionFlash_1"
  //   And I assign the FX core
  //   And I set the FX core permission to "R/W"
  //   And I set the start address to "60000000"
  //   And I change the size display unit to "MB"
  //   And I set the size to "500" MB
  //   And I click the "Create Configured Partition" button
  //   And I click the "Create Partition" button
  //   And I select "Flash" from the memory type dropdown
  //   And I set the partition name to "testpartitionFlash_2"
  //   And I assign the FX core
  //   And I set the FX core permission to "R/W"
  //   And I set the start address to "7F400000"
  //   And I change the size display unit to "MB"
  //   And I set the size to "15" MB
  //   And I click the "Create Configured Partition" button
  //   Then a validation error "Size exceeds memory block range" should be displayed
  //   When I set the size to "12" MB
  //   And I click the "Create Configured Partition" button
  //   And I save the configuration file
  //   Then the FX project should contain two Flash partitions with:
  //     | Name         | testpartitionFlash_1 |
  //     | StartAddress | 0x60000000           |
  //     | Size         | 524288000            |
  //     | DisplayUnit  | MB                   |
  //     | IsOwner      | true                 |
  //     | Access       | R/W                  |
  //     | CHOSEN       |                      |
  //     | LABEL        |                      |
  //
  //     | Name         | testpartitionFlash_2 |
  //     | StartAddress | 0x7F400000           |
  //     | Size         | 12582912             |
  //     | DisplayUnit  | MB                   |
  //     | IsOwner      | true                 |
  //     | Access       | R/W                  |
  //     | CHOSEN       |                      |
  //     | LABEL        |                      |

  it("Sharcfx Flash partition creation and validation - Partition size exceeding memory range", async () => {
    await openMemoryAllocationTab();

    await createSharcfxMemoryPartition(
      view,
      "Flash",
      "testpartitionFlash_1",
      "R/W",
      "",
      "",
      "60000000",
      "MB",
      "500",
    );

    // Creating another partition with the same start address and size exceeding memory range

    await createSharcfxMemoryPartition(
      view,
      "Flash",
      "testpartitionFlash_2",
      "R/W",
      "",
      "",
      "7F400000",
      "MB",
      "15",
    );

    // Then a validation error "Size exceeds memory block range" should be displayed

    const sizeErrorElement = await UIUtils.findWebElement(
      view,
      sizeStepperError,
    );
    await VSBrowser.instance.driver.executeScript(
      "arguments[0].scrollIntoView()",
      sizeErrorElement,
    );
    expect(await sizeErrorElement.isDisplayed()).to.be.true;
    const errorText = (await sizeErrorElement.getText()).trim();
    expect(
      errorText,
      "Partition size stepper error message is incorrect",
    ).to.equal("Size exceeds memory block range");

    // And I set the size to "12" within the allowed range
    const sizeStepperElement = await UIUtils.findWebElement(view, sizeStepper);
    await clearAndSearch(sizeStepperElement, "12");

    // And I click the "Create Configured Partition" button
    await UIUtils.clickElement(view, createConfiguredPartition);

    const partitions = await verifyPartitionPersistence(
      view,
      workbench,
      configPath,
    );

    // Then the FX project should contain two partitions with:
    //   | Name         | testpartitionFlash_1 |
    //   | StartAddress | 0x60000000           |
    //   | Size         | 524288000            |
    //   | DisplayUnit  | MB                   |
    //   | IsOwner      | true                 |
    //   | Access       | R/W                  |
    //   | CHOSEN       |                      |
    //   | LABEL        |                      |
    //
    //   | Name         | testpartitionFlash_2 |
    //   | StartAddress | 0x7F400000           |
    //   | Size         | 12582912             |
    //   | DisplayUnit  | MB                   |
    //   | IsOwner      | true                 |
    //   | Access       | R/W                  |
    //   | CHOSEN       |                      |
    //   | LABEL        |                      |

    const expectedPartitions = [
      {
        Name: "testpartitionFlash_1",
        StartAddress: "0x60000000",
        Size: 524288000,
        DisplayUnit: "MB",
        IsOwner: true,
        Access: "R/W",
        Config: {
          CHOSEN: "",
          LABEL: "",
        },
      },
      {
        Name: "testpartitionFlash_2",
        StartAddress: "0x7F400000",
        Size: 12582912,
        DisplayUnit: "MB",
        IsOwner: true,
        Access: "R/W",
        Config: {
          CHOSEN: "",
          LABEL: "",
        },
      },
    ];

    expect(partitions).to.deep.equal(
      expectedPartitions,
      "FX Partition is empty or not matching your config",
    );
    console.log("FX Partition config OK");
  }).timeout(150000);
});

describe("Sharcfx - Memory Partition edit and deletion", () => {
  let workbench: Workbench;
  let browser: VSBrowser;
  let view: WebView;
  let configPath: string;
  browser = VSBrowser.instance;
  configPath = getConfigPathForFile("sharcfx_core.cfsconfig");

  async function openMemoryAllocationTab() {
    await browser.openResources(configPath);
    workbench = new Workbench();

    console.log("Opened the cfsconfig file");
    await UIUtils.dismissAllNotifications(workbench, browser);
    await UIUtils.sleep(300);
    console.log("Waiting for the element to be located in the DOM");
    view = new WebView();

    console.log("sharcfx_core.cfsconfig UI loaded");
    await view.switchToFrame();

    // When I navigate to the Memory Menu in the UI
    await UIUtils.clickElement(view, memoryAllocationTab);
  }

  before(async function () {
    browser = VSBrowser.instance;
    await new Workbench().executeCommand("workbench.action.closeAllEditors");
  });

  afterEach(async () => {
    if (view) {
      await view.switchBack();
    }
    await new Workbench().executeCommand("workbench.action.closeAllEditors");
    // Teardown - reset cfsconfig files
    await UIUtils.restoreFixtureFileFromGit(configPath);
  });

  // Scenario: Flash partition creation for FX core
  //   When I navigate to the Memory menu
  //   And I click the "Create Partition" button
  //   And I select "Flash" from the memory type dropdown
  //   And I set the partition name to "testpartitionFlash"
  //   And I assign the FX core
  //   And I set the FX core permission to "R/W"
  //   And I set the start address to "60000000"
  //   And I set the size to "2048" KB
  //   And I click the "Create Configured Partition" button
  //   And I save the configuration file
  //   Then the FX project should contain a Flash partition with:
  //     | Name         | testpartitionFlash |
  //     | StartAddress | 0x60000000         |
  //     | Size         | 2097152            |
  //     | DisplayUnit  | KB                 |
  //     | IsOwner      | true               |
  //     | Access       | R/W                |
  //     | CHOSEN       |                    |
  //     | LABEL        |                    |
  //

  it("Partition editing - Sharcfx Flash", async () => {
    const partitionNameBeforeEdit = "testpartitionFlash";
    const partitionNameAfterEdit = "edited_partitionFlash";
    await openMemoryAllocationTab();

    await createSharcfxMemoryPartition(
      view,
      "Flash",
      partitionNameBeforeEdit,
      "R/W",
      "",
      "",
      "60000000",
      "KB",
      "2048",
    );

    const partitionsBeforeEdit = await verifyPartitionPersistence(
      view,
      workbench,
      configPath,
    );

    // Then the FX project should contain a partition with:
    //   | Name         | testpartitionFlash |
    //   | StartAddress | 0x60000000         |
    //   | Size         | 2097152            |
    //   | DisplayUnit  | KB                 |
    //   | IsOwner      | true               |
    //   | Access       | R/W                |
    //   | CHOSEN       |                    |
    //   | LABEL        |                    |

    const expectedPartitions = [
      {
        Name: partitionNameBeforeEdit,
        StartAddress: "0x60000000",
        Size: 2097152,
        DisplayUnit: "KB",
        IsOwner: true,
        Access: "R/W",
        Config: {
          CHOSEN: "",
          LABEL: "",
        },
      },
    ];

    expect(partitionsBeforeEdit).to.deep.equal(
      expectedPartitions,
      "FX Partition is empty or not matching your config",
    );
    console.log("FX Partition config OK");

    // Edit the created partition

    await openMemoryAllocationTab();

    // And I click the edit button for the partition details chevron
    await UIUtils.clickElement(view, await partitionDetailsChevron(1));

    // And I click the edit button in the partition details view
    await UIUtils.clickElement(
      view,
      await partitionEditButton(partitionNameBeforeEdit),
    );

    // And I change the partition name to "edited_partitionFlash"
    const partitionNameTextBoxElement = await UIUtils.findWebElement(
      view,
      partitionNameTextBox,
    );
    await clearAndSearch(partitionNameTextBoxElement, partitionNameAfterEdit);

    // And I change the size display unit to "MB"
    const sizeDropdownElement = await UIUtils.findWebElement(
      view,
      sizeDropdown,
    );
    await VSBrowser.instance.driver.executeScript(
      "arguments[0].scrollIntoView()",
      sizeDropdownElement,
    );
    await UIUtils.clickElement(view, sizeDropdown);
    await UIUtils.clickElement(view, await sizeDropdownOption("MB"));

    // And I set the size to "500" within the allowed range
    const sizeStepperElement = await UIUtils.findWebElement(view, sizeStepper);
    await clearAndSearch(sizeStepperElement, "500");

    // And I click the "Save Partition" button
    await UIUtils.clickElement(view, createConfiguredPartition);

    const partitionsAfterEdit = await verifyPartitionPersistence(
      view,
      workbench,
      configPath,
    );

    // Then the FX project should contain a partition with:
    //   | Name         | edited_partitionFlash |
    //   | StartAddress | 0x60000000            |
    //   | Size         | 524288000             |
    //   | DisplayUnit  | MB                    |
    //   | IsOwner      | true                  |
    //   | Access       | R/W                   |
    //   | CHOSEN       |                       |
    //   | LABEL        |                       |

    const expectedPartitionsAfterEdit = [
      {
        Name: partitionNameAfterEdit,
        StartAddress: "0x60000000",
        Size: 524288000,
        DisplayUnit: "MB",
        IsOwner: true,
        Access: "R/W",
        Config: {
          CHOSEN: "",
          LABEL: "",
        },
      },
    ];

    expect(partitionsAfterEdit).to.deep.equal(
      expectedPartitionsAfterEdit,
      "FX Partition is empty or not matching your config",
    );
    console.log("FX Partition config OK");
  }).timeout(150000);

  it("Create Sharcfx RAM partition and delete the created partition", async () => {
    await openMemoryAllocationTab();

    await createSharcfxMemoryPartition(
      view,
      "RAM",
      "testpartitionRAM",
      "R/W",
      "",
      "",
      "20000000",
      "KB",
      "1024",
    );

    const partitions = await verifyPartitionPersistence(
      view,
      workbench,
      configPath,
    );

    // Then the FX project should contain a partition with:
    //   | Name         | testpartitionRAM   |
    //   | StartAddress | 0x20000000         |
    //   | Size         | 1048576            |
    //   | DisplayUnit  | KB                 |
    //   | IsOwner      | true               |
    //   | Access       | R/W                |
    //   | CHOSEN       |                    |
    //   | LABEL        |                    |

    const expectedPartitions = [
      {
        Name: "testpartitionRAM",
        StartAddress: "0x20000000",
        Size: 1048576,
        DisplayUnit: "KB",
        IsOwner: true,
        Access: "R/W",
        Config: {
          CHOSEN: "",
          LABEL: "",
        },
      },
    ];

    expect(partitions).to.deep.equal(
      expectedPartitions,
      "FX Partition is empty or not matching your config",
    );
    console.log("FX Partition config OK");

    // Delete the created partition
    await openMemoryAllocationTab();

    // And I click the delete button for the partition details chevron
    await UIUtils.clickElement(view, await partitionDetailsChevron(1));

    // And I click the delete button in the partition details view
    await UIUtils.clickElement(
      view,
      await partitionDeleteButton("testpartitionRAM"),
    );

    const partitionsAfterDeletion = await verifyPartitionPersistence(
      view,
      workbench,
      configPath,
    );

    // Then the FX project should contain an empty partition list

    expect(partitionsAfterDeletion, "FX Partition should be empty").to.be.empty;
    console.log("FX Partition config OK");

    // Create another partition with same start address to verify no conflict and the new partition saves correctly
    await openMemoryAllocationTab();

    await createSharcfxMemoryPartition(
      view,
      "RAM",
      "new_partitionRAM",
      "R/W",
      "",
      "",
      "20000000",
      "KB",
      "1024",
    );

    const partitionsRecreated = await verifyPartitionPersistence(
      view,
      workbench,
      configPath,
    );

    // Then the FX project should contain a partition with:
    //   | Name         | new_partitionRAM   |
    //   | StartAddress | 0x20000000         |
    //   | Size         | 1048576            |
    //   | DisplayUnit  | KB                 |
    //   | IsOwner      | true               |
    //   | Access       | R/W                |
    //   | CHOSEN       |                    |
    //   | LABEL        |                    |

    const expectedPartitionsRecreated = [
      {
        Name: "new_partitionRAM",
        StartAddress: "0x20000000",
        Size: 1048576,
        DisplayUnit: "KB",
        IsOwner: true,
        Access: "R/W",
        Config: {
          CHOSEN: "",
          LABEL: "",
        },
      },
    ];

    expect(partitionsRecreated).to.deep.equal(
      expectedPartitionsRecreated,
      "FX Partition is empty or not matching your config",
    );
    console.log("FX Partition config OK");
  }).timeout(150000);

  it("Create Sharcfx Flash and RAM partition and delete RAM partition and verify only RAM partition is deleted", async () => {
    await openMemoryAllocationTab();

    await createSharcfxMemoryPartition(
      view,
      "Flash",
      "testpartitionFlash",
      "R/W",
      "",
      "",
      "60000000",
      "KB",
      "2048",
    );

    await createSharcfxMemoryPartition(
      view,
      "RAM",
      "testpartitionRAM",
      "R/W",
      "",
      "",
      "20000000",
      "KB",
      "1024",
    );

    const partitions = await verifyPartitionPersistence(
      view,
      workbench,
      configPath,
    );

    // Then the FX project should contain a partition with:

    //   | Name         | testpartitionFlash |
    //   | StartAddress | 0x60000000         |
    //   | Size         | 2097152            |
    //   | DisplayUnit  | KB                 |
    //   | IsOwner      | true               |
    //   | Access       | R/W                |
    //   | CHOSEN       |                    |
    //   | LABEL        |                    |
    //
    //   | Name         | testpartitionRAM   |
    //   | StartAddress | 0x20000000         |
    //   | Size         | 1048576            |
    //   | DisplayUnit  | KB                 |
    //   | IsOwner      | true               |
    //   | Access       | R/W                |
    //   | CHOSEN       |                    |
    //   | LABEL        |                    |

    const expectedPartitions = [
      {
        Name: "testpartitionFlash",
        StartAddress: "0x60000000",
        Size: 2097152,
        DisplayUnit: "KB",
        IsOwner: true,
        Access: "R/W",
        Config: {
          CHOSEN: "",
          LABEL: "",
        },
      },
      {
        Name: "testpartitionRAM",
        StartAddress: "0x20000000",
        Size: 1048576,
        DisplayUnit: "KB",
        IsOwner: true,
        Access: "R/W",
        Config: {
          CHOSEN: "",
          LABEL: "",
        },
      },
    ];

    expect(partitions).to.deep.equal(
      expectedPartitions,
      "FX Partition is empty or not matching your config",
    );
    console.log("FX Partition config OK");

    // Delete the created RAM partition
    await openMemoryAllocationTab();

    // And I click the delete button for the partition details chevron
    await UIUtils.clickElement(view, await partitionDetailsChevron(1));

    // And I click the delete button in the partition details view
    await UIUtils.clickElement(
      view,
      await partitionDeleteButton("testpartitionRAM"),
    );

    const partitionsAfterDeletion = await verifyPartitionPersistence(
      view,
      workbench,
      configPath,
    );

    // Then the FX project should contain a partition with
    //   | Name         | testpartitionFlash |
    //   | StartAddress | 0x60000000         |
    //   | Size         | 2097152            |
    //   | DisplayUnit  | KB                 |
    //   | IsOwner      | true               |
    //   | Access       | R/W                |
    //   | CHOSEN       |                    |
    //   | LABEL        |                    |

    const expectedPartitionsAfterDeletion = [
      {
        Name: "testpartitionFlash",
        StartAddress: "0x60000000",
        Size: 2097152,
        DisplayUnit: "KB",
        IsOwner: true,
        Access: "R/W",
        Config: {
          CHOSEN: "",
          LABEL: "",
        },
      },
    ];

    expect(partitionsAfterDeletion).to.deep.equal(
      expectedPartitionsAfterDeletion,
      "FX Partition is empty or not matching your config",
    );
    console.log("FX Partition config OK");
  }).timeout(150000);
});
