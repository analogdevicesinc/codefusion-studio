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

/**
 * View type of the West Editor custom editor.
 *
 * Must stay in sync with `contributes.customEditors[].viewType` in
 * `packages/ide/package.json`.
 */
export const WEST_EDITOR_ID = "cfs.editor.west";

/** View type VS Code uses for the built-in plain text editor. */
export const DEFAULT_TEXT_EDITOR_ID = "default";

/**
 * Command IDs contributed by the West Editor.
 *
 * Must stay in sync with `contributes.commands[].command` in
 * `packages/ide/package.json`.
 */
export const WEST_EDITOR_COMMANDS = {
  OPEN_AS_TEXT: "cfs.west.openAsText",
  OPEN_IN_EDITOR: "cfs.west.openInEditor",
} as const;
