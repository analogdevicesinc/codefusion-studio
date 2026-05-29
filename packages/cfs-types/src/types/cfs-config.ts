/**
 *
 * Copyright (c) 2024-2026 Analog Devices, Inc.
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

// @TODO: There should be a single type definition for the CFS config that all components can use
// (UI, CLI, cfs-lib?). Probably all components need to consume the type defined in here.

export interface CfsConfig extends Record<string, unknown> {
	Copyright: string;
	DataModelVersion: string;
	Soc: string;
	Package: string;
	Pins: ConfiguredPin[];
	ClockNodes: ConfiguredClockNode[];
	Timestamp: string;
	BoardName: string;
	Projects: ConfiguredProject[];
	DFG?: DFG;
	Settings?: CfsSettings;
	ApplicationPackages?: ConfiguredApplicationPackage[];
}

export interface CfsSettings {
	MCUBoot?: MCUBootSettings;
	SigningKeys?: ConfiguredSigningKey[];
}

export interface MCUBootSettings {
	EnableState: string;
}

export interface ConfiguredSigningKey {
	Name: string;
	Path: string;
	Algorithm: string;
	Description?: string;
}

export interface ConfiguredApplicationPackage {
	Name: string;
	Description?: string;
	Enabled: boolean;
	CoreId?: string;
	Version?: string;
	SecurityCounter?: string | number;
	SignKey?: string;
	Images?: ConfiguredImage[];
}

export type ConfiguredLocationType = "hexAddress";

export interface ConfiguredImage {
	Name: string;
	Description?: string;
	SignKey?: string;
	LocationType: ConfiguredLocationType;
	LocationAddress: string;
	SlotSize: number;
	SlotSizeUnit?: string;
	PadHeader: boolean;
	Path: string;
	HeaderSize: number;
	HeaderSizeUnit?: string;
	CustomTLVs?: ConfiguredCustomTLV[];
	SwapAlignment: string;
	ImageVersion: string;
	Bootable: boolean;
	PublicKeyFormatEnabled?: boolean;
	PublicKeyFormat?: string;
	SecurityCounter?: string | number;
	AesKwKeyPath?: string;
	AesGcmKeyPath?: string;
	CustomArguments?: string;
}

export interface ConfiguredCustomTLV {
	Name: string;
	Description?: string;
	Tag: number;
	Value: string;
}

export interface ConfiguredPin {
	Pin: string;
	Peripheral: string;
	Signal: string;
	Errors?: Record<string, ControlErrorTypes | undefined>;
}

export interface ConfiguredClockNode {
	Name: string;
	Control: string;
	Value: string;
	Error?: ControlErrorTypes;
	Enabled?: boolean;
}

export interface ConfiguredProject {
	CoreId: string;
	ProjectId: string;
	FirmwarePlatform: string;
	ExternallyManaged: boolean;
	Partitions: ConfiguredPartition[];
	Peripherals: ConfiguredPeripheral[];
	PluginId: string;
	PluginVersion: string;
	PlatformConfig: Record<string, string>;
	Secure?: boolean;
	AIModels?: AIModel[];
	Profiling?: Profiling;
}

export interface ConfiguredPeripheral {
	Name: string;
	Description?: string;
	Signals: {
		Name: string;
		Description?: string;
		Config?: Record<string, string>;
		PluginConfig?: PluginConfig;
	}[];
	Config: Record<string, string>;
}

export interface ConfiguredPartition {
	Name: string;
	StartAddress: string;
	Size: number;
	DisplayUnit?: string;
	IsOwner: boolean;
	Config: PluginConfig;
	Access: string;
}

export interface AIModelBackend {
	Name: string;
	Extensions?: Record<string, string | number | boolean>;
	// Only relevant for weaver backend with compiler mode
	CalibrationData?: string[];
	ValidationData?: [string, string][];
}

export interface AIModel {
	Name: string;
	Enabled: boolean;
	Files: Record<string, string>;
	OutDir: string;
	Target: {
		Core: string;
		Accelerator?: string;
	};
	Backend?: AIModelBackend;
}

export interface Profiling {
	Zephelin?: Zephelin;
}

export type ZephelinInterface = "UART" | "USB";

export interface Zephelin {
	Enabled: boolean;
	RtosEventsEnabled: boolean;
	ProfilingMemoryUsageEnabled: boolean;
	ProfilingMemoryUsageInterval: number;
	ProfilingCpuLoadEnabled: boolean;
	ProfilingCpuLoadInterval: number;
	AIEnabled: boolean;
	InstrumentationSubsystemEnabled: boolean;
	Interface: ZephelinInterface;
	Port?: string;
	Format: string;
}

export type PluginConfig = Record<string, string | number | boolean>;

export type ControlErrorTypes =
	| "INVALID_INTEGER"
	| "INVALID_TEXT"
	| "INVALID_MIN_VAL"
	| "INVALID_MAX_VAL";

export interface DFG {
	Streams: DFGStream[];
	Gaskets: GasketConfig[];
}

export interface DFGStream {
	StreamId: number;
	Description: string;
	Source: DFGEndpoint;
	Destinations: DFGEndpoint[];
	Group: string;
}

export interface DFGEndpoint {
	Gasket: string;
	Index: number; // Position in the gaskets input/output wires. We have to ask again how exactly this should be determined
	BufferSize: number;
	BufferAddress: number;
	Config?: PluginConfig;
}

export interface GasketConfig {
	Name: string;
	Config: PluginConfig;
}
