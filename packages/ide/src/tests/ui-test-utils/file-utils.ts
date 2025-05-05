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
import { PathLike, rmSync, unlinkSync } from "fs";
import { EditorView, InputBox, Key, TitleBar,VSBrowser } from "vscode-extension-tester";
const isMac = process.platform === "darwin";

/**
 * Open the given folder
 * @param folder - The folder to open
 */

export async function openFolder(folder: string): Promise<void> {
  const titleBar = new TitleBar();
  await titleBar.select("File", "Open Folder...");
  const input = await InputBox.create();
  await input.setText(folder);
  await input.confirm();
  if (isMac) {
    await VSBrowser.instance.openResources(folder);
  }
}

/**
 * Close the currently open folder, if any
 */
export async function closeFolder() {
  const titleBar = new TitleBar();
  const fileMenu = await titleBar.select("File");
  if (fileMenu !== undefined) {
    if (await fileMenu.hasItem("Close Folder")) {
      await fileMenu.select("Close Folder");
    } else {
      fileMenu.sendKeys(Key.ESCAPE);
    }
  }
}

/**
 * Recursively delete the given folder
 * @param folder - the folder to delete
 */
export async function deleteFolder(folder: PathLike) {
  rmSync(folder, { recursive: true, force: true });
}

/**
 * Recursively delete the given file
 * @param file - the file to delete
 */
export async function deleteFile(file: PathLike) {
  unlinkSync(file);
}

/**
 * Closes Welcome Page and any other open tabs
 */

export async function closeWindows() {
  //Closes initial welcome page which is present when extension is activated
  const editorView = new EditorView();
  const titles = await editorView.getOpenEditorTitles();
  if (titles.includes("Welcome")) {
    await editorView.closeEditor("Welcome");
  }

  if (titles.includes("CFS Home Page")) {
    await editorView.closeEditor("CFS Home Page");
  }

  if (titles.includes("Settings")) {
    await editorView.closeEditor("Settings");
  }
  if (titles.includes("launch.json")) {
    await editorView.closeEditor("launch.json");
  }
}

