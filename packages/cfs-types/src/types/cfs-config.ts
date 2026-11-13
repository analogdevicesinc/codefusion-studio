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

/**
 * The `SchemaVersion` stamped into newly written `.cfsconfig` documents. Each
 * generated JSON schema is frozen to a single version, and this literal is the
 * one it pins `SchemaVersion` to, so bumping it produces a new frozen schema.
 */
export type CfsConfigLatestSchemaVersion = "2.2.0";

/**
 * Every `SchemaVersion` a `.cfsconfig` document may declare and still be read.
 * Superseded versions stay listed here for as long as cfs-lib registers a
 * schema for them, so a document loaded from disk is not assumed to be the
 * latest version.
 */
export type CfsConfigSchemaVersion =
	| "2.1.0"
	| CfsConfigLatestSchemaVersion;

export interface CfsConfig<
	TPlatform extends object = PluginConfig,
> extends Record<string, unknown> {
	Copyright: string;
	/** The version of the .cfsconfig schema this file conforms to. */
	SchemaVersion: CfsConfigSchemaVersion;
	DataModelVersion: string;
	/** The schema version of the data model referenced by `DataModelVersion`. */
	DataModelSchemaVersion?: string;
	Soc: string;
	Package: string;
	Pins: ConfiguredPin[];
	ClockNodes: ConfiguredClockNode[];
	Timestamp: string;
	BoardName: string;
	/**
	 * @minItems 1
	 * @uniqueItems true
	 */
	Projects: ConfiguredProject<TPlatform>[];
	DFG?: DFG;
	Sru?: CfsSru;
	Settings?: CfsSettings;
	FirewallConfig?: FirewallConfig;
	ApplicationPackages?: ConfiguredApplicationPackage[];
	/** Calculated clock frequencies in Hz, keyed by clock node name. */
	ClockFrequencies?: Record<string, string | number>;
}

/** Default platform contract used for schema generation, not consumer narrowing. */
export type CfsConfigSchema = CfsConfig<PluginConfig>;

