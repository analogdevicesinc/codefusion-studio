/**
 *
 * Copyright (c) 2023 Analog Devices, Inc.
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
 * These tests cover building projects.
 */

import { expect } from "chai";
import { existsSync } from "fs";
import { InputBox, Workbench } from "vscode-extension-tester";

import { configureWorkspace } from "../../ui-test-utils/activation-utils";
import {
  closeFolder,
  closeWindows,
  deleteFolder,
  openFolder,
} from "../../ui-test-utils/file-utils";
import { getTerminalViewText } from "../../ui-test-utils/view-utils";

/**
 * Test building a simple helloworld project
 */
describe("Build Project Test", () => {
  let workbench: Workbench;
  const testDirectory = "src/tests/ui-test/data/Hello_World";

  before(async () => {
    await closeFolder();

    // Delete the .vscode folder to remove any settings
    deleteFolder(testDirectory + "/.vscode");

    await openFolder(process.cwd() + "/" + testDirectory);

    workbench = new Workbench();

    // Give the extension some time to activate
    await workbench.getDriver().sleep(5000);
    await configureWorkspace("Yes");
    await workbench.getDriver().sleep(10000);
    await closeWindows();
  });

  afterEach(async () => {
    await closeWindows();
  });

  it("Build for MAX32655", async () => {
    await workbench.executeCommand("Tasks: Run Build Task");
    await workbench.getDriver().sleep(5000);
    let input = await InputBox.create();
    let picks = await input.getQuickPicks();
    await workbench.getDriver().sleep(5000);

    if (
      (await input.getPlaceHolder()) === "Select the toolchain to build with"
    ) {
      await input.selectQuickPick("arm-none-eabi");
      // Prime the input for the make task
      input = await InputBox.create();
      picks = await input.getQuickPicks();
    }

    // These are the expected options when there aren't any cmake extensions installed
    const expected = [
      "CFS: build\ndetected tasks",
      "CFS: clean",
      "CFS: clean-periph",
      "CFS: erase flash",
      "CFS: flash",
      "CFS: flash & run",
    ];
    const texts = await Promise.all(picks.map((item) => item.getText()));
    for (const [i, text] of texts.entries()) {
      expect(text).to.equal(expected[i]);
    }

    // Clean
    await input.selectQuickPick("CFS: clean");
    // Wait for the task to complete
    await workbench.getDriver().sleep(10000);
    // Verify the build output has been deleted
    expect(existsSync(testDirectory + "/build")).to.equal(false);
    // Build all
    await workbench.executeCommand("Tasks: Run Build Task");
    await workbench.getDriver().sleep(5000);
    input = await InputBox.create();
    await input.selectQuickPick("CFS: build");
    // Wait for the task to complete
    await workbench.getDriver().sleep(10000);
    // Verify the build succeeded
    const text = await getTerminalViewText();
    expect(text).to.not.equal("");
    const error = text.match(".*[Ee]rror.*");
    expect(error, "Unexpected error during build:\n" + text).to.equal(null);
    // Verify the build output exists
    expect(existsSync(testDirectory + "/build/Hello_World.elf")).to.equal(true);
  });
});
