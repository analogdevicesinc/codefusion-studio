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

import { INFO } from "../../../messages";
import { configureWorkspace } from "../../ui-test-utils/activation-utils";
import {
  closeFolder,
  closeWindows,
  deleteFolder,
  openFolder,
} from "../../ui-test-utils/file-utils";
import { getNotificationByMessage } from "../../ui-test-utils/view-utils";

const testDirectory = "src/tests/ui-test/data/Hello_World";

describe("Extension Activation Tests", () => {
  beforeEach(async () => {
    await closeFolder();
    deleteFolder(testDirectory + "/.vscode");
    await new Workbench().getDriver().sleep(1000);
  });

  afterEach(async () => {
    await closeWindows();
  });

  it("Do not prompt activation without folder", async () => {
    const notification = await getNotificationByMessage(
      INFO.configureWorkspace
    );
    expect(
      notification,
      "Did not expect to find CFS configure workspace notification"
    ).to.be.null;
  });

  it("Do not activate without prompt", async () => {
    await openFolder(process.cwd() + "/" + testDirectory);
    const workbench = new Workbench();
    await workbench.getDriver().sleep(5000);
    await configureWorkspace();
    // verify no settings have been applied
    verifyAdiSettingsNotApplied();
  });

  it("Do not activate after prompt 'No'", async () => {
    await openFolder(process.cwd() + "/" + testDirectory);
    await new Workbench().getDriver().sleep(5000);
    await configureWorkspace("No");
    // verify no settings have been applied
    verifyAdiSettingsNotApplied();
  });

  it("Do not activate after prompt 'Never'", async () => {
    await openFolder(process.cwd() + "/" + testDirectory);
    await new Workbench().getDriver().sleep(5000);
    await configureWorkspace("Never");
    await closeFolder();
    await openFolder(process.cwd() + "/" + testDirectory);
    await new Workbench().getDriver().sleep(5000);
    const notification = await getNotificationByMessage(
      INFO.configureWorkspace
    );
    expect(
      notification,
      "Did not expect to find CFS configure workspace notification"
    ).to.be.null;
  });

  it("Activate after prompt 'Yes'", async () => {
    await openFolder(process.cwd() + "/" + testDirectory);
    const workbench = new Workbench();
    await workbench.getDriver().sleep(5000);
    await configureWorkspace("Yes");
    await workbench.getDriver().sleep(5000);
    const notification = await getNotificationByMessage(
      INFO.workspaceConfigured
    );
    expect(
      notification,
      "Expected to find CFS workspace configured notification"
    ).to.not.be.null;
  });
});

/**
 * Verify the CFS settings have not been applied,
 * confirming that the workspace has not been configured
 */
function verifyAdiSettingsNotApplied() {
  expect(
    existsSync(testDirectory + "/.vscode/settings.json"),
    "Did not expect to find settings.json"
  ).to.be.false;
}
