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

import * as vscode from "vscode";
import * as fs from "fs";

/**
 * Create a named, unsaved file with the given contents
 * @param file - the path of the file to create or open if the file already exists
 * @param content - the contents to write to the file
 * @returns a document with the given unsaved changes made
 */
export async function createUnsavedFile(
  file: string,
  content: string[],
): Promise<vscode.TextDocument> {
  return new Promise<vscode.TextDocument>(async (resolve, reject) => {
    let uri: vscode.Uri;
    const fileExists = fs.existsSync(file);
    if (fileExists) {
      // open an existing file if it already exists
      uri = vscode.Uri.file(file);
    } else {
      // open a new unsaved file if the file doesn't already exist
      uri = vscode.Uri.parse(`untitled:${file}`);
    }
    const document = await vscode.workspace.openTextDocument(uri);
    const edit = new vscode.WorkspaceEdit();
    // remove any previous content with the new content
    edit.replace(
      uri,
      new vscode.Range(0, 0, document.lineCount, 0),
      content.join("\n").concat("\n"),
    );
    vscode.workspace.applyEdit(edit).then(
      (success) => {
        if (success) {
          resolve(document);
        } else {
          reject("Unable to apply edits to generated files.");
        }
      },
      (reason) => {
        reject(reason);
      },
    );
  });
}
