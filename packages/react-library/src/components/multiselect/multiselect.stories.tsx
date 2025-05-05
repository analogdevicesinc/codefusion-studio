/**
 *
 * Copyright (c) 2024 - 2025 Analog Devices, Inc.
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

import MultiSelect from './multiselect';
import {fn} from '@storybook/test';

const meta: Meta<typeof MultiSelect> = {
	component: MultiSelect,
	title: 'Multi Select Dropdown'
};

export default meta;

export function Default(
	args: React.ComponentProps<typeof MultiSelect>
) {
	return <MultiSelect {...args} />;
}

const options = [
	{label: 'Option 1', value: 'Value 1'},
	{label: 'Option 2', value: 'Value 2'},
	{label: 'Option 3', value: 'Value 3'},
	{label: 'Option 4', value: 'Value 4'},
	{label: 'Option 5', value: 'Value 5'}
];

Default.args = {
	dropdownText: 'Cores selected',
	options: options,
	initialSelectedOptions: [],
	variant: 'default',
	chipText: '',
	onSelection: fn()
};
