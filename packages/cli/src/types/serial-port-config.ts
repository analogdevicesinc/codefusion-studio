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

export const VALID_DATA_BITS = [5, 6, 7, 8] as const;
export const VALID_STOP_BITS = [1, 1.5, 2] as const;
export const VALID_PARITY = ['even', 'none', 'odd'] as const;

export type DataBits = (typeof VALID_DATA_BITS)[number];
export type StopBits = (typeof VALID_STOP_BITS)[number];
export type Parity = (typeof VALID_PARITY)[number];

export function isDataBits(value: number): value is DataBits {
  return (VALID_DATA_BITS as readonly number[]).includes(value);
}

export function isStopBits(value: number): value is StopBits {
  return (VALID_STOP_BITS as readonly number[]).includes(value);
}

export function isParity(value: string): value is Parity {
  return (VALID_PARITY as readonly string[]).includes(value);
}

export type SerialPortConfig = {
  baudRate?: number;
  dataBits?: DataBits;
  parity?: Parity;
  stopBits?: StopBits;
};

export type ValidSerialPortConfig = Required<SerialPortConfig>;
