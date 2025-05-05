/**
 *
 * Copyright (c) 2023-2025 Analog Devices, Inc.
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

import * as clipboard from "clipboardy";
import { platform } from "node:process";
import {
  BottomBarPanel,
  Notification,
  NotificationType,
  TitleBar,
  Workbench,
} from "vscode-extension-tester";

/**
 * Copy the currently selected text and return it in a promise.
 * @returns a promise containing the text
 */
export async function copyText(): Promise<string> {
  // copy the text to the clipboard
  const titleBar = new TitleBar();
  await titleBar.select("Edit", "Copy");
  // read the text from the clipboard
  const text = clipboard.read();
  // clear the clipboard
  clipboard.write("");
  return text;
}

/**
 * Get the Terminal View's text contents
 * @returns a promise containing the Terminal View's text
 */
export async function getTerminalViewText(): Promise<string> {
  // open the terminal view
  const terminalView = await new BottomBarPanel();
  if (platform === "win32") {
    const workbench = new Workbench();
    // select all text
    await workbench.executeCommand("terminal select all");
    await workbench.getDriver().sleep(500);
    const text = await copyText();
    return text;
  }

  const text = await terminalView.getText();
  return text;
}

/**
 * Return the notification containing the given message
 * @param message - The message to search for
 * @returns A promise containing the Notification, or null if not found.
 */
export async function getNotificationByMessage(
  message: string
): Promise<Notification | null> {
  const notificationCenter = await new Workbench().openNotificationsCenter();
  const notifications = await notificationCenter.getNotifications(
    NotificationType.Info
  );

  for (const notification of notifications) {
    const foundMessage = await notification.getMessage();
    if (foundMessage === message) {
      return notification;
    }
  }

  return null;
}
