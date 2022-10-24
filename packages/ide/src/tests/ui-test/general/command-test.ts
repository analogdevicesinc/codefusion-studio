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
 * These tests cover commands added by the extension.
 */

import { expect } from "chai";
import { platform } from "node:process";
import { InputBox, Workbench } from "vscode-extension-tester";

import { SELECT_SDK_PATH_COMMAND_ID } from "../../../commands/constants";
import { configureWorkspace } from "../../ui-test-utils/activation-utils";
import {
  closeFolder,
  closeWindows,
  deleteFolder,
  openFolder,
} from "../../ui-test-utils/file-utils";

describe("Command Tests", () => {
  const testDirectory = "src/tests/ui-test/data/Hello_World";
  let workbench: Workbench;

  beforeEach(async () => {
    await closeFolder();
    // delete the .vscode folder to remove any settings
    deleteFolder(testDirectory + "/.vscode");
    await openFolder(process.cwd() + "/" + testDirectory);
    workbench = new Workbench();
    await workbench.getDriver().sleep(5000);
    await configureWorkspace("Yes");
    await workbench.getDriver().sleep(10000);
    await closeWindows();
  });

  afterEach(async () => {
    await closeWindows();
  });

  it("Select SDK Path", async () => {
    await workbench.getDriver().sleep(10000);
    await workbench.executeCommand(SELECT_SDK_PATH_COMMAND_ID);
    const input = await InputBox.create();
    expect(input).not.equal(undefined);
    const picks = await input.getQuickPicks();
    expect(picks).not.equal(undefined);
    let sdkPath;
    for (const item of picks) {
      const text = await item.getText();
      if (text.match(".*0.9.1")) {
        sdkPath = text;
        break;
      }
    }
    expect(sdkPath).not.equal(undefined);
    if (sdkPath !== undefined) {
      await input.selectQuickPick(sdkPath);
      const settingsEditor = await workbench.openSettings();
      const setting = await settingsEditor.findSetting("Path", "Cfs", "Sdk");
      expect(setting).not.equal(undefined);
      let value = await setting.getValue();
      if (platform === "win32") {
        value = value.toString();
        value = value.replace(/\//g, "\\");
      }
      expect(value).to.equal(sdkPath);
    }
  });
});
