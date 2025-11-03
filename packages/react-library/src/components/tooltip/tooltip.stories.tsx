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

import React, {useState} from 'react';
import Tooltip from './tooltip';
import InfoIcon from '../icons/info-icon';

const meta: Meta<typeof Tooltip> = {
	component: Tooltip,
	title: 'Tooltip'
};

export default meta;

export function Default(args: React.ComponentProps<typeof Tooltip>) {
	// Neccesary because storybook body has no height, so the tooltip would not be positioned correctly
	const [container, setContainer] = useState<HTMLElement | null>(
		null
	);
	return (
		<div
			style={{
				width: '100%',
				height: '100%',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center'
			}}
			ref={setContainer}
		>
			<div
				style={{
					width: 'fit-content'
				}}
			>
				<Tooltip {...args} containerElement={container}>
					<InfoIcon />
				</Tooltip>
			</div>
		</div>
	);
}

export function CloseToBorder(
	args: React.ComponentProps<typeof Tooltip>
) {
	// Neccesary because storybook body has no height, so the tooltip would not be positioned correctly
	const [container, setContainer] = useState<HTMLElement | null>();
	return (
		<div
			style={{
				width: '100%',
				height: '100%',
				border: '1px solid black'
			}}
			ref={setContainer}
		>
			{/* top left */}
			<div
				style={{
					width: 'fit-content'
				}}
			>
				<Tooltip {...args} containerElement={container}>
					<InfoIcon />
				</Tooltip>
			</div>
			{/* bottom left */}
			<div
				style={{
					width: 'fit-content',
					position: 'absolute',
					bottom: '16px'
				}}
			>
				<Tooltip {...args} containerElement={container}>
					<InfoIcon />
				</Tooltip>
			</div>
			{/* top right */}
			<div
				style={{
					width: 'fit-content',
					position: 'absolute',
					right: '16px',
					top: '16px'
				}}
			>
				<Tooltip {...args} containerElement={container}>
					<InfoIcon />
				</Tooltip>
			</div>
			{/* bottom right */}
			<div
				style={{
					width: 'fit-content',
					position: 'absolute',
					right: '16px',
					bottom: '16px'
				}}
			>
				<Tooltip {...args} containerElement={container}>
					<InfoIcon />
				</Tooltip>
			</div>
		</div>
	);
}

Default.args = {
	title: 'This is a tooltip',
	position: 'top'
};
CloseToBorder.args = {
	title: 'This is a tooltip',
	position: 'top'
};
