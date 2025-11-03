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

import { expect } from "chai";
import * as fs from "fs";
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
import { getTerminalViewText } from "../../ui-test-utils/view-utils";

describe("GDB Toolbox Panel Integration Test", () => {
  let workbench: Workbench;
  const testDirectory = "src/tests/ui-test/data/Hello_World";

  before(async () => {
    await closeFolder();
    deleteFolder(testDirectory + "/.vscode");
    await openFolder(process.cwd() + "/" + testDirectory);
    workbench = new Workbench();
    await workbench.getDriver().sleep(5000);
    await configureWorkspace("Yes");
    await workbench.getDriver().sleep(10000);
    await closeWindows();
  });

  afterEach(async () => {
    // Attempt to terminate any running debug session
    try {
      await workbench.executeCommand("Debug: Stop");
      await workbench.getDriver().sleep(2000);
    } catch (e) {
      // Ignore errors if no debug session is running
      console.log(
        "No debug session to stop or encountered error stopping it:",
        e,
      );
    }

    await closeWindows();
    deleteFolder(testDirectory + "/build");
  });

  it("Should add Cortex Debug config, build, launch debug, and open GDB Toolbox", async () => {
    // Ensure launch.json is removed
    await deleteFile(testDirectory + "/.vscode/launch.json");
    await workbench.getDriver().sleep(2000);

    // Add Cortex Debug configuration
    await workbench.executeCommand("Debug: Add Configuration...");
    let input = await InputBox.create();
    await input.selectQuickPick("Cortex Debug");
    await setTimeout(5000);

    // Check that launch.json exists
    const jsonFileLocation = testDirectory + "/.vscode/launch.json";
    expect(fs.existsSync(jsonFileLocation), "launch.json not found").to.equal(
      true,
    );

    // Build the project
    await workbench.executeCommand("Tasks: Run Build Task");
    await workbench.getDriver().sleep(5000);
    input = await InputBox.create();
    if (
      (await input.getPlaceHolder()) === "Select the toolchain to build with"
    ) {
      await input.selectQuickPick("arm-none-eabi");
      input = await InputBox.create();
    }

    await input.selectQuickPick("CFS: build");
    await workbench.getDriver().sleep(15000);

    // Check build output
    const buildText = await getTerminalViewText();
    expect(buildText).to.not.equal("");
    const error = buildText.match(".*[Ee]rror.*");
    expect(error, "Unexpected error during build:\n" + buildText).to.equal(
      null,
    );
    expect(fs.existsSync(testDirectory + "/build/Hello_World.elf")).to.equal(
      true,
    );

    // Launch debug session
    await workbench.executeCommand("Debug: Start Debugging");
    await workbench.getDriver().sleep(10000);

    // Check if GDB Toolbox view is open under "Run and Debug"
    const activityBar = workbench.getActivityBar();
    const runAndDebugView = await activityBar.getViewControl("Run and Debug");
    await runAndDebugView?.openView(); // Ensure the view is open

    // Now check for the GDB Toolbox panel inside the Run and Debug view
    const sideBar = workbench.getSideBar();
    const gdbToolboxView = await sideBar.getContent().getSection("GDB Toolbox");
    const isOpen = await gdbToolboxView.isExpanded();
    expect(
      isOpen,
      "GDB Toolbox view is not open after starting debug session",
    ).to.equal(true);
  });
});
