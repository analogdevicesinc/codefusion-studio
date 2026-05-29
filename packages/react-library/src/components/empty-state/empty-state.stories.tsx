/**
 *
 * Copyright (c) 2025-2026 Analog Devices, Inc.
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
import EmptyState from './empty-state';
import Button from '../button/button';

const meta: Meta<typeof EmptyState> = {
	component: EmptyState,
	title: 'EmptyState'
};

export default meta;

export function Default(
	args: React.ComponentProps<typeof EmptyState>
) {
	return (
		<EmptyState {...args}>
			<div slot='footer'>
				<Button type='button' appearance='primary'>
					Call to Action
				</Button>
			</div>
		</EmptyState>
	);
}

Default.args = {
	type: 'info',
	title: 'No Data Available',
	description:
		'There is currently no data to display. Please check back later.'
};
