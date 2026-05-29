/**
 *
 * Copyright (c) 2025 Analog Devices, Inc.
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
import { EditorView, Workbench } from "vscode-extension-tester";

describe("SEV Editor Tests", () => {
  let editor: EditorView;

  before(async function () {
    this.timeout(60000);

    editor = new EditorView();

    await editor.closeAllEditors();
    await new Promise((resolve) => setTimeout(resolve, 3000));
  });

  it.skip("Should open System Event Viewer panel", async () => {
    const workbench = new Workbench();
    await workbench.executeCommand("Open System Event Viewer");
    await workbench.getDriver().sleep(5000);

    const editorView = new EditorView();
    const titles = await editorView.getOpenEditorTitles();

    // Assert that a new tab with the expected title is open
    expect(titles, "System Event Viewer tab is not open.").to.include(
      "CFS: System Event Viewer",
    );
  });
});
