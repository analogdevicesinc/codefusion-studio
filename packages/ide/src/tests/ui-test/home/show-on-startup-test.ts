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
 * This test case verifies that the CFS Home Page is launched when the workspace is configured
 */

import { expect } from "chai";
import { EditorView, Workbench } from "vscode-extension-tester";

import { configureWorkspace } from "../../ui-test-utils/activation-utils";
import {
  closeFolder,
  closeWindows,
  deleteFolder,
  openFolder,
} from "../../ui-test-utils/file-utils";

/** Title for the Home page editor window */
const HOME_PAGE_TITLE = "CFS Home Page";

describe("Home page show on startup test", function () {
  // Flaky test - allow retries
  this.retries(3);
  const testDirectory = "src/tests/ui-test/data/Hello_World";

  beforeEach(async () => {
    const workbench = new Workbench();
    await closeFolder();
    deleteFolder(testDirectory + "/.vscode");
    await workbench.getDriver().sleep(1000);

    await openFolder(process.cwd() + "/" + testDirectory);
    await workbench.getDriver().sleep(5000);
  });

  afterEach(async () => {
    await closeWindows();
  });

  it("Show home page on Workspace Configuration - Yes", async () => {
    await testHomePageOpen("Yes", true);
  });

  it("Don't show home page on Workspace Configuration - No", async () => {
    await testHomePageOpen("No", false);
  });

  it("Don't show home page on Workspace Configuration - Never", async () => {
    await testHomePageOpen("Never", false);
  });
});

/**
 * Configure the workspace using the given configure action and verifies that the Home page is
 * shown or not shown as expected.
 * @param config - The configuration action to perform. Either "Yes", "No", or "Never".
 * @param expected - Whether or not the home page should be expected to be opened.
 */
async function testHomePageOpen(configure: string, expected: boolean) {
  const editorView = new EditorView();

  await configureWorkspace(configure);
  const workbench = new Workbench();
  // Give the home page some time to open
  await workbench.getDriver().sleep(5000);

  const titles = await editorView.getOpenEditorTitles();
  // Verifies that the Home page editor is or isn't open
  if (expected) {
    expect(titles, "Home page is not open.").to.include(HOME_PAGE_TITLE);
  } else {
    expect(titles, "Home page is open.").to.not.include(HOME_PAGE_TITLE);
  }
}
