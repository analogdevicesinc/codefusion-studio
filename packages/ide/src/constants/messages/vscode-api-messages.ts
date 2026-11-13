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
import { NotificationType, RequestType } from "vscode-messenger-common";
import type {
  GetFileSizePayload,
  GetPreferencePayload,
  OpenFilePayload,
  SetPreferencePayload,
  ShowInformationMessagePayload,
} from "../../types/vscode-api-types";

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

/**
 * Fire-and-forget request to show an information message in the IDE.
 */
export const showInformationMessageNotification: NotificationType<ShowInformationMessagePayload> =
  {
    method: "vscode/showInformationMessage",
  };

/**
 * Opens a file in the IDE, optionally using a specific custom editor view type.
 */
export const openFileNotification: NotificationType<OpenFilePayload> = {
  method: "vscode/openFile",
};

/**
 * Reads a value from the `cfs.*` workspace/user configuration.
 */
export const getPreferenceRequest: RequestType<GetPreferencePayload, unknown> =
  {
    method: "vscode/getPreference",
  };

/**
 * Writes a value to the `cfs.*` workspace/user configuration.
 */
export const setPreferenceRequest: RequestType<SetPreferencePayload, void> = {
  method: "vscode/setPreference",
};

/**
 * Returns the size in bytes of the file at the given absolute path.
 */
export const getFileSizeRequest: RequestType<GetFileSizePayload, number> = {
  method: "vscode/getFileSize",
};

/**
 * Reloads the currently active document — used by the custom editor to
 * recover from a state where the persisted document has diverged from the
 * cached in-memory representation.
 */
export const reloadDocumentNotification: NotificationType<void> = {
  method: "vscode/reloadDocument",
};

/**
 * Checks if a directory exists at the given absolute path.
 * Returns true if the path is a valid directory, false otherwise.
 */
export const checkDirectoryExistsRequest: RequestType<string, boolean> = {
  method: "vscode/checkDirectoryExists",
};
