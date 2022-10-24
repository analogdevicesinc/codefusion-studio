/**
 *
 * Copyright (c) 2024 Analog Devices, Inc.
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
 * These tests cover building zephyr projects.
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
 * Test building a MAX32690 zephyr project
 */
describe("Zephyr Build Task Test", () => {
  let workbench: Workbench;
  const testDirectory = "src/tests/ui-test/data/Hello_World_CFS";

  before(async () => {
    await closeFolder();

    // delete the .vscode folder to remove any settings
    deleteFolder(testDirectory + "/.vscode");

    await openFolder(process.cwd() + "/" + testDirectory);

    workbench = new Workbench();

    // give the extension some time to activate
    await workbench.getDriver().sleep(15000);
    await closeWindows();
  });

  afterEach(async () => {
    await closeWindows();
  });

  it 
  it("Zephyr Build Project Test", async () => {
    await workbench.executeCommand("Tasks: Run Build Task");
    await workbench.getDriver().sleep(5000);
    let input = await InputBox.create();
    let picks = await input.getQuickPicks();
    await workbench.getDriver().sleep(5000);

    // These are the expected options when there aren't any cmake extensions installed
    const expected = [
      "CFS (Zephyr): build",
      "CFS (Zephyr): clean",
      "CFS (Zephyr): pristine build",
      "CFS (Zephyr): flash",
    ];

    // Checking if the Zephyr related build tasks are loaded
    for (const [i, item] of picks.entries()) {
      const text = await item.getText();
      expect(text).to.contains(expected[i]);
    }

    // Load Build tasks
    await workbench.executeCommand("Tasks: Run Build Task");
    await workbench.getDriver().sleep(5000);
    input = await InputBox.create();
    
    //Select Build task
    await input.selectQuickPick("CFS (Zephyr): build");
    // wait for the task to complete
    await workbench.getDriver().sleep(30000);

    // verify the build succeeded
    const text = await getTerminalViewText();
    expect(text).to.not.be.empty;
    const error = text.match("^([Ee]rror|[Ff]atal\s[Ee]rror)$");
    expect(error, `Error while running task 'CFS (Zephyr): build'.\n${text}`).to.be.null;
    
    //verifying the build folder exists
    expect(existsSync(testDirectory + "/build")).to.be.true;
  });
});
