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
import Card from './card';

const meta: Meta<typeof Card> = {
	component: Card,
	title: 'Card'
};

export default meta;

export function Default(args: React.ComponentProps<typeof Card>) {
	return (
		<Card {...args}>
			<h1
				style={{
					color: 'var(--vscode-editor-foreground)',
					fontFamily: 'sans-serif'
				}}
			>
				Hello from Card!
			</h1>
		</Card>
	);
}

Default.args = {
	id: '1',
	ariaLabel: '',
	testId: '',
	isActive: true
};
