/**
 *
 * Copyright (c) 2024-2025 Analog Devices, Inc.
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
import type {SocControl} from 'cfs-plugins-api';
import type {
	ControlErrorTypes,
	TControlTypes
} from '../../config-tools/src/types/errorTypes';

export type Soc = {
	Copyright: string;
	Version: string;
	Schema: string;
	Timestamp: string;
	Name: string;
	Description: string;
	Controls: Controls;
	ClockNodes: ClockNode[];
	Peripherals: Peripheral[];
	Registers: Register[];
	Packages: Package[];
	Endianness: string;
	Parts: Array<{
		Name: string;
		Package: string;
		MemoryDescription: string;
	}>;
	Cores: Core[];
	MemoryTypes: MemoryType[];
};

export type ClockNode = {
	Name: string;
	Description: string;
	Type: string;
	Signpost?: string;
	Outputs: NodeOutput[];
	Inputs?: NodeInput[];
	Config: ConfigFields;
	ConfigUIOrder: string[];
};

export type NodeOutput = {
	Name: string;
	Description: string;
	Value: string;
	MinimumValue?: number;
	MaximumValue?: number;
	Condition?: string;
};

export type NodeInput = {
	Name: string;
};

export type Controls = Record<string, ControlCfg[]>;

export type EnumValue = {
	Id: string;
	Description: string;
	Value: number;
};

export type ControlCfg = SocControl & {Type: TControlTypes};

export type Expression = string;

export type Package = {
	Name: string;
	Description: string;
	NumPins: number;
	Pins: Pin[];
	PinCanvas: PinCanvas;
	ClockCanvas: DiagramData;
	CoprogrammedSignals?: Array<
		Array<{
			Pin: string;
			Peripheral: string;
			Signal: string;
		}>
	>;
};

export type PinCanvas = {
	Width: number;
	Height: number;
	Labels: Label[];
};

export type Label = {
	Text: string;
	X: number;
	Y: number;
};

export type Pin = {
	Name: string;
	Description: string;
	Label: string;
	Position: Position;
	Signals?: PinSignal[];
};

export type Signal = {
	name: string;
	description: string;
	pins: Pin[];
	currentTarget: string | undefined;
	invalid?: Record<string, string[]>;
};

export type ConfigFields = Record<
	string,
	Record<string, ConfigField[]>
>;

export type ConfigField = {
	Register?: string;
	Field: string;
	Value?: Expression;
	InverseValue?: Expression;
	Operation: string;
	ControlValue?: number; // Filled in at runtime depending on control value.
};

export type Position = {
	X: number;
	Y: number;
};

export type PinSignal = {
	Peripheral?: string;
	Name: string;
	PinMuxConfig?: ConfigField[];
	PinConfig?: ConfigFields;
	coprogrammedSignals?: Array<{
		Pin: string;
		Peripheral: string;
		Signal: string;
	}>;
};

export type AssignedPin = {
	Name: string;
	Signals: PinSignal[] | undefined;
	pinId: string;
	isFocused: boolean;
	appliedSignals: AppliedSignal[];
};

export type AppliedSignal = PinSignal & {
	Pin: string;
	PinCfg?: Record<string, string>;
	Errors?: Record<string, ControlErrorTypes | undefined>;
};

export type Peripheral = {
	Name: string;
	Description: string;
	Cores: string[];
	Signals: PeripheralSignal[];
	SignalGroup?: string;
	Preassigned?: boolean;
	Config?: ConfigFields;
	Security?: 'Any' | 'Secure' | 'Non-Secure';
};

export type PeripheralSignal = {
	Name: string;
	Description: string;
	Required?: string; // Requires evaluating a condition using the expression parser
};

export type FormattedPeripheralSignal = {
	name: string;
	description: string;
	pins: Pin[];
	required?: string;
};

export type FormattedPeripheral<T> = {
	name: string;
	description: string;
	signals: Record<string, T>;
	preassigned?: boolean;
	config?: ConfigFields;
	pluginConfig?: Record<string, string>;
	cores?: string[];
	signalGroup?: string;
	security?: string;
};

export type UnifiedPeripherals = Record<
	string,
	FormattedPeripheral<
		FormattedPeripheralSignal & {currentTarget?: string}
	>
>;

export type Register = {
	Name: string;
	Description: string;
	Address: string;
	Size: number;
	Fields: Field[];
	Svg: string;
};

export type Field = {
	Name: string;
	Description: string;
	Documentation?: string;
	Position: number;
	Length: number;
	Reset: string | number;
	Access: 'R' | 'R/W';
	Enum?: Array<{
		Name: string;
		Description: string;
		Value: string | number;
		Documentation: string;
	}>;
};

export type PinState = {
	pinId: string;
	isFocused: boolean;
	appliedSignals: AppliedSignal[];
};

export type PinDictionary = Record<string, PinState>;

export type ControlDictionary = Record<string, ControlCfg>;

export type FieldDictionary = {
	id: string;
	name: string;
	description: string;
	documentation?: string;
	position: number;
	length: number;
	reset: string | number;
	access: 'R' | 'R/W';
	enumVals?: Array<{
		id: string;
		name: string;
		description: string;
		value: string | number;
		documentation: string;
	}>;
};

export type RegisterDictionary = {
	name: string;
	description: string;
	address: string;
	size: number;
	fields: FieldDictionary[];
	reset: number;
	svg: string;
};

export type NodeErrors =
	| Record<string, ControlErrorTypes | undefined>
	| undefined;

export type ClockNodeState = {
	Name: string;
	controlValues?: Record<string, string>;
	Errors?: NodeErrors;
	initialControlValues?: Record<string, string>;
};

export type ClockNodesDictionary = Record<string, ClockNodeState>;

export type ClockDictionary = Record<string, NodeOutput>;

export type DiagramStyles = {
	backgroundColor: string;
	fontColor: string;
	circleColor: string;
	borderColor: string;
	icon?: string;
};

type NodeTerminal = {
	shape: string;
	x: number;
	y: number;
	radius: number;
	position: string;
	id: string;
	type: string;
	netID: string;
};

export type DiagramNode = {
	name: string;
	id: string;
	styles: DiagramStyles;
	icon: string;
	background: string;
	group: string;
	clockReference?: string;
	metadata: {
		name?: string;
		group: string;
		description?: string;
		type?: string;
		inputTerminals?: NodeTerminal[];
		outputTerminals?: NodeTerminal[];
	};
	condition?: string;
	mount?: string;
	enabled?: boolean;
	error?: boolean;
	outputTerminals?: Record<string, NodeTerminal>;
};

export type DiagramClocks = {
	id: string;
	netID: string;
	type: string;
	clock: string;
	condition?: string;
	enabled?: boolean;
	mount?: string;
	startPoint: CanvasClockCoordinates;
	endPoint: CanvasClockCoordinates;
};

export type CanvasClockCoordinates = {
	id: string;
	x: number;
	y: number;
};

export type DiagramData = {
	meta: Record<string, string>;
	parts: Record<string, DiagramNode>;
	wires: Record<string, DiagramClocks>;
	junctions: unknown;
	annotations: unknown;
	symbols: unknown;
};

export type Core = {
	Name: string;
	Description: string;
	Id: string;
	CoreNum: number;
	IsPrimary: boolean;
	Memory: MemoryBlock[];
};

export type MemoryBlock = {
	Name: string;
	Description: string;
	AddressStart: string;
	AddressEnd: string;
	Width: number;
	MinimumAlignment?: number;
	Access: string;
	Location: string;
	Type: string;
	TrustZone?: {
		SecureAddressOffset: string;
	};
};

export type MemoryType = {
	Name: string;
	Description: string;
	IsVolatile: boolean;
};
