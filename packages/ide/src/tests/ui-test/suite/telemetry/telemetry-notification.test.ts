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
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  ActivityBar,
  By,
  Notification,
  NotificationType,
  VSBrowser,
  Workbench,
} from "vscode-extension-tester";

/** Name of the CFS view container in the activity bar */
const CFS_VIEW_CONTAINER = "CodeFusion Studio";

/** The settings.json VS Code reads: ExTester copies the settings file here at launch, so editing the source file has no effect. */
const userSettingsPath = () =>
  path.join(
    process.env.TEST_RESOURCES ?? path.join(os.tmpdir(), "test-resources"),
    "settings",
    "User",
    "settings.json",
  );

interface NotificationData {
  message: string;
  buttons: string[];
}

/** Reads each notification into plain data straight away, because the elements go stale between awaits. */
async function readNotifications(
  notifications: Notification[],
): Promise<NotificationData[]> {
  const result: NotificationData[] = [];
  for (const notification of notifications) {
    try {
      // Center items can render collapsed, which hides buttons and link text from getText(); expand first (no-op if already expanded).
      await notification.expand();
      const message = await notification.getMessage();

      const buttonElements = await notification.findElements(
        By.css("a[role='button']"),
      );

      const buttons = (
        await Promise.all(
          buttonElements.map((button) => button.getAttribute("textContent")),
        )
      )
        .map((title) => (title ?? "").trim())
        .filter((title) => title.length > 0);
      result.push({ message, buttons });
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === "StaleElementReferenceError"
      ) {
        continue;
      }
      throw error;
    }
  }
  return result;
}

/**
 * Test the telemetry opt-in notification
 */
describe("Telemetry notification", () => {
  let originalSettingsRaw: string | undefined;

  before(async function () {
    this.timeout(120000);

    // The prompt only shows when cfs.telemetry.enable is unset and is decided once at activation: drop the key, then reload to re-activate.
    originalSettingsRaw = await fs.promises.readFile(
      userSettingsPath(),
      "utf-8",
    );
    const settingsObj = JSON.parse(originalSettingsRaw) as Record<
      string,
      unknown
    >;
    delete settingsObj["cfs.telemetry.enable"];
    await fs.promises.writeFile(
      userSettingsPath(),
      JSON.stringify(settingsObj, null, 2),
      "utf-8",
    );
    await new Workbench().executeCommand("Developer: Reload Window");
    await VSBrowser.instance.waitForWorkbench();

    // Given: open the CFS view container, which triggers activation if not already active
    const cfsViewControl = await new ActivityBar().getViewControl(
      CFS_VIEW_CONTAINER,
    );
    expect(cfsViewControl, "CFS icon not found in activity bar").to.not.be
      .undefined;
    await cfsViewControl?.openView();
  });

  after(async () => {
    // Put the shared default back so later test files see telemetry disabled again.
    if (originalSettingsRaw !== undefined) {
      await fs.promises.writeFile(
        userSettingsPath(),
        originalSettingsRaw,
        "utf-8",
      );
      await new Workbench().executeCommand("Developer: Reload Window");
      await VSBrowser.instance.waitForWorkbench();
    }
  });

  afterEach(async () => {
    const workbench = new Workbench();
    await workbench.executeCommand("workbench.action.closeAllEditors");
    await workbench.executeCommand("workbench.action.closeFolder");
    await VSBrowser.instance.waitForWorkbench();
  });

  it("Prompts for telemetry consent", async () => {
    const workbench = new Workbench();
    // A notification stays in the center until dismissed, so unlike a toast it can't vanish between polls.
    const center = await workbench.openNotificationsCenter();
    let prompt: NotificationData | undefined;

    try {
      await workbench.getDriver().wait(
        async () => {
          const notifications = await readNotifications(
            await center.getNotifications(NotificationType.Any),
          );
          // Buttons present means the notification has finished rendering.
          prompt = notifications.find(
            (notification) =>
              notification.message.includes("diagnostic and usage data") &&
              notification.buttons.length > 0,
          );
          return prompt !== undefined;
        },
        15000,
        "Telemetry notification not found",
      );
    } finally {
      await center.close();
    }

    // Logged before the assertions so it prints even when they fail.
    console.log(
      `TELEMETRY NOTIFICATION message: ${JSON.stringify(prompt?.message)}`,
    );
    console.log(
      `TELEMETRY NOTIFICATION buttons: ${JSON.stringify(prompt?.buttons)}`,
    );

    // getText() sometimes omits the "Privacy Policy" link text (seen on CI even when expanded), so ignore it on both sides.
    const withoutLinkText = (text: string | undefined) =>
      text?.replace(/view our\s*(Privacy Policy)?\s*\./, "view our .");
    expect(withoutLinkText(prompt?.message)).to.equal(
      withoutLinkText(
        "CodeFusion Studio collects diagnostic and usage data, including tool version, operating system, command categories, performance metrics, and error codes, to improve usability and performance. A randomly generated usage identifier is stored locally to link your sessions. No source code, file paths, credentials, or personal details are collected. To distinguish ADI-internal from external use, CodeFusion Studio checks locally whether you are signed in to myAnalog with an ADI account or using an ADI-managed computer; only the result is shared. You can change your data collection preference at any time by opening Settings and searching for 'CFS Telemetry'. To learn more, view our Privacy Policy.",
      ),
    );
    expect(prompt?.buttons).to.include.members([
      "Don't Share Data",
      "Share Data",
    ]);
  });
});
