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

export type ShowInformationMessagePayload = {
  message: string;
};

export type OpenFilePayload = {
  filePath: string;
  /**
   * Optional view type / custom editor id to open the file with
   * (e.g. "cfs.reportViewer"). When omitted, vscode resolves the default
   * editor for the file.
   */
  editor?: string;
};

export type GetPreferencePayload = {
  id: string;
};

/**
 * vscode.ConfigurationTarget is a numeric enum (Global = 1, Workspace = 2,
 * WorkspaceFolder = 3). Modeled as a plain number here so the type can be
 * referenced from webview code without depending on the vscode module.
 */
export type ConfigurationTargetValue = 1 | 2 | 3;

export type SetPreferencePayload = {
  id: string;
  value: unknown;
  scope?: ConfigurationTargetValue;
};

export type GetFileSizePayload = {
  filePath: string;
};
