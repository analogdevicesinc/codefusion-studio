/**
 *
 * Copyright (c) 2024-2026 Analog Devices, Inc.
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
import Accordion from './accordion';

const meta: Meta<typeof Accordion> = {
	component: Accordion,
	title: 'Accordion'
};

export default meta;

export function Default(
	args: React.ComponentProps<typeof Accordion>
) {
	const [open, setOpen] = React.useState(args.open ?? false);

	return (
		<Accordion {...args} open={open} onToggle={() => setOpen(!open)}>
			<p>Accordion content goes here</p>
			<p>here is some longer content as well </p>
		</Accordion>
	);
}

Default.args = {
	dataTest: 'accordion-test',
	title: 'Accordion Title'
};
