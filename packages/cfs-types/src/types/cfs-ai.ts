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

export interface AiBackend {
	Targets: {
		Hardware: AiTarget;
		FirmwarePlatform: string;
	}[];
	AdvancedTools: boolean;
	Description: string;
	Formats: string[];
	Package: string;
	Module: string;
	MaxModels: number;
	Name: string;
	Slow?: boolean;
	Weaver?: {
		DockerImage: string;
		Soc: string;
		Subsystem: string;
		Copy?: string[];
	};
}

export interface AiTarget {
	Soc?: string;
	Package?: string;
	Core?: string;
	Family?: string;
	Accelerator?: string;
}
