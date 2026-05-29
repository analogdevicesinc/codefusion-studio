/**
 *
 * Copyright (c) 2025 Analog Devices, Inc.
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

import React, {useState} from 'react';
import IntegerField from './integer-field';
import type {Meta} from '@storybook/react';

type Props = React.ComponentProps<typeof IntegerField>;

const meta: Meta<Props> = {
	title: 'Components/Integer Field',
	component: IntegerField,
	argTypes: {
		value: {
			control: {type: 'number'}
		},
		step: {
			control: {type: 'number'}
		},
		min: {
			control: {type: 'number'}
		},
		max: {
			control: {type: 'number'}
		},
		allowNegative: {
			control: 'boolean'
		},
		label: {
			control: 'text'
		},
		optional: {
			control: 'boolean'
		},
		isDisabled: {
			control: 'boolean'
		},
		placeholder: {
			control: 'text'
		},
		direction: {
			control: 'radio',
			options: ['vertical', 'horizontal']
		},
		fullWidth: {
			control: 'boolean'
		},
		error: {
			control: 'text'
		}
	},
	parameters: {
		layout: 'centered'
	}
};

export default meta;

export const Default = (args: Props) => {
	const [val, setVal] = useState<number>(args.value);

	return (
		<IntegerField
			{...args}
			value={val}
			onValueChange={newVal => {
				setVal(newVal);
			}}
		/>
	);
};

Default.args = {
	label: 'Temperature (°C)',
	placeholder: 'Enter a number…',
	direction: 'vertical',
	value: 20,
	step: 1,
	allowNegative: false
};

export const WithError = (args: Props) => {
	const [val, setVal] = useState<number>(args.value);

	return (
		<IntegerField
			{...args}
			value={val}
			onValueChange={newVal => {
				setVal(newVal);
			}}
			error={val === 0 ? 'Value cannot be zero' : undefined}
		/>
	);
};

WithError.args = {
	label: 'Pressure (bar)',
	direction: 'vertical',
	value: 0,
	allowNegative: true
};

export const WithStepper = (args: Props) => {
	const [val, setVal] = useState(args.value ?? 0);

	return (
		<IntegerField
			{...args}
			value={val}
			onValueChange={next => setVal(next)}
		/>
	);
};

WithStepper.args = {
	label: 'Input with stepper that allows negative values',
	direction: 'vertical',
	value: 0,
	step: 1,
	allowNegative: true
};

export const WithStepperEndSlot = (args: Props) => {
	const [val, setVal] = useState(args.value ?? 0);

	return (
		<IntegerField
			{...args}
			value={val}
			endSlot={<span>Hz</span>}
			onValueChange={next => setVal(next)}
		/>
	);
};

WithStepperEndSlot.args = {
	label: 'Frequency',
	direction: 'vertical',
	value: 0,
	step: 1,
	allowNegative: false
};

export const MinMax = (args: Props) => {
	const [val, setVal] = useState(args.value ?? 0);
	const [err, setErr] = useState<string>(args.error ?? '');

	const handleErrors = (value: number) => {
		if (value < (args.min ?? Number.NEGATIVE_INFINITY)) {
			setErr('Value is below minimum');
		} else if (value > (args.max ?? Number.POSITIVE_INFINITY)) {
			setErr('Value is above maximum');
		} else {
			setErr('');
		}
	};

	return (
		<IntegerField
			{...args}
			error={err}
			value={val}
			onValueChange={next => {
				setVal(next);
				handleErrors(next);
			}}
		/>
	);
};

MinMax.args = {
	label:
		'Input with min and max that allows stepper and negative values',
	direction: 'vertical',
	value: 0,
	step: 1,
	min: -3,
	max: 10,
	error: '',
	allowNegative: true
};
