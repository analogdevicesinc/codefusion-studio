/**
 *
 * Copyright (c) 2024 Analog Devices, Inc.
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
type SocAddress = string;
type SocValue = string;

export type Soc = {
  Copyright: string;
  Version: string;
  Timestamp: string;
  Name: string;
  Description: string;
  Controls: {
    PinConfig: SocControl[];
    ClockConfig: SocControl[];
  };
  Peripherals: SocPeripheral[];
  ClockNodes: SocClock[];
  Packages: SocPackage[];
  Registers: SocRegister[];
  Schema: string;
};

export type SocControl = {
  Id: string;
  Description: string;
  Type: string;
  Units?: string;
  EnumValues?: SocControlValue[];
  Condition?: string;
};

export type SocControlValue = {
  Id: string;
  Description: string;
  Zephyr: string;
};

type SocPackage = {
  Name: string;
  Description: string;
  NumPins: number;
  Pins: SocPin[];
};

export type SocPin = {
  Name: string;
  Label: string;
  Description: string;
  Position: {
    X: number;
    Y: number;
  };
  Shape: string;
  GPIOPort: string;
  GPIOPin: number;
  GPIOName: string;
  Signals: SocPinSignal[];
};

export type SocPinConfig = {
  Register: string;
  Field: string;
  Value: number;
  Operation?: string;
};

export type SocPinSignal = {
  Peripheral: string;
  Name: string;
  PinMuxSlot: number;
  PinMuxConfig: SocPinSignalConfig[];
  PinConfig: Record<string, Record<string, SocPinConfig[]>>;
  PinMuxNameZephyr?: string;
};

type SocPinSignalConfig = {
  Register: string;
  Field: string;
  Value: number;
  Operation?: string;
};

export type SocClockNode = {
  Name: string;
  Description: string,
  Config: Record<string, Record<string, SocPinConfig[]>>;
};

export type SocConfigZephyr = {
  Code?: string;
  Peripheral?: string;
  Clock?: string;
  Default?: boolean;
  Diagnostic?: string;
};

export type SocRegister = {
  Name: string;
  Description: string;
  Address: SocAddress;
  Size: number;
  Fields: SocRegisterField[];
};

export type SocRegisterField = {
  Name: string;
  Description: string;
  Position: number;
  Length: number;
  Reset: SocValue;
};

type SocPeripheralZephyr = {
  Name?: string;
  Header?: string;
  ConfigMacros?: string[];
  Diagnostic?: string;
  ClocksSection?: boolean;
  AlwaysEmitPinctrl0?: boolean;
};

export type SocPeripheral = {
  Name: string;
  Zephyr?: SocPeripheralZephyr;
  Description: string;
  Signals: SocPeripheralSignalConfig[];
  Initialization?: SocPeripheralInitializationConfig[];
};

type SocPeripheralSignalConfig = {
  Name: string;
  Description: string;
};

type SocPeripheralInitializationConfig = SocPinSignalConfig;

export type SocClock = {
  Name: string;
  Description: string;
  Type: string;
  Inputs: ClockInput[];
  Outputs: ClockOutput[];
  Config?: ClockConfig;
  ConfigUIOrder?: Array<string>;
  ConfigProgrammingOrder?: Array<string>;
  ConfigMSDK?: ConfigMSDK;
  ConfigZephyr?: Record<string, Record<string, SocConfigZephyr>>;
};

type ClockInput = {
  Name: string;
};

type ClockOutput = {
  Name: string;
  Description: string;
  Value: string;
};

type NestedConfig = {
  [key: string]: [] | ClockRegister[] | NestedConfig;
};

type ClockConfig = {
  [key: string]: NestedConfig;
};

type ClockRegister = {
  Register?: string;
  Field: string;
  Value: number;
  Operation?: string;
};

type ConfigCode = {
  Code: string;
  Epilog: string;
  Headers: Array<string>;
};

type NestedConfigMSDK = {
  [key: string]: ConfigCode | NestedConfigMSDK;
};

type ConfigMSDK = {
  [key: string]: NestedConfigMSDK | Record<string, never>;
};
