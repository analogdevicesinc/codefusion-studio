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
import TextArea from './text-area.js';

const meta: Meta<typeof TextArea> = {
	component: TextArea,
	title: 'Text Area',
	argTypes: {
		direction: {
			control: 'select',
			options: ['horizontal', 'vertical', 'none', 'both']
		}
	}
};

export default meta;

export function Default(args: React.ComponentProps<typeof TextArea>) {
	return <TextArea {...args} />;
}

Default.args = {
	value: 'default value',
	placeholder: '',
	error: '',
	name: '',
	direction: 'vertical',
	maxlength: 10,
	rows: 3,
	cols: 3,
	autofocus: false,
	disabled: false,
	form: 'formId',
	dataTest: 'textarea-id',
	onInputChange: fn()
};

export function WithError(
	args: React.ComponentProps<typeof TextArea>
) {
	return <TextArea {...args} />;
}

WithError.args = {
	value: '',
	placeholder: '',
	error: 'Mandatory field.',
	name: '',
	direction: 'horizontal',
	maxlength: 10,
	rows: 3,
	cols: 3,
	autofocus: false,
	disabled: false,
	form: 'formId',
	dataTest: 'textarea-id',
	onInputChange: (value: string) => console.log(value)
};
