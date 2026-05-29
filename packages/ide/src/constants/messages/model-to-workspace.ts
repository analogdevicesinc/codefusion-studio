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

import { NotificationType, RequestType } from "vscode-messenger-common";
import { AIModelCfsWorkspace } from "cfs-types";

export const getWorkspaceConfig: RequestType<
	void,
	Partial<AIModelCfsWorkspace>
> = {
	method: "getWorkspaceConfig",
};

export const updateWorkspaceConfig: NotificationType<
	Partial<AIModelCfsWorkspace>
> = {
	method: "updateWorkspaceConfig",
};

export const generateWorkspace: NotificationType<void> = {
	method: "generateWorkspace",
};

export const getCatalog: RequestType<void, unknown> = {
	method: "getCatalog",
};

/**
 * paramters: soc;
 * return: record of core to compatibility status
 */

export const runCompatibilityCheck: RequestType<
  {
    soc: string;
    board: string;
    modelFile: string;
    sampleData?: string;
  },
  Record<string, boolean | "error">
> = {
  method: "runCompatibilityCheck",
};
