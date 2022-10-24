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
export enum ShortDescErrors {
	INVALID_INTEGER = 'Invalid input type',
	INVALID_IDENTIFIER = 'Invalid C identifier',
	INVALID_MIN_VAL = 'Entered value is too low',
	INVALID_MAX_VAL = 'Entered value is too high',
	UNCONFIGURED_VALUE = 'Unconfigured value detected',
	HIGH_COMPUTED_VALUE = 'Computed value too high',
	LOW_COMPUTED_VALUE = 'Computed value too low'
}

export type ControlErrorTypes =
	| 'INVALID_INTEGER'
	| 'INVALID_IDENTIFIER'
	| 'INVALID_MIN_VAL'
	| 'INVALID_MAX_VAL';

export type NodeErrorTypes =
	| ControlErrorTypes
	| 'UNCONFIGURED_VALUE'
	| 'HIGH_COMPUTED_VALUE'
	| 'LOW_COMPUTED_VALUE';
