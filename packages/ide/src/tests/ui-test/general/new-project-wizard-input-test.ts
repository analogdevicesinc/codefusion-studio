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

import { expect } from "chai";
import { Workbench, WebView, EditorView, By } from "vscode-extension-tester";
import { closeFolder, openFolder } from "../../ui-test-utils/file-utils";

describe("New Project Wizard Input Validation Test", () => {
  let workbench: Workbench;
  let webview: WebView;
  let editorView: EditorView;
  const testDirectory = "src/tests/ui-test/data/Hello_World";

  before(async function () {
    workbench = new Workbench();
    editorView = new EditorView();
    // Opening the hello world example which contains a projects directory
    await closeFolder();
    await openFolder(process.cwd() + "/" + testDirectory);
  });

  after(async function () {
    await webview.switchBack();
    await new EditorView().closeAllEditors();
  });

  it("This test should open the New Project Wizard and interact with the DOM elements", async function () {
    // Open command palette and run command to open new project wizard
    await workbench.executeCommand("cfs.newProject");

    // Wait for webview to appear and switch to it
    webview = new WebView();
    await webview.switchToFrame();

    // Find the project name input field and enter a value
    const projectNameInput = await webview.findWebElement(
      By.name("projectName")
    );
    await projectNameInput.clear();
    await projectNameInput.sendKeys("projects");

    // Find the error message element for the project name
    const nameErrorMessageElement = await webview.findWebElement(
      By.css(".err")
    );
    const nameErrorMessageText = await nameErrorMessageElement.getText();

    // Verify that an error message is displayed for the project name
    expect(nameErrorMessageText).to.not.be.empty;

    await projectNameInput.clear();
    await projectNameInput.sendKeys("MyProject");

    // Find the project location input field and enter a value
    const projectLocationInput = await webview.findWebElement(
      By.name("projectLocation")
    );
    await projectLocationInput.clear();
    await projectLocationInput.sendKeys("wrong/location/path");

    // Find the error message element for project location
    const locationErrorMessageElement = await webview.findWebElement(
      By.css(".err")
    );
    const locationErrorMessageText =
      await locationErrorMessageElement.getText();

    // Verify that an error message is displayed for the project location
    expect(locationErrorMessageText).to.not.be.empty;
  });
});
