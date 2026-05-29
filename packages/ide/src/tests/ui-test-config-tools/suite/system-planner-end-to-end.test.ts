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

/**
 * These tests cover the end to end tests of System Planner
 */

import { expect } from "chai";
import {
  EditorView,
  VSBrowser,
  WebView,
  Workbench,
} from "vscode-extension-tester";

import { UIUtils } from "../../ui-test-utils/ui-utils";
import {
  getClockFrequencies,
  getConfigPathForFile,
} from "../config-tools-utility/cfsconfig-utils";
import { assignPinToSignal } from "../page-objects/pin-config-section/pin-config-screen";
import { createAndVerifyMemoryPartition } from "../page-objects/memory-allocation-section/memory-allocation-screen";
import {
  configureClockMUXSettings,
  configureClockPinInputSettings,
  configureClockPeripheralSettings,
} from "../page-objects/clock-config-section/clock-config-screen";
import { generateCode } from "../page-objects/generate-code-section/generate-code-screen";
import { assignPeripheralToCore } from "../page-objects/peripheral-allocation-section/peripheral-allocation-screen";
import {
  peripheralTab,
  clockTab,
  memoryAllocationTab,
  generateCodeTab,
  pinTab,
} from "../page-objects/main-menu";
import { parseJSONFile } from "../config-tools-utility/cfsconfig-utils";

/*
 * Feature: System Planner smoke test coverage
 *     As a CodeFusion Studio user
 *     I want to assign peripherals, configure pins, set up the clock, assign memory partitions, and generate code
 *     So that I can verify that the entire System Planner workflow is functioning correctly
 *
 * Background:
 *     Given VS Code is open with the CodeFusion Studio extension loaded
 *     And all editors are closed
 *     And all notifications are dismissed
 *
 * Scenario: User is configuring the peripheral for arm cortex core
 *     Given the cfsconfig file to be opened have RX, TX and MISC signals with Pins already configured
 *     When I  click on peripheral tab to see all peripherals are listed
 *     And I assign the "CAN0" peripheral to the Arm Cortex core project
 *     Then I  verify the assignment of the peripheral to the arm core on UI
 *     And I assign the "CAN1" peripheral to the RISCV core project
 *     Then I verify the assignment of the peripheral to the riscv core on UI
 *
 * Scenario: User is configuring the Pins for peripherals on signals
 *     Given the cfsconfig file is opened
 *     When user has clicked on Pin Configuration
 *     And I assign peripheral OWM to signal IO with Pin F8
 *     And I assign peripheral OWM to signal PE with Pin G2
 *     Then I verify OWM peripheral with the signals IO and PE on the UI have been assigned to it
 *
 * Scenario: User is configuring clock with clock sources and peripherals
 *     Given  cfsconfig have MISC with CLKNEXT signal configured
 *     When user has clicked on clock configuration
 *     And user click on MUX node to select ERTCO MUX with clock option "EXTERNAL CLOCK ON 32KIN"
 *     And user enter Pin Input frequency as "1000" for external clock for Pin P0.23
 *     And user switch on toggle for I2S peripheral
 *     Then user verify with toggle is ON for peripheral on UI
 *
 * Scenario: User is creating a memory partition
 *     Given user is on memory allocation screen
 *     When user has clicked on memory partition configuration
 *     And user open memory partition configuration and selects type "flash" and type name "smoketest"
 *     And user assigns it to "Arm Core" with base block "flash" and size "8 KB"
 *     Then the partition is created and generated under the Arm Core and is verified on UI
 *
 * Scenario: User is generating code
 *     Given user is on generate code screen
 *     When user clicks on generate code button
 *     And save the files using worksbench commands
 *     And the pop up to dismiss overwrite existing files appear
 *     And user clicks on overwrite existing files
 *     Then the code is generated and verified on UI with generated files
 *
 */

