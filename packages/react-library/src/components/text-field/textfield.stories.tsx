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

import type {Meta} from '@storybook/react';

import React from 'react';
import {fn} from '@storybook/test';
import TextField from './textfield';

const meta: Meta<typeof TextField> = {
	component: TextField,
	title: 'Text field'
};

export default meta;

export function Default(
	args: React.ComponentProps<typeof TextField>
) {
	return <TextField {...args} />;
}

Default.args = {
	inputVal: 'input',
	label: '',
	isDisabled: false,
	error: '',
	startSlot: '',
	endSlot: '',
	direction: 'vertical',
	fullWidth: false,
	onInputChange: (e: string) => console.log(e),
	onBeforeInput: fn(),
	onKeyUp: fn(),
	onKeyDown: fn(),
	onFocus: fn()
};
