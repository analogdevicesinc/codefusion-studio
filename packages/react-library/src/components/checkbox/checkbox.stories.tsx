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
import CheckBox from './checkbox';

const meta: Meta<typeof CheckBox> = {
	component: CheckBox,
	title: 'CheckBox'
};

export default meta;

export function Default(args: React.ComponentProps<typeof CheckBox>) {
	return <CheckBox {...args} />;
}

Default.args = {
	checked: false,
	onclick: fn(),
	onChange: fn(),
	dataTest: 'test'
};
