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

import type { AIModel, CfsFeatureScope } from "cfs-types";

export type AIModelValidationResult = {
  isValid: boolean;
  reportPath?: string;
};

export type ValidateAIModelPayload = {
  aiModel: AIModel;
};

export type AnalyzeAIModelPayload = {
  aiModel: AIModel;
};

export type GetAIBackendPropertiesPayload = {
  scope: CfsFeatureScope;
};

/**
 * Backends and their properties are returned as opaque structures owned by
 * the AI tools plugin. They are exposed to the webview as-is so plugin
 * authors can keep evolving the shape without coupling to the editor.
 */
export type AIBackends = unknown;
export type AIBackendProperties = unknown;
