/* eslint-disable @typescript-eslint/no-explicit-any */
import type {Meta} from '@storybook/react';

import React, {useState} from 'react';
import {CSSProperties} from 'react';
import mdx from './dynamic-form.mdx';
import DynamicForm from './dynamic-form.js';
import {
	TFormControl,
	TFormData,
	TFormFieldValue
} from '../../main.js';

const wrapperStyles: CSSProperties = {
	display: 'flex',
	flexDirection: 'column',
	gap: '16px',
	border: '1px solid #e0e0e0',
	borderRadius: '4px',
	padding: '16px'
};

const meta: Meta<typeof DynamicForm> = {
	component: DynamicForm,
	title: 'Components/Dynamic Form',
	parameters: {
		docs: {
			page: mdx
		}
	}
};

export default meta;

export function SimpleForm(
	args: React.ComponentProps<typeof DynamicForm>
) {
	const [formData, setFormData] = useState(args.data);

	const handleControlChange = (
		controlId: string,
		value: TFormFieldValue
	) => {
		setFormData((prevData: TFormData) => ({
			...prevData,
			[controlId]: value
		}));
	};

	return (
		<div style={wrapperStyles}>
			<DynamicForm
				{...args}
				data={formData}
				onControlChange={handleControlChange}
			/>
		</div>
	);
}

SimpleForm.args = {
	controls: [
		{
			id: 'firstName',
			name: 'First Name',
			default: '',
			type: 'string',
			required: true,
			disabled: false
		},
		{
			id: 'lastName',
			name: 'Last Name',
			default: '',
			type: 'string',
			required: true,
			readonly: false,
			disabled: false
		},
		{
			id: 'age',
			name: 'Age',
			description: '',
			default: 20,
			type: 'number',
			required: true,
			disabled: false
		},
		{
			id: 'terms-conditions',
			name: '',
			description: 'Terms and Conditions',
			default: true,
			type: 'boolean',
			required: true,
			disabled: false
		},
		{
			id: 'favoriteFoods',
			name: 'Favorite Food',
			default: '',
			type: 'array',
			enum: [
				{
					value: 'pizza',
					label: 'Pizza'
				},
				{
					value: 'pasta',
					label: 'Pasta'
				},
				{
					value: 'salad',
					label: 'Salad'
				}
			],
			required: true,
			disabled: false
		},
		{
			id: 'summary',
			name: 'About me',
			default: '',
			type: 'textarea',
			required: false,
			disabled: false
		}
	],
	data: {
		firstName: 'John',
		lastName: 'Doe',
		age: 20,
		'terms-conditions': true,
		favoriteFoods: 'pizza',
		summary: 'John Doe likes sports (this field is optional)'
	},
	onControlChange: () => {}
};

export function EnablePath(
	args: React.ComponentProps<typeof DynamicForm>
) {
	const [formValue, setFormValue] = useState<TFormData>(args.data);
	const [controls, setControls] = useState<TFormControl[]>(
		args.controls
	);

	const handleControlChange = (
		controlId: string,
		value: TFormFieldValue
	) => {
		if (controlId === 'enabler') {
			setControls(prevControls =>
				prevControls.map(item =>
					item.id === 'buildLogPath'
						? {...item, disabled: !value}
						: item
				)
			);
		}

		setFormValue((prev: any) => ({
			...prev,
			[controlId]: value
		}));
	};

	return (
		<div style={wrapperStyles}>
			<DynamicForm
				{...args}
				controls={controls}
				data={formValue}
				onControlChange={handleControlChange}
			/>
		</div>
	);
}

EnablePath.args = {
	controls: [
		{
			id: 'enabler',
			name: '',
			description: 'Enable the path',
			default: false,
			type: 'boolean',
			required: true,
			disabled: false
		},
		{
			id: 'buildLogPath',
			name: 'Build Log Path',
			default: '',
			type: 'string', // This should be the BrowseFile component, 'file' type
			required: true,
			disabled: true
		}
	],
	data: {
		enabler: false,
		buildLogPath: '/path/to/build/log'
	},
	onControlChange: () => {}
};
