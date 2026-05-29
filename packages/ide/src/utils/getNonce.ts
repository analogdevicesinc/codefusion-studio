/**
 *
 * Copyright (c) 2023-2026 Analog Devices, Inc.
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

import { randomBytes } from "node:crypto";

/**
 * A helper function that returns a Base64-encoded string called a nonce.
 * @remarks This function is primarily used to help enforce content security policies for resources/scripts being executed in a webview context.
 * @returns A nonce
 */

export function getNonce() {
  return randomBytes(16).toString("base64");
}
