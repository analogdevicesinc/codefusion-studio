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
import type {
	CfsSocDataModel,
	SocClock,
	SocClockOutput,
	SocControl,
	SocControlValue,
	SocCoreMemory,
	SocCoreMemoryType,
	SocPin,
	SocPinSignal,
	SocConfigFields,
	SocConfigField,
	SocPeripheral,
	SocRegister,
	SocPackage,
	SocPinCanvas,
	SocDiagramData,
	SocCanvasClockCoordinates,
	SocDiagramClocks,
	SocDiagramNode,
	SocDiagramStyles,
	SocCore,
	SocGasketInputStream,
	SocGasketOutputStream,
	SocGasket
} from 'cfs-plugins-api';
import type {ControlErrorTypes} from '@common/types/errorTypes';

export type Soc = CfsSocDataModel;

export type SystemMemory = SocCoreMemory;

export type ClockNode = SocClock & {
	Outputs: ClockOutput[];
};

export type ClockOutput = SocClockOutput;

export type Controls = Record<string, ControlCfg[]>;

export type EnumValue = SocControlValue;

export type ControlCfg = SocControl & {
	Tooltip?: string;
};

export type Package = SocPackage;

export type PinCanvas = SocPinCanvas;

export type Pin = SocPin;

export type PinSignal = SocPinSignal;

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

export type Peripheral = SocPeripheral;

export type FormattedPeripheralSignal = {
	name: string;
	description: string;
	pins: Pin[];
	required?: string;
	group?: string;
};

export type FormattedPeripheral<T> = {
	name: string;
	description: string;
	signals: Record<string, T>;
	preassigned?: boolean;
	config?: SocConfigFields;
	pluginConfig?: Record<string, string>;
	cores?: string[];
	group?: string;
	assignable: boolean;
	required?: string[];
	security?: string;
	initialization?: SocConfigField[];
};

export type UnifiedPeripherals = Record<
	string,
	FormattedPeripheral<
		FormattedPeripheralSignal & {currentTarget?: string}
	>
>;

export type Register = SocRegister;

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
};

export type RegisterConfigField = SocConfigField & {
	ControlValue: number;
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

export type ClockDictionary = Record<string, ClockOutput>;

export type DiagramStyles = SocDiagramStyles;

export type DiagramNode = SocDiagramNode;
export type DiagramClocks = SocDiagramClocks;

export type CanvasClockCoordinates = SocCanvasClockCoordinates;

export type DiagramData = SocDiagramData;

export type Core = SocCore;

export type MemoryBlock = SocCoreMemory;

export type MemoryType = SocCoreMemoryType;

export type GasketInputStream = SocGasketInputStream;

export type GasketOutputStream = SocGasketOutputStream;

export type Gasket = SocGasket;

export type ConfigFields = SocConfigFields;
export type ConfigField = SocConfigField;

export type Expression = string;
