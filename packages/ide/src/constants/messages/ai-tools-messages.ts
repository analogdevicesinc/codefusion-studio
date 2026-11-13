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

import type { RequestType } from "vscode-messenger-common";
import type {
  AIBackendProperties,
  AIBackends,
  AIModelValidationResult,
  AnalyzeAIModelPayload,
  GetAIBackendPropertiesPayload,
  ValidateAIModelPayload,
} from "../../types/ai-tools-types";

/**
 * Returns the list of AI runtime backends supported by the installed
 * cfsai tool, used to populate the AI model target picker.
 */
export const getSupportedAiBackendsRequest: RequestType<void, AIBackends> = {
  method: "ai/getSupportedBackends",
};

/**
 * Returns the property schema for a given AI feature scope (e.g. project,
 * model) so the webview can render the configuration UI.
 */
export const getAIBackendPropertiesRequest: RequestType<
  GetAIBackendPropertiesPayload,
  AIBackendProperties
> = {
  method: "ai/getBackendProperties",
};

/**
 * Runs the cfsai compatibility check against the provided AI model and
 * returns whether the model is valid for the target hardware.
 */
export const validateAIModelRequest: RequestType<
  ValidateAIModelPayload,
  AIModelValidationResult
> = {
  method: "ai/validateModel",
};

/**
 * Runs the cfsai profiler against the provided AI model. The generated
 * report is opened by the extension in the report viewer — this request
 * resolves once profiling finishes (successfully or not).
 */
export const analyzeAIModelRequest: RequestType<AnalyzeAIModelPayload, void> = {
  method: "ai/analyzeModel",
};
