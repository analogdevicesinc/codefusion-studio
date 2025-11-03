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
//   | Config       |               |

//   | Name         | testpartition |
//   | StartAddress | 0x20008000    |
//   | Size         | 32768         |
//   | DisplayUnit  | KB            |
//   | IsOwner      | false         |
//   | Access       | R             |
//   | Config       |               |
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
//   | Config       |               |

//   | Name         | testpartition |
//   | StartAddress | 0x20009000    |
//   | Size         | 32768         |
//   | DisplayUnit  | KB            |
//   | IsOwner      | false         |
//   | Access       | R             |
//   | Config       |               |

import { expect } from "chai";
import {
  EditorView,
  ModalDialog,
  VSBrowser,
  WebView,
  Workbench,
} from "vscode-extension-tester";

import { exec } from "child_process";
import {
  getConfigPathForFile,
  getPartitionsByCoreId,
  parseJSONFile,
} from "../../config-tools-utility/cfsconfig-utils";
import { UIUtils } from "../../config-tools-utility/config-utils";
import { memoryAllocationTab } from "../../page-objects/main-menu";
import {
  assignCores,
  assignedCoresDropdownOptions,
  baseBlockDropdown,
  getBaseBlockOption,
  createConfiguredPartition,
  memoryTypeDropdown,
  memoryTypeSelector,
  partitionNameTextBox,
  pluginCoreText,
  projectCorePermission,
  secureStartAddress,
  sizeStepper,
  startAddress
} from "../../page-objects/memory-allocation-section/create-partition-sidebar";
import {
  createPartitionButton,
  getEditPartitionButton,
  partitionDetailsChevron,
} from "../../page-objects/memory-allocation-section/memory-allocation-screen";

describe("Partition creation and validation", () => {
  let workbench: Workbench;
  let browser: VSBrowser;
  let view: WebView;
  let editor: EditorView;
  let configPath: string;
  browser = VSBrowser.instance;

  before(async function () {
    this.timeout(10000);
    browser = VSBrowser.instance;
    editor = new EditorView();
    await editor.closeAllEditors();
    await UIUtils.sleep(3000);
  });

  afterEach(async () => {
    exec(`git checkout ${configPath}`);
  });

  it("Partition creation and validation", async () => {
    configPath = getConfigPathForFile(
      "max32690-wlp-allocated-peripherals.cfsconfig",
    );

    await browser.openResources(configPath);
    workbench = new Workbench();

    console.log("Opened the cfsconfig file");
    await UIUtils.dismissAllNotifications(workbench, browser);
    await UIUtils.sleep(5000);
    console.log("Waiting for the element to be located in the DOM");
    view = new WebView();

    console.log("max32690-wlp-allocated-peripherals UI loaded");
    await view.switchToFrame();

    // When I navigate to the Memory Menu in the UI
    await UIUtils.clickElement(view, memoryAllocationTab);

    // And I click the "Create Partition" button
    await UIUtils.clickElement(view, createPartitionButton);

    // And I select "Flash" from the memory type dropdown
    await UIUtils.clickElement(view, memoryTypeDropdown);

    // Select memory type (Can be "Flash" or "RAM")-based on current options
    await UIUtils.clickElement(view, await memoryTypeSelector("Flash"));

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
    await UIUtils.clickElement(view, await assignedCoresDropdownOptions("CM4-proj"));

    // And I set the CM4 core permission to "R/W"
    await UIUtils.clickElement(view, await projectCorePermission("R/W"));

    // And I set the CM4 plugin override to "CM4Test"
    await UIUtils.sendKeysToElements(view, await pluginCoreText(1), "CM4Test");

    // And I set the RV plugin override to "RVTest"
    await UIUtils.sendKeysToElements(view, await pluginCoreText(2), "RVTest");

    // And I set the start address to "10300000"
    await UIUtils.clickElement(view, startAddress);
    await UIUtils.sendKeysToElements(view, startAddress, "10300000");

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
        Access: "R",
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

    console.log("Opened the cfsconfig file");
    await UIUtils.dismissAllNotifications(workbench, browser);
    await UIUtils.sleep(5000);
    console.log("Waiting for the element to be located in the DOM");
    view = new WebView();
    await view.switchToFrame();

    // And I navigate to the Memory Menu in the UI
    await UIUtils.clickElement(view, memoryAllocationTab);

    // And I click the "Create Partition" button
    await UIUtils.clickElement(view, createPartitionButton);

    // And I select "RAM" from the memory type dropdown
    await UIUtils.clickElement(view, memoryTypeDropdown);
    await UIUtils.clickElement(view, await memoryTypeSelector("RAM"));

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
      startAddress,
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

    // Then the CM33 project should contain two partition with:
    //   | Name         | testpartition |
    //   | StartAddress | 0x20008000    |
    //   | Size         | 32768         |
    //   | DisplayUnit  | KB            |
    //   | IsOwner      | true          |
    //   | Access       | R             |
    //   | Config       |               |
    //
    //   | Name         | testpartition |
    //   | StartAddress | 0x20008000    |
    //   | Size         | 32768         |
    //   | DisplayUnit  | KB            |
    //   | IsOwner      | false         |
    //   | Access       | R             |
    //   | Config       |               |
    let peripheralData = parseJSONFile(configPath);
    let actualCm33Partitions = getPartitionsByCoreId(peripheralData, "CM33");
    let expectedCM33Partitions = [
      {
        Name: "testpartition",
        StartAddress: "0x" + startAddressValue,
        Size: 32768,
        DisplayUnit: "KB",
        IsOwner: true,
        Access: "R",
        Config: {},
      },
      {
        Name: "testpartition",
        StartAddress: "0x" + startAddressValue,
        Size: 32768,
        DisplayUnit: "KB",
        IsOwner: false,
        Access: "R",
        Config: {},
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
    await UIUtils.sleep(5000);
    console.log("Waiting for the element to be located in the DOM");
    view = new WebView();
    await view.switchToFrame();

    // And I navigate to the Memory Menu in the UI
    await UIUtils.clickElement(view, memoryAllocationTab);

    // And I edit the partition address
    await UIUtils.clickElement(view, await partitionDetailsChevron(1));
    await UIUtils.clickElement(view, await getEditPartitionButton(1));

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

    // Then the CM33 project should contain two partition with:
    //   | Name         | testpartition |
    //   | StartAddress | 0x20009000    |
    //   | Size         | 32768         |
    //   | DisplayUnit  | KB            |
    //   | IsOwner      | true          |
    //   | Access       | R             |
    //   | Config       |               |
    //
    //   | Name         | testpartition |
    //   | StartAddress | 0x20009000    |
    //   | Size         | 32768         |
    //   | DisplayUnit  | KB            |
    //   | IsOwner      | false         |
    //   | Access       | R             |
    //   | Config       |               |
    peripheralData = parseJSONFile(configPath);
    actualCm33Partitions = getPartitionsByCoreId(peripheralData, "CM33");
    expectedCM33Partitions = [
      {
        Name: "testpartition",
        StartAddress: "0x20009000",
        Size: 32768,
        DisplayUnit: "KB",
        IsOwner: true,
        Access: "R",
        Config: {},
      },
      {
        Name: "testpartition",
        StartAddress: "0x20009000",
        Size: 32768,
        DisplayUnit: "KB",
        IsOwner: false,
        Access: "R",
        Config: {},
      },
    ];

    expect(actualCm33Partitions).to.deep.equal(
      expectedCM33Partitions,
      "CM33 Partition is empty or not matching your config",
    );
  }).timeout(150000);
});
