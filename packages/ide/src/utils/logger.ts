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

import * as vscode from "vscode";
import { LOGGER_CHANNEL_NAME } from "../constants";

/**
 * Shared logger backed by a VS Code LogOutputChannel. Exposes trace, debug, info, warn and
 * error levels and surfaces messages in the "CodeFusion Studio" output channel.
 */
export const logger = vscode.window.createOutputChannel(LOGGER_CHANNEL_NAME, {
  log: true,
});
