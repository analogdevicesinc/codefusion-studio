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

import type { AIModelBackend } from "./cfs-config.js";
import type { SocAiOpInfo } from "./cfs-soc-data-model.js";

export interface AiBackend {
	Targets: {
		Hardware: AiTarget;
		FirmwarePlatform: string | null;
	}[];
	DisplayName?: string;
	AdvancedTools: boolean;
	Description: string;
	Formats: string[];
	Package: string;
	Module: string;
	MaxModels: number;
	Name: string;
	Slow?: boolean;
	Mot?: {
		DockerImage: string;
		Soc: string;
		Subsystem: string;
		/** Paths relative to the subsystem output directory. Missing entries are skipped. */
		Copy?: string[];
		/** Paths relative to the subsystem output directory, pruned from any directory in `Copy`. */
		Exclude?: string[];
	};
	Default?: boolean;
}

export interface AiTarget {
	Soc?: string;
	Package?: string;
	Core?: string;
	Family?: string;
	Accelerator?: string | null;
	Config?: Record<string, string | number>;
}

export type VerifiedConfigTarget = Pick<
	AiTarget,
	"Soc" | "Core" | "Accelerator"
>;

export interface VerifiedConfig {
	name: string;
	prj_info: {
		name: string;
		workspace: string;
		out_dir: string;
	};
	files: Record<string, string>;
	target: VerifiedConfigTarget;
	backend: AIModelBackend;
}

type AiEvent =
	| {
			type: "FILE";
			message: string;
			value: string; // file path
	  }
	| {
			type: "INFO" | "WARN" | "ERROR";
			message: string;
	  }
	| {
			type: "DATA";
			message: string;
			value: string; // JSON output from tool
	  };

export interface AiCommandResult<T = unknown> {
	code: number;
	validCodes: number[];
	events: AiEvent[];
	artifacts?: {
		files: string[];
	};
	data?: T;
}

interface HardwareTarget extends Omit<
	AiTarget,
	"Soc" | "Core" | "Package"
> {
	Soc: string;
	Core: string;
	/** `null` when the package could not be determined. */
	Package?: string | null;
}

interface HardwareProfile {
	AccelOps: string[];
	CoreClock: number;
	FlashSize: number;
	OperatorInfos: SocAiOpInfo[];
	RamSize: number;
	SupportedDataTypes: string[];
	SupportedOps: string[];
	Target: HardwareTarget | null;
}

export interface ReportInfo {
	hardware: HardwareProfile | null;
	timestamp: string;
	version: string;
}
