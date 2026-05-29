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
	title: 'Components/Text Field',
	argTypes: {
		inputVal: {control: 'text'},
		label: {control: 'text'},
		optional: {control: 'boolean'},
		placeholder: {control: 'text'},
		isDisabled: {control: 'boolean'},
		error: {control: 'text'},
		startSlot: {control: 'text'},
		endSlot: {control: 'text'},
		direction: {
			control: 'radio',
			options: ['vertical', 'horizontal']
		},
		fullWidth: {control: 'boolean'},
		onInputChange: {action: 'inputChange'},
		onBeforeInput: {action: 'beforeInput'},
		onKeyUp: {action: 'keyUp'},
		onKeyDown: {action: 'keyDown'},
		onFocus: {action: 'focus'}
	}
};

export default meta;

export function Default(
	args: React.ComponentProps<typeof TextField>
) {
	return <TextField {...args} />;
}

Default.args = {
	inputVal: '',
	label: 'Label',
	placeholder: 'Placeholder text',
	optional: false,
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

export function WithError(
	args: React.ComponentProps<typeof TextField>
) {
	return <TextField {...args} />;
}

WithError.args = {
	inputVal: 'mail@ domain.com',
	label: 'Email address',
	placeholder: 'Placeholder text',
	optional: false,
	isDisabled: false,
	error: 'Invalid email address',
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

export function Horizontal(
	args: React.ComponentProps<typeof TextField>
) {
	return <TextField {...args} />;
}

Horizontal.args = {
	inputVal: '',
	label: 'Label',
	placeholder: 'Placeholder text',
	optional: false,
	isDisabled: false,
	error: '',
	startSlot: '',
	endSlot: '',
	direction: 'horizontal',
	fullWidth: true,
	onInputChange: (e: string) => console.log(e),
	onBeforeInput: fn(),
	onKeyUp: fn(),
	onKeyDown: fn(),
	onFocus: fn()
};

export function FullWidth(
	args: React.ComponentProps<typeof TextField>
) {
	return (
		<div
			style={{
				display: 'flex'
			}}
		>
			<h3
				style={{
					flex: 0.2
				}}
			>
				Sub-header
			</h3>
			<TextField {...args} />
		</div>
	);
}

FullWidth.args = {
	inputVal: '',
	label: '',
	placeholder: 'Placeholder text',
	optional: false,
	isDisabled: false,
	error: '',
	startSlot: '',
	endSlot: '',
	direction: 'vertical',
	fullWidth: true,
	onInputChange: (e: string) => console.log(e),
	onBeforeInput: fn(),
	onKeyUp: fn(),
	onKeyDown: fn(),
	onFocus: fn()
};
