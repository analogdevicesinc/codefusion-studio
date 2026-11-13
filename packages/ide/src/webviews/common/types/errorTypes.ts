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
import type {
	ControlErrorTypes as Errors,
	SocControlType,
	SocNumericBase
} from 'cfs-types';

export enum ShortDescErrors {
	INVALID_INTEGER = 'Invalid input type',
	INVALID_TEXT = 'Invalid format for field',
	INVALID_MIN_VAL = 'Entered value is too low',
	INVALID_MAX_VAL = 'Entered value is too high',
	UNCONFIGURED_VALUE = 'Unconfigured value detected',
	HIGH_COMPUTED_VALUE = 'Computed value too high',
	LOW_COMPUTED_VALUE = 'Computed value too low'
}

export type ControlErrorTypes = Errors;

export type NodeErrorTypes =
	| ControlErrorTypes
	| 'UNCONFIGURED_VALUE'
	| 'HIGH_COMPUTED_VALUE'
	| 'LOW_COMPUTED_VALUE';

/**
 * The control kinds the form layer renders.
 *
 * A superset of {@link SocControlType}: `text_list` and `number` are webview
 * form concepts that no SoC data model can declare, since the data model
 * schema permits only the four kinds in that union.
 */
export type TControlTypes = SocControlType | 'text_list' | 'number';

export type TNumericBase = SocNumericBase;
