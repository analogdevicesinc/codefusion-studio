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

import { AiTarget } from "./cfs-ai.js";
import type { SocDiagramData } from "./cfs-soc-diagram-data.js";

export interface CfsSocDataModel {
	Copyright: string;
	Version: string;
	Timestamp: string;
	Name: string;
	Description: string;
	Endianness: string;
	Parts: SocPart[];
	Cores: SocCore[];
	Controls: Record<string, SocControl[]>;
	Peripherals: SocPeripheral[];
	ClockNodes: SocClock[];
	Packages: SocPackage[];
	Registers: SocRegister[];
	Schema: string;
	Gaskets: SocGasket[];
	MemoryTypes: SocCoreMemoryType[];
	MemoryAliasTypes: SocCoreMemoryAliasType[];
	SystemMemory: SocCoreMemory[];
	supportsMCUboot?: boolean;
	Firewall?: SocFirewall;
	Trace?: SocTraceInfo;
}

export interface SocAiOpInfo {
	Name: string;
	Cycles: number;
	Energy: number;
}

export interface SocAi {
	FlashSize: number;
	RamSize: number;
	CoreClock: number;
	SupportedOps: string[];
	AccelOps: string[];
	OperatorInfos: SocAiOpInfo[];
	SupportedDataTypes: string[];
	Target?: AiTarget;
}

export interface SocPart {
	Name: string;
	Package: string;
	MemoryDescription: string;
}

/**
 * The control value kinds a SoC data model may declare.
 *
 * Source of truth is `Controls.additionalProperties.items.properties.Type` in
 * [datamodel-schema.json](../../schemas/datamodel-schema.json), which
 * `validate-datamodel.js` enforces when a model is authored. Keep this union
 * in step with that enum.
 *
 * `SocControl.Type` stays `string`: the schema is an authoring-time gate, not
 * a runtime one, and nothing revalidates a model at load. Use this union where
 * code *handles* the declared kinds.
 */
export type SocControlType = "enum" | "integer" | "boolean" | "text";

/**
 * The numeric base a control's value is expressed in.
 *
 * Source of truth is `Controls.additionalProperties.items.properties.
 * NumericBase` in [datamodel-schema.json](../../schemas/datamodel-schema.json).
 */
export type SocNumericBase =
	| "Decimal"
	| "Hexadecimal"
	| "Octal"
	| "Binary";

export interface SocControl {
	Id: string;
	Description: string;
	/** One of {@link SocControlType}, unvalidated at runtime. */
	Type: string;
	EnumValues?: SocControlValue[];
	Condition?: string;
	Increment?: string | number;
	MinimumValue?: string | number;
	MaximumValue?: string | number;
	/** One of {@link SocNumericBase}, unvalidated at runtime. */
	NumericBase?: string;
	Units?: string;
	Default?: string | number | boolean;
	PluginOption?: boolean;
	Hint?: string;
	Pattern?: string;
	Tooltip?: string;
	Scope?: string;
	PersistenceSeparator?: string;
}

export interface SocControlValue {
	Id: string;
	Description: string;
	Value: number;
	Condition?: string;
	IsPluginAddedOption?: boolean;
	Inactive?: boolean;
}

export interface SocPackage {
	Name: string;
	Description: string;
	NumPins: number;
	Pins: SocPin[];
	PinCanvas: SocPinCanvas;
	ClockCanvas: SocDiagramData;
	CoprogrammedSignals?: {
		Pin: string;
		Peripheral: string;
		Signal: string;
	}[][];
}

export interface SocPinCanvas {
	Width: number;
	Height: number;
	Labels: SocPinCanvasLabel[];
}

export interface SocPinCanvasLabel {
	Text: string;
	X: number;
	Y: number;
}

export interface SocPin {
	Name: string;
	Label: string;
	Description: string;
	Position: {
		X: number;
		Y: number;
	};
	Shape?: string;
	GPIOPort?: string;
	GPIOPin?: number;
	GPIOName?: string;
	Signals: SocPinSignal[];
}

export interface SocPinConfig {
	Register: string;
	Field: string;
	Value: string;
	Operation?: string;
	Wait?: number;
	SlicePosition?: number;
	SliceWidth?: number;
}

export interface SocPinSignal {
	Peripheral: string;
	Name: string;
	PinMuxSlot?: number;
	PinMuxConfig?: SocConfigField[];
	PinConfig?: SocConfigFields;
	IsInputTap?: boolean;
	coprogrammedSignals?: {
		Pin: string;
		Peripheral: string;
		Signal: string;
	}[];
}

export interface SocClockNode {
	Name: string;
	Description: string;
	Config: Record<string, Record<string, SocPinConfig[]>>;
}

export interface SocConfigZephyr {
	Code?: string;
	Peripheral?: string;
	Clock?: string;
	Default?: boolean;
	Diagnostic?: string;
}

export interface SocRegister {
	Name: string;
	Description: string;
	Address: string;
	Size: number;
	Fields: SocRegisterField[];
}

export interface SocRegisterField {
	Name: string;
	Description: string;
	Documentation?: string;
	Position: number;
	Length: number;
	Reset: string | number;
	Access: "R" | "R/W";
	Enum?: {
		Name: string;
		Description: string;
		Documentation: string;
		Value: number | string;
	}[];
}

export interface SocPeripheral {
	Name: string;
	Description: string;
	Cores: string[];
	Signals: SocPeripheralSignalConfig[];
	Group?: string;
	Assignable?: boolean;
	Required?: string[];
	ClockNode: string;
	Preassigned?: boolean;
	Config?: SocConfigFields;
	Security?: "Any" | "Secure" | "Non-Secure";
	Initialization?: SocConfigField[];
	Ai?: object;
	SRU?: SocSruType;
}

