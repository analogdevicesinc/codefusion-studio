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

/**
 * The purpose of this test case is to verify that the user is notified and prompted when the sdk path is missing.
 * The test case functions by opening the helloworld project folder located in the ui-test/data directory, configures the workspace and attempts to run build task.
 * If the sdk path is missing, the user is prompted with a notification to select the sdk path. If the sdk path is present, the user is not prompted. Thus, this is the pass/fail criteria.
 * The pass fail criteria is implemented using the chai assertion "expect".
 * The test case can be run as a standard ui-test via the terminal or Run and Debug (Debug UI Test).
 */

import { expect } from "chai";
import { Workbench } from "vscode-extension-tester";

import { configureWorkspace } from "../../ui-test-utils/activation-utils";
import {
  closeFolder,
  closeWindows,
  deleteFolder,
  openFolder,
} from "../../ui-test-utils/file-utils";
import { selectQuickPick } from "../../ui-test-utils/settings-utils";

// Test user setting prompt for missing sdk path
describe("SDK Path User Setting Prompt Test", () => {
  let workbench: Workbench;
  const testDirectory = "src/tests/ui-test/data/Hello_World";

  beforeEach(async () => {
    await closeFolder();
    deleteFolder(testDirectory + "/.vscode");
    await openFolder(process.cwd() + "/" + testDirectory);
    workbench = new Workbench();
    await workbench.getDriver().sleep(10000);
    await configureWorkspace("Yes");
    await workbench.getDriver().sleep(5000);
  });

  afterEach(async () => {
    await closeWindows();
  });

  it("Prompt User to Select SDK Path", async () => {
    await workbench.getDriver().sleep(10000);
    await selectQuickPick(`.*0.9.1`).then(async (sdkPath: string) => {
      expect(sdkPath).not.equal("");
    });
  });
});
