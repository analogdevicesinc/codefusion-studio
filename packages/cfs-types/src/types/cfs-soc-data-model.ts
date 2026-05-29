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

export interface SocControl {
	Id: string;
	Description: string;
	Type: string;
	EnumValues?: SocControlValue[];
	Condition?: string;
	Increment?: string | number;
	MinimumValue?: string | number;
	MaximumValue?: string | number;
	NumericBase?: string;
	Units?: string;
	Default?: string | number | boolean;
	PluginOption?: boolean;
	Hint?: string;
	Pattern?: string;
	Tooltip?: string;
}

export interface SocControlValue {
	Id: string;
	Description: string;
	Value: number | string;
	Condition?: string;
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

type ConfigMSDK = Record<string, NestedConfigMSDK | Record<string, never>>;

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

export type SocConfigFields = Record<string, Record<string, SocConfigField[]>>;

export interface SocConfigField {
	Register?: string;
	Field: string;
	Value?: Expression;
	InverseValue?: Expression;
	Operation: string;
}

export type Expression = string;

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
