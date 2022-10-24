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

import { WebView, By, Workbench, EditorView } from "vscode-extension-tester";
import { expect } from "chai";

describe("New Project Wizard Test", () => {
  let view: WebView;

  after(async function () {
    await view.switchBack();
    await new EditorView().closeAllEditors();
  });

  it("Initializes the new project wizard through the registered command", async () => {
    await new Workbench().executeCommand("cfs.newProject");

    await new Promise((resolve) => setTimeout(resolve, 1000));

    view = new WebView();

    await view.switchToFrame();

    const modalDialog = await view.findWebElement(
      By.css("#create-new-project")
    );

    expect(modalDialog).to.exist;
  }).timeout(60_000);
});