describe("Smoke Test: System Planner End-to-End Workflow", () => {
  const configFile = "max32690-wlp.cfsconfig";

  // ===Test Setup===
  let workbench: Workbench;
  let browser: VSBrowser;
  let view: WebView;
  let editor: EditorView;

  before(async () => {
    browser = VSBrowser.instance;
    editor = new EditorView();
    await editor.closeAllEditors();
    await UIUtils.sleep(3000);
  });

  after(async () => {
    await UIUtils.sleep(2000);
    await view.switchBack();
    await editor.closeAllEditors();
    await UIUtils.restoreFixtureFileFromGit(getConfigPathForFile(configFile));
  });

  it("Performs system planner end to end flow @smoke", async () => {
    await browser.openResources(getConfigPathForFile(configFile));
    workbench = new Workbench();

    // === Then dismiss all notifications, wait for the webview to load===
    await UIUtils.dismissAllNotifications(workbench, browser);
    view = new WebView();
    await view.wait();
    await view.switchToFrame();
    console.log("Switched to the WebView frame");

    await UIUtils.sleep(3000); // Wait for the webview content to load

    // ===Given the cfsconfig file to be opened have RX, TX and MISC signals with Pins already configured===
    // ===When user clicks on peripheral tab to all peripherals are listed===
    await UIUtils.clickElement(view, peripheralTab);

    // ===And user assign the "CAN0" peripheral to the Arm Cortex core===
    // ===Then user verify the assignment of the peripheral to the arm core on UI===
    await assignPeripheralToCore(view, {
      peripheral: "CAN0",
      coreProjectId: "max32690_arm-cortex-m4f",
      core: "ARM Cortex-M4",
    });

    // ===And user assign the "CAN1" peripheral to the RISCV core===
    // ===Then user verify the assignment of the peripheral to the riscv core on UI===
    await assignPeripheralToCore(view, {
      peripheral: "CAN1",
      coreProjectId: "max32690_risc-v",
      core: "RISC-V",
    });

    // ===Given the cfsconfig file is opened===
    // ===When user has clicked on Pin Configuration===
    await UIUtils.clickElement(view, pinTab);

    // ===And user assign peripheral OWM to signal IO===
    // ===And user assign peripheral OWM to signal PE===
    // ===Then user verify OWM peripheral assignments with the signals IO and PE with their Pins(F8 and G2)===
    await assignPinToSignal(view, {
      peripheral: "OWM",
      signal: "OWM-IO",
    });

    await assignPinToSignal(view, {
      peripheral: "OWM",
      signal: "OWM-PE",
    });

    // ===Given  cfsconfig have MISC with CLKNEXT signal configured===
    // ===When user has clicked on clock configuration===
    await UIUtils.clickElement(view, clockTab);

    // ===And user click on MUX node to select ERTCO MUX with clock option "EXTERNAL CLOCK ON 32KIN"===
    await configureClockMUXSettings(view, {
      muxType: "ERTCO Mux",
      muxSource: "MUX-ERTCO Mux",
      muxSourceOption: "ERTCO_CLK",
    });

    // ===And user enter Pin Input frequency as "1000" for external clock for P0.23===
    await configureClockPinInputSettings(view, "P0.23", "1000");

    // === And user switch on toggle for I2S peripheral===
    // === Then user verify with toggle is ON for peripheral on UI===
    await configureClockPeripheralSettings(view, "I2S");

    // ===Given user is on memory allocation screen===
    // ===When user has clicked on memory partition configuration===
    await UIUtils.clickElement(view, memoryAllocationTab);
    // ===And user open memory partition configuration and selects type "flash" with name "smoketest"===
    // ===And assigns it to "Arm Core" with base block "flash" and size "8 KB"===
    // ===Then the partition is created and generated in the Arm Core and verified===
    await createAndVerifyMemoryPartition(view, {
      memoryType: "Flash",
      partitionName: "smoketest",
      coreName: "max32690_arm-cortex-m4f",
      baseBlock: "flash1",
      sizeKB: "8",
    });

    // ===Given user is on generate code screen===
    // ===When user clicks on generate code button===
    await UIUtils.clickElement(view, generateCodeTab);

    // ===And save the files using worksbench commands===
    // ===And the pop up to dismiss overwrite existing files appear===
    // ===And user clicks on overwrite existing files===
    // ===Then the code is generated and verified on UI with generated files===
    await generateCode(view, workbench);

    // ===Persistence Verification of JSON ===
    const fullConfig = await parseJSONFile(getConfigPathForFile(configFile));

    // === Overall cfsconfig structure (order-insensitive arrays) ===
    function deepSortArrays(obj: any): any {
      if (Array.isArray(obj)) {
        return obj
          .map(deepSortArrays)
          .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
      } else if (obj && typeof obj === "object") {
        return Object.fromEntries(
          Object.entries(obj).map(([k, v]) => [k, deepSortArrays(v)]),
        );
      }
      return obj;
    }

    // Drop parts of file that can change over time like timestamp
    const config = deepSortArrays({
      Soc: fullConfig.Soc,
      BoardName: fullConfig.BoardName,
      Package: fullConfig.Package,
      Pins: fullConfig.Pins,
      ClockNodes: fullConfig.ClockNodes,
      Projects: fullConfig.Projects,
      ClockFrequencies: fullConfig.ClockFrequencies,
    });

    const expectedConfig = deepSortArrays({
      Soc: "MAX32690",
      BoardName: "AD-APARD32690-SL",
      Package: "WLP",
      Pins: [
        {
          Pin: "F4",
          Peripheral: "MISC",
          Signal: "CLKEXT",
        },
        {
          Pin: "F8",
          Peripheral: "OWM",
          Signal: "IO",
        },
        {
          Pin: "F9",
          Peripheral: "CAN0",
          Signal: "TX",
        },
        {
          Pin: "G2",
          Peripheral: "OWM",
          Signal: "PE",
        },
        {
          Pin: "G3",
          Peripheral: "CAN1",
          Signal: "TX",
        },
        {
          Pin: "H10",
          Peripheral: "LPTMR0",
          Signal: "CLK",
        },
        {
          Pin: "G9",
          Peripheral: "CAN0",
          Signal: "RX",
        },
        {
          Pin: "L4",
          Peripheral: "CAN1",
          Signal: "RX",
        },
      ],
      ClockNodes: [
        {
          Name: "P3.5",
          Control: "P3_5_FREQ",
          Value: "1000",
          Enabled: true,
        },
        {
          Name: "DMA",
          Control: "ENABLE",
          Value: "TRUE",
          Enabled: true,
        },
        {
          Name: "ERTCO Mux",
          Control: "MUX",
          Value: "ERTCO_CLK",
        },
        {
          Name: "P0.23",
          Control: "P0_23_FREQ",
          Value: "1000",
          Enabled: true,
        },
        {
          Name: "I2S",
          Control: "ENABLE",
          Value: "TRUE",
          Enabled: true,
        },
      ],
      Projects: [
        {
          CoreId: "CM4",
          ProjectId: "max32690_arm-cortex-m4f",
          PluginId: "com.analog.project.zephyr.mock.plugin",
          PluginVersion: "^1.0.0",
          FirmwarePlatform: "zephyr-4.1",
          ExternallyManaged: false,
          PlatformConfig: {
            ProjectName: "m4",
            BuildSystem: "ninja",
            ZephyrBoardName: "max32690evkit/max32690/m4",
            KConfigFlags:
              "# Build for debug (no optimizations) by default\nCONFIG_DEBUG=y\nCONFIG_NO_OPTIMIZATIONS=y\n\n# Enable thread awareness when debugging\nCONFIG_THREAD_NAME=y\nCONFIG_DEBUG_THREAD_INFO=y\nCONFIG_THREAD_ANALYZER=y\n",
            EnableCoreDump: false,
            CMakeArgs:
              "# Include compiler flags to enable source navigation with ELF File Explorer\nzephyr_cc_option(-fstack-usage)\nzephyr_cc_option(-fdump-ipa-cgraph)\nzephyr_cc_option(-gdwarf-4)\n",
          },
          Family: "Cortex-M",
          Ai: {
            FlashSize: 3072,
            RamSize: 1024,
            CoreClock: 120,
            SupportedOps: [],
            AccelOps: [],
            OperatorInfos: [
              {
                Name: "MAC",
                Cycles: 2,
                Energy: 0.17,
              },
            ],
            SupportedDataTypes: [],
          },
          Partitions: [
            {
              Name: "smoketest",
              StartAddress: "0x10300000",
              Size: 8192,
              DisplayUnit: "KB",
              IsOwner: true,
              Access: "R/W/X",
              Config: {
                CHOSEN: "",
                LABEL: "",
              },
            },
          ],
          Peripherals: [
            {
              Name: "MISC",
              Signals: [
                {
                  Name: "CLKEXT",
                  Config: {
                    PWR: "VDDIO",
                  },
                },
                {
                  Name: "PDOWN",
                  Config: {},
                },
                {
                  Name: "RSTN",
                  Config: {},
                },
                {
                  Name: "SQWOUT",
                  Config: {},
                },
                {
                  Name: "SWDCLK",
                  Config: {},
                },
                {
                  Name: "SWDIO",
                  Config: {},
                },
              ],
              Config: {},
            },
            {
              Name: "CAN0",
              Signals: [
                {
                  Name: "RX",
                  Config: {
                    PWR: "VDDIO",
                  },
                },
                {
                  Name: "TX",
                  Config: {
                    PWR: "VDDIO",
                  },
                },
              ],
              Config: {},
            },
          ],
        },
        {
          CoreId: "RV",
          ProjectId: "max32690_risc-v",
          PluginId: "com.analog.project.msdk.mock.plugin",
          PluginVersion: "^1.1.0",
          FirmwarePlatform: "msdk",
          ExternallyManaged: false,
          PlatformConfig: {
            ProjectName: "riscv",
            Cflags: "",
          },
          Family: "RISC-V",
          Partitions: [],
          Peripherals: [
            {
              Name: "RV mtime",
              Signals: [],
              Config: {
                ENABLE: "FALSE",
              },
            },
            {
              Name: "CAN1",
              Signals: [
                {
                  Name: "RX",
                  Config: {
                    PWR: "VDDIO",
                  },
                },
                {
                  Name: "TX",
                  Config: {
                    PWR: "VDDIO",
                  },
                },
              ],
              Config: {
                AFM: "DUAL",
                TSEG1: "1",
                TSEG2: "1",
                SJW: "0",
                DOR_IE: "FALSE",
                BERR_IE: "FALSE",
                TX_IE: "FALSE",
                RX_IE: "FALSE",
                ERPSV_IE: "FALSE",
                ERWARN_IE: "FALSE",
                AL_IE: "FALSE",
                WU_IE: "FALSE",
                RX_THD_IE: "FALSE",
                RX_TO_IE: "FALSE",
                BITRATE: "500000",
                UNIT_CB: "",
                OBJ_CB: "",
                FILTER_ID_LENGTH_DUAL_1: "STD",
                FILTER_TYPE_DUAL_1: "EXACT",
                FILTER_ID_DUAL_1: "0x0",
                FILTER_ID_LENGTH_DUAL_2: "STD",
                FILTER_TYPE_DUAL_2: "EXACT",
                FILTER_ID_DUAL_2: "0x0",
              },
            },
          ],
        },
      ],
      ClockFrequencies: {
        SYS_CLK_DIV_2: 60000000,
        "P0.23": 1000,
        LPTMR0_CLK: 1000,
        "Cortex-M4": 120000000,
        "FLC0/1": 120000000,
        SYS_OSC: 120000000,
        SYS_CLK: 120000000,
        IPO: 120000000,
        PCLK: 60000000,
        DMA: 120000000,
        I2S: 60000000,
        "I2S-CONTROLLER": 0,
      },
    });

    console.log("Actual config:");
    console.log(config);

    // ===Peripheral with Pins verification derived from expectedConfig===
    console.log("Verifying peripherals in cfsconfig.");
    const expectedPeripherals = (expectedConfig.Projects ?? []).flatMap(
      (project: any) => project.Peripherals ?? [],
    );
    expect(
      (config.Projects ?? []).flatMap(
        (project: any) => project.Peripherals ?? [],
      ),
      "Peripherals did not persist correctly",
    ).to.eql(expectedPeripherals);

    // ===Memory partition verification derived from expectedConfig===
    console.log("Verifying partitions in cfsconfig");
    const expectedPartitionsData = (expectedConfig.Projects ?? []).flatMap(
      (project: any) => project.Partitions ?? [],
    );
    expect(
      (config.Projects ?? []).flatMap(
        (project: any) => project.Partitions ?? [],
      ),
      "Partition data does not match expected configuration",
    ).to.deep.equal(expectedPartitionsData);

    // ===Pins verification derived from expectedConfig===
    console.log("Verifying pin configuration");
    expect(
      config.Pins ?? [],
      "Pin configuration does not match expected values",
    ).to.deep.equal(expectedConfig.Pins);

    // ===Clock config verification derived from expectedConfig===
    console.log("Verifying clock node configuration");
    expect(
      config.ClockNodes ?? [],
      "Clock nodes configuration does not match expected values",
    ).to.deep.equal(expectedConfig.ClockNodes);

    // ===Clock Frequencies verification derived from expectedConfig===
    console.log("Verifying clock frequencies");
    expect(
      getClockFrequencies(config),
      "Clock frequencies do not match expected values",
    ).to.deep.equal(getClockFrequencies(expectedConfig));

    console.log("Verifying cfsconfig in entirety (order-insensitive arrays)");
    expect(
      config,
      "CFS config structure is not correct (order-insensitive arrays)",
    ).to.deep.equal(expectedConfig);
  }).timeout(300000);
});
