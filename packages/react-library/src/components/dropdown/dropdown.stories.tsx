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

import type {Meta} from '@storybook/react';

import React from 'react';
import {fn} from '@storybook/test';
import DropDown, {DropDownOptions} from './dropdown';

const meta: Meta<typeof DropDown> = {
	component: DropDown,
	title: 'Dropdown'
};

export default meta;

export function Default(args: React.ComponentProps<typeof DropDown>) {
	return <DropDown {...args} />;
}

export function WithOptionGroups(
	args: React.ComponentProps<typeof DropDown>
) {
	return <DropDown {...args} />;
}

const options: DropDownOptions = [
	{label: '1', value: 'Value 1'},
	{label: '2', value: 'Value 2'},
	{label: '3', value: 'Value 3'}
];

const groupedOptions: DropDownOptions = [
	{label: 'Ungrouped', value: 'ungrouped'},
	{
		label: 'First grouped option',
		value: 'first',
		optionGroup: 'Group A'
	},
	{
		label: 'Second grouped option',
		value: 'second',
		optionGroup: 'Group A'
	},
	{
		label: 'Another group option',
		value: 'third',
		optionGroup: 'Group B'
	}
];

WithOptionGroups.args = {
	controlId: 'GroupedTest',
	isDisabled: false,
	currentControlValue: groupedOptions[0].value,
	options: groupedOptions,
	onHandleDropdown: fn()
};

Default.args = {
	controlId: 'Test',
	isDisabled: false,
	currentControlValue: options[0].value,
	options,
	onHandleDropdown: fn()
};
