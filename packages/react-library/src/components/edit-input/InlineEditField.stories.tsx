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

import type {Meta} from '@storybook/react';
import React, {useState} from 'react';
import {fn} from '@storybook/test';
import InlineEditField from './InlineEditField.js';

const meta: Meta<typeof InlineEditField> = {
	component: InlineEditField,
	title: 'Inline Edit Field'
};

export default meta;

export function Default(
	args: React.ComponentProps<typeof InlineEditField>
) {
	const [value, setValue] = useState(args.inputVal ?? '');

	return (
		<InlineEditField
			{...args}
			inputVal={value}
			onInputChange={(newValue: string) => {
				setValue(newValue);
				args.onInputChange?.(newValue);
			}}
			onConfirm={() => {
				args.onConfirm?.();
			}}
			onCancel={() => {
				args.onCancel?.();
				setValue(args.inputVal ?? '');
			}}
		/>
	);
}

Default.args = {
	inputVal: 'Edit this text',
	placeholder: 'Enter text here',
	disabled: false,
	onConfirm: fn(),
	onCancel: fn(),
	onInputChange: fn(),
	onFocus: fn()
};

export function WithLabel(
	args: React.ComponentProps<typeof InlineEditField>
) {
	const [value, setValue] = useState(args.inputVal ?? '');

	return (
		<InlineEditField
			{...args}
			inputVal={value}
			onInputChange={(newValue: string) => {
				setValue(newValue);
				args.onInputChange?.(newValue);
			}}
			onConfirm={() => {
				args.onConfirm?.();
			}}
			onCancel={() => {
				args.onCancel?.();
				setValue(args.inputVal ?? '');
			}}
		/>
	);
}

WithLabel.args = {
	inputVal: 'Package Name',
	label: 'Package Name',
	placeholder: 'Enter package name',
	disabled: false,
	onConfirm: fn(),
	onCancel: fn(),
	onInputChange: fn(),
	onFocus: fn()
};

export function Disabled(
	args: React.ComponentProps<typeof InlineEditField>
) {
	const [value, setValue] = useState(args.inputVal ?? '');

	return (
		<InlineEditField
			{...args}
			inputVal={value}
			disabled={true}
			onInputChange={(newValue: string) => {
				setValue(newValue);
				args.onInputChange?.(newValue);
			}}
			onConfirm={() => args.onConfirm?.()}
			onCancel={() => {
				args.onCancel?.();
				setValue(args.inputVal ?? '');
			}}
		/>
	);
}

Disabled.args = {
	inputVal: 'Disabled content',
	placeholder: 'This field is disabled',
	label: 'Disabled Field',
	disabled: true,
	onConfirm: fn(),
	onCancel: fn(),
	onInputChange: fn(),
	onFocus: fn()
};

export function Empty(
	args: React.ComponentProps<typeof InlineEditField>
) {
	const [value, setValue] = useState('');

	return (
		<InlineEditField
			{...args}
			inputVal={value}
			onInputChange={(newValue: string) => {
				setValue(newValue);
				args.onInputChange?.(newValue);
			}}
			onConfirm={() => {
				args.onConfirm?.();
			}}
			onCancel={() => {
				args.onCancel?.();
				setValue('');
			}}
		/>
	);
}

Empty.args = {
	inputVal: '',
	label: 'Add Description',
	placeholder: 'Click to add a description',
	disabled: false,
	onConfirm: fn(),
	onCancel: fn(),
	onInputChange: fn(),
	onFocus: fn()
};
