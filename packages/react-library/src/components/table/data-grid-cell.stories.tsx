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
import DataGridCell from './data-grid-cell';

const meta: Meta<typeof DataGridCell> = {
	component: DataGridCell,
	title: 'DataGridCell'
};

export default meta;

export function Default(
	args: React.ComponentProps<typeof DataGridCell>
) {
	return <DataGridCell {...args} />;
}

Default.args = {
	cellType: 'default',
	key: 'default-data-grid-cell',
	dataTest: 'test',
	onClick: fn(),
	onMouseEnter: fn(),
	onMouseLeave: fn()
};
