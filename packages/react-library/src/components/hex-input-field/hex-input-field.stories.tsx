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

import type {Meta} from '@storybook/react';
import HexInputField from './hex-input-field';
import {fn} from '@storybook/test';
import {useState} from 'react';

const meta: Meta<typeof HexInputField> = {
	component: HexInputField,
	title: 'HexInputField'
};

export default meta;

export function Default(
	args: React.ComponentProps<typeof HexInputField>
) {
	const [stepperValue, setStepperValue] = useState('');

	return (
		<div>
			<HexInputField
				{...args}
				value={stepperValue}
				onValueChange={(value: string) => {
					setStepperValue(value);
				}}
			/>
		</div>
	);
}

Default.args = {
	error: '',
	onValueChange: fn()
};
