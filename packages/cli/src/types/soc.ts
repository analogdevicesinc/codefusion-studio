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
type SocAddress = string;
type SocValue = string;

export type Soc = {
  Copyright: string;
  Version: string;
  Timestamp: string;
  Name: string;
  Description: string;
  Cores: SocCore[];
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

export type SocCore = {
  Id: string;
}

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

export type ConfigField = {
  Register: string;
  Field: string;
  Value: number;
  Operation?: string;
};

export type SocPinSignal = {
  Peripheral: string;
  Name: string;
  PinMuxSlot: number;
  PinMuxConfig: ConfigField[];
  PinConfig: Record<string, Record<string, ConfigField[]>>;
};

export type SocClockNode = {
  Name: string;
  Description: string;
  Config: Record<string, Record<string, ConfigField[]>>;
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

export type SocPeripheral = {
  Name: string;
  Security?: string;
  Description: string;
  Signals: SocPeripheralSignalConfig[];
  Initialization?: ConfigField[];
};

type SocPeripheralSignalConfig = {
  Name: string;
  Description: string;
};

export type SocClock = {
  Name: string;
  Description: string;
  Type: string;
  Inputs: ClockInput[];
  Outputs: ClockOutput[];
  Config?: ClockConfig;
  ConfigUIOrder?: Array<string>;
  ConfigProgrammingOrder?: Array<string>;
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
  [key: string]: [] | ConfigField[] | NestedConfig;
};

type ClockConfig = {
  [key: string]: NestedConfig;
};
