/**
 *
 * Copyright (c) 2026 Analog Devices, Inc.
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
import { cpSync, mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import * as path from "path";
import { ActivityBar, VSBrowser, Workbench } from "vscode-extension-tester";

import { getExtensionActivationStats } from "../../../ui-test-utils/startup-performance-utils";
import { UIUtils } from "../../../ui-test-utils/ui-utils";

/** Maximum accepted activation time of the CFS extension in milliseconds */
const STARTUP_TIME_THRESHOLD_MS = 2000;

/** Id of the CFS extension as shown in the startup performance report */
const CFS_EXTENSION_ID = "analogdevices.cfs-ide";

/** Name of the CFS view container in the activity bar */
const CFS_VIEW_CONTAINER = "CodeFusion Studio";

/** Name of the CFS workspace fixture opened for the measurement */
const WORKSPACE_NAME = "cfs-startup-workspace";

/** Source of the CFS workspace fixture, relative to the runner cwd (packages/ide) */
const WORKSPACE_FIXTURE_DIR = path.resolve(
  "src",
  "tests",
  "ui-test",
  "data",
  WORKSPACE_NAME,
);

/*
 * Feature: Extension Startup Performance
 *     As a CodeFusion Studio developer
 *     I want the activation time of the extension to be measured
 *     So that startup regressions can be detected
 *
 * Background:
 *     Given VS Code is open with the CodeFusion Studio extension installed
 *     And no myAnalog session is available
 *     And a copy of a CFS workspace has been opened, restarting the window
 */

/*
 * NOTE: This measures a logged-out startup. CI has no myAnalog session, so
 * activation skips the token refresh and the authenticated CCM requests that
 * a logged-in user pays for, and the measured time is lower than for them.
 * The session file is shared with the CLI and lives outside the VS Code
 * profile (see CFS_SESSION_FILE), so a local run by a logged-in developer
 * does include authentication.
 *
 * TODO: Add a flag for manual runs (e.g. CFS_STARTUP_WITH_AUTH=1) that uses
 * the local session, fails if not logged in, and reports the times
 * separately from this logged-out baseline.
 */

describe("Extension Startup Performance Tests", function () {
  let workspaceCopyDir: string;

  before(async function () {
    this.timeout(120000);

    // Work on a temporary copy, as the extension writes files into the workspace
    workspaceCopyDir = mkdtempSync(path.join(tmpdir(), `${WORKSPACE_NAME}-`));
    cpSync(WORKSPACE_FIXTURE_DIR, workspaceCopyDir, { recursive: true });

    // Opening the workspace reloads the window, so the startup performance
    // report reflects an extension startup inside a CFS workspace
    const browser = VSBrowser.instance;
    await browser.openResources(
      path.join(workspaceCopyDir, `${WORKSPACE_NAME}.code-workspace`),
      async () => {
        await browser.driver.wait(
          async () =>
            (await browser.driver.getTitle()).includes(WORKSPACE_NAME),
          60000,
          `Workspace ${WORKSPACE_NAME} was not opened`,
        );
      },
    );
  });

  after(async function () {
    this.timeout(120000);
    await new Workbench().executeCommand("workbench.action.closeAllEditors");
    await new Workbench().executeCommand("workbench.action.closeFolder");
    await VSBrowser.instance.waitForWorkbench();
    rmSync(workspaceCopyDir, { recursive: true, force: true });
  });

  /*
   * Scenario: Log the activation time of the CFS extension
   *     Given the CodeFusion Studio view container is opened to ensure activation
   *     When I run the "Developer: Startup Performance" command
   *     Then the "Extension Activation Stats" table contains a row for the CFS extension
   *     And the activation times are logged
   *     And the total activation time is below the threshold
   */
  it("Should report the activation time of the CFS extension @smoke", async function () {
    this.timeout(120000);

    // Given: open the CFS view container, which triggers activation if not already active
    const cfsViewControl = await new ActivityBar().getViewControl(
      CFS_VIEW_CONTAINER,
    );
    expect(cfsViewControl, "CFS icon not found in activity bar").to.not.be
      .undefined;
    await cfsViewControl?.openView();
    await UIUtils.sleep(2000);

    // When / Then: read the activation stats from the startup performance report
    const stats = await getExtensionActivationStats(
      new Workbench(),
      CFS_EXTENSION_ID,
      60000,
    );

    expect(
      Number.isFinite(stats.totalMs),
      `Activation time of ${CFS_EXTENSION_ID} could not be parsed`,
    ).to.be.true;

    // And: log the activation times
    console.log(
      `${CFS_EXTENSION_ID} activation: total ${stats.totalMs} ms ` +
        `(load code ${stats.loadCodeMs} ms, call activate ${stats.callActivateMs} ms, ` +
        `finish activate ${stats.finishActivateMs} ms, ` +
        `event "${stats.event}", eager ${stats.eager})`,
    );

    // And: check the total activation time against the threshold
    expect(
      stats.totalMs,
      `Activation time of ${CFS_EXTENSION_ID} exceeds the ${STARTUP_TIME_THRESHOLD_MS} ms threshold. ` +
        "Investigate the regression or raise STARTUP_TIME_THRESHOLD_MS if the increase is expected",
    ).to.be.below(STARTUP_TIME_THRESHOLD_MS);
  });
});