export interface CfsSru {
	Connections: Record<string, string>;
	UserDescriptions: Record<string, string>;
	/**
	 * Purely presentational friendly names for signals, keyed by signal
	 * name. Codegen always uses the raw schema signal name in
	 * `Connections`; this map only affects how signals are labeled in the
	 * UI.
	 */
	SignalAliases?: Record<string, string>;
	/**
	 * Which SRU input signals have hardware polarity inversion enabled,
	 * keyed by input signal name. Only signals with `true` are present -
	 * absence means Normal (not inverted). Drives the `INVERT` control's
	 * register writes for signals whose schema `Config` declares it.
	 */
	SignalInversions?: Record<string, boolean>;
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

/**
 * How the firewall behaves as a whole. `enabled` honours the configured zones;
 * the override states bypass them and force all traffic blocked or open.
 */
export type FirewallStatus =
	| "enabled"
	| "overrideAllBlocked"
	| "overrideAllOpen";

/** The firewall configuration for the SoC. */
export interface FirewallConfig {
	FirewallStatus: FirewallStatus;
	/** Path to the firewall binary, using Unix path separators. */
	BinaryFilePath?: string;
	FirewallZones?: ConfiguredFirewallZone[];
	/**
	 * User edits applied to individual responders. A responder can be assigned
	 * to several zones and its edits are shared by all of them, so they are
	 * stored once here rather than repeated inside each zone. An entry is
	 * dropped once no zone references the responder any more.
	 */
	ResponderOverrides?: ConfiguredFirewallResponderOverride[];
}

/** A firewall zone and the initiators and responders assigned to it. */
export interface ConfiguredFirewallZone {
	Name: string;
	Description?: string;
	/** Initiator names, as defined by the SoC data model. */
	Initiators?: string[];
	Responders?: ConfiguredFirewallResponder[];
	AccessModes: ConfiguredFirewallAccessModes;
}

/**
 * A responder assigned to a zone. The object form is what is written; the bare
 * name is still accepted on read and resolved against the SoC data model.
 */
export type ConfiguredFirewallResponder =
	| string
	| {
			Name: string;
			/**
			 * The responder group that defines this responder. The data model only
			 * requires a responder to be unique within its group, so the name on its
			 * own does not identify one.
			 */
			Group?: string;
			/**
			 * The configured base address, as a `0x`-prefixed hexadecimal string.
			 * @pattern ^0[xX][0-9a-fA-F]+$
			 */
			BaseAddress?: string;
	  };

/**
 * The access modes a zone permits. All four true means open, none means
 * blocked, and anything in between means restricted. An omitted mode is not
 * permitted.
 */
export interface ConfiguredFirewallAccessModes {
	NonSecureNonPrivileged?: boolean;
	NonSecurePrivileged?: boolean;
	SecureNonPrivileged?: boolean;
	SecurePrivileged?: boolean;
}

/** A user override of a responder defined by the SoC data model. */
export interface ConfiguredFirewallResponderOverride {
	Name: string;
	/**
	 * The responder group that defines this responder. The data model only
	 * requires a responder to be unique within its group, so the name on its own
	 * does not identify one.
	 */
	Group?: string;
	DisplayName?: string;
	Description?: string;
	/**
	 * The configured start address, as a `0x`-prefixed hexadecimal string.
	 * @pattern ^0[xX][0-9a-fA-F]+$
	 */
	AddressStart?: string;
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

export interface ConfiguredProject<
	TPlatform extends object = PluginConfig,
> {
	CoreId: string;
	ProjectId: string;
	FirmwarePlatform?: string;
	ExternallyManaged: boolean;
	Partitions: ConfiguredPartition[];
	Peripherals: ConfiguredPeripheral[];
	PluginId: string;
	PluginVersion: string;
	PlatformConfig?: TPlatform;
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
	/**
	 * @pattern ^0[xX][0-9a-fA-F]+$
	 * @minLength 1
	 * @maxLength 10
	 */
	StartAddress: string;
	/** @multipleOf 1 */
	Size: number;
	DisplayUnit?: string;
	IsOwner: boolean;
	Config: PluginConfig;
	Access: "" | "R" | "R/W" | "R/X" | "R/W/X";
}

export type CalibrationData = string[];
/** an entry sets either `label` or `expected`. */
export type ValidationData = ({
	input: string;
} & ({ label: string } | { expected: string }))[];
export type Labels = string[];

export interface AIModelBackend {
	Name: string;
	Extensions?: Record<string, string | number | boolean>;
	// Only relevant for Mot backend with compiler mode
	CalibrationData?: CalibrationData;
	ValidationData?: ValidationData;
	Labels?: Labels;
}

export interface AIModel {
	Name: string;
	// Some toolchain-generated files emit this as a string, e.g. "true"
	Enabled: boolean | string;
	Files: Record<string, string>;
	OutDir?: string;
	Target: {
		Core: string;
		Accelerator?: string;
		Config?: Record<string, string | number>;
	};
	Backend?: AIModelBackend;
}

export interface Profiling {
	Zephelin?: Zephelin;
}

export type ZephelinInterface = "UART" | "USB";

/**
 * Configuration for the interface used to transfer Zephelin profiling data.
 *
 * The transport is discriminated by `Type`. A `UART` interface additionally
 * carries the `Port` (the UART instance name from the data model), while a
 * `USB` interface requires no further configuration.
 */
export type ZephelinInterfaceConfig =
	| { Type: "UART"; Port: string }
	| { Type: "USB" };

export interface Zephelin {
	Enabled: boolean;
	RtosEventsEnabled: boolean;
	ProfilingMemoryUsageEnabled: boolean;
	ProfilingMemoryUsageInterval: number;
	ProfilingCpuLoadEnabled: boolean;
	ProfilingCpuLoadInterval: number;
	AIEnabled: boolean;
	InstrumentationSubsystemEnabled: boolean;
	InstrumentationTriggerFunction?: string;
	InstrumentationStopperFunction?: string;
	Interface: ZephelinInterfaceConfig;
	/**
	 * Legacy top-level UART port. The port is now carried inside
	 * {@link ZephelinInterfaceConfig}. Retained only for reading older configs.
	 * @deprecated
	 */
	Port?: string;
	Format: "CTF" | "TEXT";
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
	/** @multipleOf 1 */
	StreamId: number;
	Description: string;
	Source: DFGEndpoint;
	Destinations: DFGEndpoint[];
	Group: string;
}

export interface DFGEndpoint {
	Gasket: string;
	/** @multipleOf 1 */
	Index: number; // Position in the gaskets input/output wires. We have to ask again how exactly this should be determined
	/** @multipleOf 1 */
	BufferSize: number;
	/** @multipleOf 1 */
	BufferAddress: number;
	Config?: PluginConfig;
}

export interface GasketConfig {
	Name: string;
	Config: PluginConfig;
}
