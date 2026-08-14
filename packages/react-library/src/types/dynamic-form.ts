/**
 *
 * Copyright (c) 2025-2026 Analog Devices, Inc.
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

// The interface accepted by the dynamic form
export type TFormControl = {
	id: string;
	/** Property name */
	name: string;
	/** Property type; it tells the component what UI element to render */
	type: TFormControlType;
	/** Property numeric base */
	base?: TFormNumericBase;
	/** Properties specific to integer type */
	integer?: {
		/** Property minimum value */
		min?: number | string;
		/** Property maximum value */
		max?: number | string;
		/** Property step value */
		step?: number | string;
		/** Allow negative values  */
		allowNegative?: boolean;
	};
	/** Property description; only used for checkbox label */
	description?: string;
	/** Default value */
	default?: string | number | boolean;
	/** Placeholder text */
	placeholder?: string;
	/** Valid options, presented as a drop down list */
	enum?: Array<{
		label: string;
		value: string;
		disabled?: boolean;
		optionGroup?: string;
	}>;
	/** Disabled state of the control in the UI */
	disabled?: boolean;
	/** Required fields will be checked at runtime to ensure they are set */
	required?: boolean;
	/** Category of the control. Used for filtering purposes */
	pluginOption?: boolean;
	/** adds an info icon to the title with a tooltip showing the given text */
	info?: string;
};

export type TFormControlType =
	| 'string'
	| 'integer'
	| 'textarea'
	| 'boolean'
	| 'array'
	| (string & Record<never, never>); // For cases where we receive controls that will be added as custom component and we don't know the type

export type TFormData = Record<string, boolean | string | number>;

export type TFormFieldValue = TFormData[string];

export type TFormNumericBase =
	| 'Binary'
	| 'Decimal'
	| 'Octal'
	| 'Hexadecimal';
