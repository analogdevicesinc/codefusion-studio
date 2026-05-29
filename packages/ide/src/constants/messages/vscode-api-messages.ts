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

import type * as vscode from "vscode";
import { RequestType } from "vscode-messenger-common";

export type SelectFileRequestOptions = Omit<
  vscode.OpenDialogOptions,
  "defaultUri" | "canSelectFiles" | "canSelectFolders"
> & {
  selectionTarget?: "file" | "folder";
} & {
  relativeToWorkspaceRoot?: boolean;
};

/**
 * Opens the system file dialog to allow selecting a file.
 * Returns undefined if the user cancels the dialog, otherwise returns the selected file path.
 *
 * When selectionTarget is undefined, the default behavior is to allow selecting files.
 */
export const selectFileRequest: RequestType<
  SelectFileRequestOptions,
  string | undefined
> = {
  method: "selectFile",
};
