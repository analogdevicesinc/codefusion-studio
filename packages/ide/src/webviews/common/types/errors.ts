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
 * Represents an error that occurred during webview initialization.
 * Used to communicate error states from the extension to the webview.
 */
export type WebviewError = {
	/** The type of error (e.g., 'plugin', 'data-model', 'unknown') */
	type: string;
	/** Error-specific data payload */
	body: unknown;
};
