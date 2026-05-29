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
import { ApplicationStatus, HardwareResources, ProfilingConfiguration } from "../../types/ai-hardware-profiling-types";

// Extension -> webview notifications


export const applicationStatusUpdate: NotificationType<ApplicationStatus> = {
	method: "applicationStatus/update",
};

// webview -> extension

export const getProfilingViewData: RequestType<
	void,
	{
		hardwareResources: HardwareResources;
		profilingConfig: ProfilingConfiguration;
		applicationStatus: ApplicationStatus;
	}
> = {
	method: "profilingConfiguration/get",
};

export const updateProfilingConfiguration: NotificationType<ProfilingConfiguration> =
	{
		method: "profilingConfiguration/update",
	};

export const deployModelForProfiling: NotificationType<void> = {
	method: "model/deployForProfiling",
};

export const stopDeployment: NotificationType<void> = {
	method: "model/stopDeployment",
};
