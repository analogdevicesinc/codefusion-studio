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

import type { NotificationType, RequestType } from "vscode-messenger-common";
import type {
  WestManifest,
  WestManifestImport,
  WestProjectStatuses,
} from "./types";

/** Webview -> extension: fetch the current state of the open `west.yml`. */
export const westEditorRequestMessage: RequestType<void, WestManifest> = {
  method: "get-west-manifest",
};

/** Webview -> extension: write an edited manifest back to the document. */
export const westEditorUpdateRequest: RequestType<WestManifest, void> = {
  method: "update-west-manifest",
};

/**
 * Webview -> extension: resolve the manifests `manifest` imports against the
 * disk. Takes the manifest rather than reading the document, so an edit not
 * yet written back is already reflected.
 */
export const westEditorImportsRequest: RequestType<
  WestManifest,
  WestManifestImport[]
> = {
  method: "get-west-manifest-imports",
};

/**
 * Webview -> extension: open an imported manifest, by its absolute path, in
 * the west editor whatever its file name. Fails when the file is missing.
 */
export const westEditorOpenManifestRequest: RequestType<string, void> = {
  method: "open-west-manifest",
};

/**
 * Webview -> extension: open the document in the text editor with the given
 * offsets selected, typically the span of a YAML error.
 */
export const westEditorRevealRequest: RequestType<
  { start: number; end: number },
  void
> = {
  method: "reveal-west-manifest-range",
};

/**
 * Extension -> webview: the underlying document changed outside the webview
 * (typically an edit in the text editor). The webview should re-fetch.
 */
export const westEditorChangedNotification: NotificationType<void> = {
  method: "west-manifest-changed",
};

/**
 * Webview -> extension: compare each project on disk with the workspace.
 * The host reads the open document itself.
 */
export const westEditorProjectStatusRequest: RequestType<
  void,
  WestProjectStatuses
> = {
  method: "get-west-project-statuses",
};

/**
 * Extension -> webview: project statuses may have changed (the manifest was
 * saved, or the panel is visible again). The webview should re-request.
 */
export const westEditorStatusChangedNotification: NotificationType<void> = {
  method: "west-project-statuses-changed",
};
