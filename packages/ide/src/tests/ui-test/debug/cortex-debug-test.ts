/* eslint-disable no-template-curly-in-string */
/**
 *
 * Copyright (c) 2023-2024 Analog Devices, Inc.
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

/*
 * The purpose of this test is to ensure that the appropriate CFS settings are included in the Cortex Debug Configuration.
 * The test functions by importing an MAX78000 project into the VSCode workspace.
 * The cortex debugger is configured.
 * The cortex debug configuration that is placed in the launch.json file is then compared against the desired cortex debug configuration.
 * if the configurations match, then the test should pass.
 */

import { expect } from "chai";
import * as fs from "fs";
import { isEqual } from "lodash";
import { setTimeout } from "timers/promises";
import { InputBox, Workbench } from "vscode-extension-tester";

import { configureWorkspace } from "../../ui-test-utils/activation-utils";
import {
  closeFolder,
  closeWindows,
  deleteFile,
  deleteFolder,
  openFolder,
} from "../../ui-test-utils/file-utils";

// Test cortex debug configuration
describe("Cortex Debug Configuration Test", () => {
  let workbench: Workbench;
  const testDirectory = "src/tests/ui-test/data/Hello_World";

  before(async () => {
    await closeFolder();
    await openFolder(process.cwd() + "/" + testDirectory);
    // Delete the .vscode folder to remove any settings
    deleteFolder(testDirectory + "/.vscode");
    workbench = new Workbench();
    // Give the extension some time to activate
    await workbench.getDriver().sleep(10000);
    await configureWorkspace("Yes");
    await workbench.getDriver().sleep(10000);
    await closeWindows();
  });

  afterEach(async () => {
    await closeWindows();
  });

  it("Checking for CFS Cortex Debug Configuration", async () => {
    // Delete the .vscode folder to remove any settings
    await deleteFile(testDirectory + "/.vscode/launch.json");
    await workbench.getDriver().sleep(10000);
    // Select "Add Configuration"
    await workbench.executeCommand("Debug: Add Configuration...");
    const input = await InputBox.create();
    // Select Cortex Debug Configuration
    await input.selectQuickPick("Cortex Debug");
    // Wait for the task to complete
    await setTimeout(10000);
    // Get json launch file text containing cortex debug configuration
    const jsonFileLocation = testDirectory + "/.vscode/launch.json";
    // If file is not found produce an error
    if (!fs.existsSync(jsonFileLocation)) {
      console.error("File not found");
    }

    const rawLaunchJsonContent = fs.readFileSync(jsonFileLocation, "utf8");
    // Remove comments from JSON file
    const filteredLaunchJsonContent = rawLaunchJsonContent.replace(
      /\/\/.*/g,
      "",
    );
    const launchJsonContent: {
      configurations: object;
    } = JSON.parse(filteredLaunchJsonContent);

    // Desired cortex debug configuration
    const expectedContent = {
      version: "0.2.0",
      configurations: [
        {
          name: "Cortex Debug",
          cwd: "${workspaceFolder}",
          executable: "./bin/executable.elf",
          request: "launch",
          type: "cortex-debug",
          runToEntryPoint: "main",
          servertype: "jlink",
        },
        CortexDebugConfig,
      ],
    };

    const isJsonEqual = isEqual(
      launchJsonContent.configurations,
      expectedContent.configurations,
    );
    expect(
      isJsonEqual,
      "Launch configuration does not match the expected results.",
    ).to.equal(true);
  });
});

const CortexDebugConfig = {
  name: "CFS: Debug with GDB and OpenOCD (Arm Embedded)",
  executable: "${config:cfs.programFile}",
  cwd: "${command:cfs.setDebugPath}",
  request: "launch",
  type: "cortex-debug",
  runToEntryPoint: "main",
  showDevDebugOutput: "both",
  servertype: "openocd",
  serverpath: "${config:cfs.openocd.path}/bin/openocd",
  linux: {
    gdbPath: "${config:cfs.toolchain.armAArch32GCC.path}/bin/arm-none-eabi-gdb",
  },
  windows: {
    gdbPath:
      "${config:cfs.toolchain.armAArch32GCC.path}/bin/arm-none-eabi-gdb.exe",
  },
  osx: {
    gdbPath: "${config:cfs.toolchain.armAArch32GCC.path}/bin/arm-none-eabi-gdb",
  },
  svdPath: "${command:cfs.cmsis.selectSvdFile}",
  searchDir: ["${command:cfs.cmsis.selectCmsisPack}/openocd/scripts"],
  configFiles: [
    "${command:cfs.openocd.selectInterface}",
    "${command:cfs.openocd.selectTarget}",
  ],
  gdbTarget: "localhost:3333",
  preLaunchCommands: [
    "set logging overwrite on",
    "set logging file debug-arm.log",
    "set logging on",
    "set remotetimeout 60",
    "tbreak abort",
    "tbreak _fatal_error",
    "tbreak _exit",
  ],
  preLaunchTask: "CFS: build",
};
