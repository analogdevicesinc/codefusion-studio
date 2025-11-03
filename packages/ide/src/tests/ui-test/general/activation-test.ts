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
 * These tests cover the extension activation / workspace configuration scenarios.
 */

import { expect } from "chai";
import { existsSync } from "fs";
import { Workbench } from "vscode-extension-tester";
import { until } from "selenium-webdriver";

import { INFO } from "../../../messages";
import { configureWorkspace } from "../../ui-test-utils/activation-utils";
import {
  closeFolder,
  closeWindows,
  deleteFolder,
  openFolder,
} from "../../ui-test-utils/file-utils";
import { getNotificationByMessage } from "../../ui-test-utils/view-utils";
import { Locatorspaths } from "../build/pageobjects";

const testDirectory = "src/tests/ui-test/data/Hello_World";
const locatorspath = new Locatorspaths();

// These are too flaky to run at the moment. Re-enabling is tracked by CFSIO-7173
xdescribe("Extension Activation Tests", () => {
  beforeEach(async () => {
    await closeFolder();
    deleteFolder(testDirectory + "/.vscode");
    await new Workbench().getDriver().sleep(20000);
  });

  afterEach(async () => {
    await closeWindows();
  });

  it("Do not prompt activation without folder", async () => {
    const notification = await getNotificationByMessage(
      INFO.configureWorkspace,
    );
    expect(
      notification,
      "Did not expect to find CFS configure workspace notification",
    ).to.equal(null);
  });

  it("Do not activate without prompt", async () => {
    await closeFolder();
    // Delete the .vscode folder to remove any settings
    deleteFolder(testDirectory + "/.vscode");
    await openFolder(process.cwd() + "/" + testDirectory);
    const workbench = new Workbench();
    const driver = workbench.getDriver();
    console.log("Waiting for prompt to be located");
    await driver.wait(
      until.elementLocated(locatorspath.CFSNotification),
      20000,
    );
    await configureWorkspace();
    // Verify no settings have been applied
    verifyAdiSettingsNotApplied();
  });

  it("Do not activate after prompt 'No'", async () => {
    await openFolder(process.cwd() + "/" + testDirectory);
    await new Workbench().getDriver().sleep(10000);
    await configureWorkspace("No");
    // Verify no settings have been applied
    verifyAdiSettingsNotApplied();
  });

  it("Do not activate after prompt 'Never'", async () => {
    await openFolder(process.cwd() + "/" + testDirectory);
    await new Workbench().getDriver().sleep(10000);
    await configureWorkspace("Never");
    await closeFolder();
    await openFolder(process.cwd() + "/" + testDirectory);
    await new Workbench().getDriver().sleep(5000);
    const notification = await getNotificationByMessage(
      INFO.configureWorkspace,
    );
    expect(
      notification,
      "Did not expect to find CFS configure workspace notification",
    ).to.equal(null);
  });

  it("Activate after prompt 'Yes'", async () => {
    await openFolder(process.cwd() + "/" + testDirectory);
    const workbench = new Workbench();
    await workbench.getDriver().sleep(25000);
    await configureWorkspace("Yes");
    await workbench.getDriver().sleep(20000);
    const notification = await getNotificationByMessage(
      INFO.workspaceConfigured,
    );
    expect(
      notification,
      "Expected to find CFS workspace configured notification",
    ).to.not.equal(null);
  });
});

/**
 * Verify the CFS settings have not been applied,
 * confirming that the workspace has not been configured
 */
function verifyAdiSettingsNotApplied() {
  expect(
    existsSync(testDirectory + "/.vscode/settings.json"),
    "Did not expect to find settings.json",
  ).to.equal(false);
}
