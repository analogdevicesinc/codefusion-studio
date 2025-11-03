/**
 *
 * Copyright (c) 2025 Analog Devices, Inc.
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

export type AIFieldInfo = {
	key: string;
	format: string;
	text: string;
	tooltip: string;
};

export type AiSupportingBackend = {
	Targets: Target[];
	Slow?: boolean;
	MaxModels: number;
	AdvancedTools: boolean;
	Docker: {
		Size: number;
	};
};

export type Target = {
	Hardware: {
		Soc?: string;
		Core?: string;
		Arch?: string;
		// It's required to use null here to differentiate between ignoring accellerator and checking if the core does not have an accelerator.
		// eslint-disable-next-line @typescript-eslint/ban-types
		Accelerator?: string | null;
	};
	FirmwarePlatform?: string;
};
