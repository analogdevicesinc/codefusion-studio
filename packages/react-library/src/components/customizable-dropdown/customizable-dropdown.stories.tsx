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

import {CustomizableDropdown} from './customizable-dropdown.js';

const meta: Meta<typeof CustomizableDropdown> = {
	component: CustomizableDropdown,
	title: 'Customizable Dropdown'
};

export default meta;

export function Default(
	args: React.ComponentProps<typeof CustomizableDropdown>
) {
	return <CustomizableDropdown {...args} />;
}

Default.args = {
	value: 'no selection',
	children: <p>Add Custom dropdown content here</p>,
	startSlot: <p>start:</p>
};

export function Scroll(
	args: React.ComponentProps<typeof CustomizableDropdown>
) {
	return (
		<div style={{height: '100%', overflowY: 'scroll'}}>
			<div style={{height: '80vh'}}></div>
			<CustomizableDropdown {...args} />
			<div style={{height: '80vh'}}></div>
		</div>
	);
}

Scroll.args = {
	value: 'no selection',
	children: <p>Add Custom dropdown content here</p>
};