interface SocPeripheralSignalConfig {
	Name: string;
	Description: string;
	Required?: string; // Requires evaluating a condition using the expression parser
	Group?: string;
}

export interface SocCoreMemoryType {
	Name: string;
	Description: string;
	IsVolatile: boolean;
}

export interface SocCoreMemoryAliasType {
	Name: string;
	Description: string;
}

export interface SocCoreMemory {
	Name: string;
	Description: string;
	AddressStart: string;
	AddressEnd: string;
	Width: number;
	MinimumAlignment?: number;
	Access: string;
	Type: string;
	Location: string;
}

export interface SocCoreMemoryRef {
	Name: string;
	AddressStart?: string;
	AddressEnd?: string;
	Access: string;
	AliasType?: string;
	AliasBaseAddress?: string;
}

export type SocCoreMemoryRange = SocCoreMemory | SocCoreMemoryRef;

export interface SocCore {
	Id: string;
	Name: string;
	Description: string;
	CoreNum?: number;
	IsPrimary?: boolean;
	TrustZone?: Record<string, never>;
	Family: string;
	Memory: SocCoreMemoryRange[];
	Ai?: object;
}

export interface SocClock {
	Name: string;
	Description: string;
	Type: string;
	Inputs: ClockInput[];
	Outputs: SocClockOutput[];
	Signpost: string;
	Config?: SocConfigFields;
	Initialization?: SocConfigField[];
	ConfigUIOrder?: string[];
	ConfigProgrammingOrder?: string[];
	ConfigMSDK?: ConfigMSDK;
	ConfigZephyr?: Record<string, Record<string, SocConfigZephyr>>;
}

interface ClockInput {
	Name: string;
}

export interface SocClockOutput {
	Name: string;
	Description: string;
	Value: string;
	MinimumValue?: number;
	MaximumValue?: number;
	Condition?: string;
}

interface ConfigCode {
	Code: string;
	Epilog: string;
	Headers: string[];
}

interface NestedConfigMSDK {
	[key: string]: ConfigCode | NestedConfigMSDK;
}

type ConfigMSDK = Record<
	string,
	NestedConfigMSDK | Record<string, never>
>;

export interface SocGasketInputStream {
	Config: SocConfigFields;
	BuiltInConfig: SocConfigFields;
	BufferAddress?: number;
	BufferSize?: number;
}

export interface SocGasketOutputStream extends SocGasketInputStream {
	Index: number;
}

export interface SocGasket {
	Name: string;
	Id: number;
	Description: string;
	InputBufferSize: number;
	InputStreams: SocGasketInputStream[];
	MinInputStreamBufferSize: number | undefined;
	OutputBufferSize: number;
	OutputStreams: SocGasketOutputStream[];
	MinOutputStreamBufferSize: number | undefined;
	InputAndOutputBuffersTied?: boolean;
	AssociatedCore?: string;
	Config?: SocConfigFields;
}

export type SocConfigFields = Record<
	string,
	Record<string, SocConfigField[]>
>;

export interface SocConfigField {
	Register?: string;
	Field: string;
	Value?: Expression;
	InverseValue?: Expression;
	Operation: string;
	SlicePosition?: number;
	SliceWidth?: number;
}

export type Expression = string;

/**
 * An integer that the data model may express either as a plain number or as a
 * `0x`-prefixed hexadecimal string.
 */
export type SocMultiFormatInteger = string | number;

/** Information about the firewalls on the part. */
export interface SocFirewall {
	Initiators: SocFirewallInitiator[];
	ResponderGroups: SocFirewallResponderGroup[];
}

/** An initiator that traffic can originate from. */
export interface SocFirewallInitiator {
	Name: string;
	Description: string;
	BaseAddress: SocMultiFormatInteger;
}

/** A named collection of related responders. */
export interface SocFirewallResponderGroup {
	Name: string;
	Description: string;
	Responders: SocFirewallResponder[];
}

/** The kind of resource a responder protects. Defaults to `Memory` when unset. */
export type SocFirewallResponderType =
	| "Memory"
	| "Peripheral"
	| "ProgrammableRegion";

/**
 * A responder that traffic can be directed at. `ProgrammableRegion` responders
 * have no fixed address range; every other type defines `AddressStart` and
 * `AddressEnd`.
 */
export interface SocFirewallResponder {
	Name: string;
	Description: string;
	Id: number;
	Type?: SocFirewallResponderType;
	AddressStart?: SocMultiFormatInteger;
	AddressEnd?: SocMultiFormatInteger;
}

export interface SocTraceInfo {
	EventSources: SocTraceEventSourceGroup;
	Components: Record<string, SocTraceComponentInfo>;
}

export interface SocTraceEventSource {
	Signal: string;
}

export interface SocTraceEventSourceGroup {
	[key: string]: SocTraceEventSource | SocTraceEventSourceGroup;
}

export type SocTraceComponentInfo = Record<
	string,
	string | Record<string, string>
>;

export type SocSruType = {
	Inputs: SruInputSignal[];
	Outputs: SruOutputSignal[];
};

export type SruSignal = {
	Name: string;
	Description: string;
	SignalType: string;
	PeripheralSubGroup?: string;
};

export type SruInputSignal = SruSignal & {
	Config: SocConfigFields;
	IsPinBufferEnable?: boolean;
};

export type SruOutputSignal = SruSignal;
