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

import React, {CSSProperties, useMemo, useState} from 'react';
import {fn} from '@storybook/test';
import CheckBox from './checkbox';

const checkboxContainer: CSSProperties = {
	border: '1px solid #e0e0e0',
	borderRadius: '4px',
	padding: '16px'
};

const checkboxList: CSSProperties = {
	display: 'flex',
	flexDirection: 'column',
	gap: '8px',
	marginLeft: '30px',
	marginTop: '10px'
};

const meta: Meta<typeof CheckBox> = {
	component: CheckBox,
	title: 'CheckBox'
};

export default meta;

export function Default(args: React.ComponentProps<typeof CheckBox>) {
	return <CheckBox {...args}>Label</CheckBox>;
}

export function Indeterminate() {
	const [checkboxes, setCheckboxes] = useState<
		{id: number; name: string; checked: boolean}[]
	>([
		{
			id: 0,
			name: 'Pizza',
			checked: true
		},
		{
			id: 1,
			name: 'Pasta',
			checked: true
		},
		{
			id: 2,
			name: 'Salad',
			checked: true
		}
	]);

	const onCheckboxChange = useMemo(
		() =>
			(event: Event | React.FormEvent<HTMLElement>, id: number) => {
				const {target} = event as React.ChangeEvent<HTMLInputElement>;
				const updatedItems = checkboxes.map(item =>
					item.id === id ? {...item, checked: target.checked} : item
				);

				setCheckboxes(() => updatedItems);
			},
		[checkboxes]
	);

	const computeValue = useMemo(() => {
		return checkboxes.every(item => item.checked);
	}, [checkboxes]);

	const computeIndeterminate = useMemo(() => {
		const someTrue = checkboxes.some(item => item.checked);
		const someFalse = checkboxes.some(item => !item.checked);

		return someTrue && someFalse;
	}, [checkboxes]);

	const onGroupCheckboxChange = useMemo(
		() => (event: Event | React.FormEvent<HTMLElement>) => {
			const {target} = event as React.ChangeEvent<HTMLInputElement>;
			const updatedValues = checkboxes.map(item => ({
				...item,
				checked: target.checked
			}));

			setCheckboxes(() => updatedValues);
		},
		[checkboxes]
	);

	return (
		<div style={checkboxContainer}>
			<div>
				<CheckBox
					checked={computeValue}
					indeterminate={computeIndeterminate}
					onClick={ev => {
						onGroupCheckboxChange(ev);
					}}
				>
					Foods
				</CheckBox>
			</div>
			<div style={checkboxList}>
				{checkboxes.map(item => (
					<CheckBox
						key={item.id}
						checked={item.checked}
						onClick={ev => {
							onCheckboxChange(ev, item.id);
						}}
					>
						{item.name}
					</CheckBox>
				))}
			</div>
		</div>
	);
}

Default.args = {
	checked: true,
	onclick: fn(),
	onChange: fn(),
	dataTest: 'test'
};
