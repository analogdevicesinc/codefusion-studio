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

import { expect } from "chai";
import { existsSync } from "fs";
import {
  By,
  WebView,
  Workbench,
  EditorView,
  InputBox,
} from "vscode-extension-tester";

import {
  OPEN_SDK_SETTINGS_COMMAND_ID,
  SELECT_SDK_PATH_COMMAND_ID,
} from "../../../commands/constants";
import { configureWorkspace } from "../../ui-test-utils/activation-utils";
import { Locatorspaths } from "../../ui-test/build/pageobjects";

import {
  closeFolder,
  closeWindows,
  deleteFolder,
  openFolder,
} from "../../ui-test-utils/file-utils";
import { CFS_IDE_VERSION } from "../../ui-test-utils/settings-utils";

describe("Settings shortcut tests", () => {
  const testDirectory = "src/tests/ui-test/data/Hello_World";
  let projectPath: string;
  let webview: WebView;
  let editorView: EditorView;
  const locatorspath = new Locatorspaths();
  const actualtitle = "Settings";

  beforeEach(async () => {
    await closeFolder();
    deleteFolder(`${testDirectory}/.vscode`);
    await new Workbench().getDriver().sleep(10000);
    await openFolder(process.cwd() + `/${testDirectory}`);
    const workbench = new Workbench();
    await workbench.getDriver().sleep(30000);
    await configureWorkspace("Yes");
    await workbench.getDriver().sleep(15000);
    await closeWindows();
  });

  afterEach(async () => {
    await new EditorView().closeAllEditors();
  });

  it("Settings shortcut command, title on page if page is loading", async () => {
    const workbench = new Workbench();
    await workbench.executeCommand(OPEN_SDK_SETTINGS_COMMAND_ID);
    await workbench.getDriver().sleep(10000);
    const homestartup = await workbench
      .getDriver()
      .findElement(locatorspath.settingstext);
    await workbench.getDriver().sleep(10000);
    const iselementdisp = await homestartup.isDisplayed();
    expect(iselementdisp).to.be.true;
  });

  it("Settings shortcut command, verifying title of the page", async () => {
    const workbench = new Workbench();
    await workbench.executeCommand(OPEN_SDK_SETTINGS_COMMAND_ID);
    await workbench.getDriver().sleep(20000);
    const expectedpagetitle = await workbench.getDriver().getTitle();
    expect(expectedpagetitle).includes(actualtitle);
  });

  it("Verify the sdk command shortcut and installer option is displayed ", async () => {
    const workbench = new Workbench();
    await workbench.executeCommand(SELECT_SDK_PATH_COMMAND_ID);
    await workbench.getDriver().sleep(15000);
    const input = await InputBox.create();
    expect(input).not.equal(undefined);
    const picks = await input.getQuickPicks();
    expect(picks).not.equal(undefined);
    let sdkpath;
    for (const item of picks) {
      const text = await item.getText();
      if (text.match(".*" + CFS_IDE_VERSION)) {
        sdkpath = text;
        break;
      }
    }
    expect(sdkpath).not.equal(undefined);
  });
});
