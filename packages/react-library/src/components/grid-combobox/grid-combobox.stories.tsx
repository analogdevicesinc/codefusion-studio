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

import {GridCombobox} from './grid-combobox.js';

import styles from './grid-combobox.module.scss';
import SearchIcon from '../icons/search-icon.js';
import React from 'react';
import {fn} from '@storybook/test';

const meta: Meta<typeof GridCombobox> = {
	component: GridCombobox,
	title: 'GridCombobox'
};

export default meta;

export function Default(
	args: React.ComponentProps<typeof GridCombobox>
) {
	return (
		<div className={styles.navigationBoxesContainer}>
			<GridCombobox {...args} />
		</div>
	);
}

Default.args = {
	headings: ['Name', 'Description'],
	grid: [
		[
			'MAX32690',
			'Arm Cortex-M4 with FPU Microcontroller and Bluetooth LE 5 for Industrial and Wearables'
		],
		[
			'MAX78002',
			'Artificial Intelligence Microcontroller with Low-Power Convolutional Neural Network Accelerator. A New Breed of AI Micro Built to Enable Neural Networks to Execute at Ultra-Low Power'
		]
	],
	placeholder: 'Placeholder text...',
	prefixIcon: React.createElement(SearchIcon),
	onClear: fn(),
	onInput: fn(),
	onRowSelection: fn()
};
