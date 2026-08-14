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
import React from 'react';
import {fn} from '@storybook/test';
import ButtonWithOptions from './button-with-options';

const meta: Meta<typeof ButtonWithOptions> = {
	component: ButtonWithOptions,
	title: 'ButtonWithOptions'
};

export default meta;

export function Default(
	args: React.ComponentProps<typeof ButtonWithOptions>
) {
	return <ButtonWithOptions {...args} />;
}

Default.args = {
	children: 'Run',
	appearance: 'primary',
	dropdownLabel: '',
	onMainAction: fn(),
	onOptionSelect: fn(),
	options: [
		{id: 'build', label: 'Build', onClick: fn()},
		{id: 'flash', label: 'Flash', onClick: fn()},
		'divider',
		{id: 'settings', label: 'Settings', onClick: fn()}
	]
};
