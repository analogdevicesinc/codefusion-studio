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
import React, {useState} from 'react';
import {ContextMenu} from './context-menu';
import {Button} from '../../main';

const meta: Meta<typeof ContextMenu> = {
	component: ContextMenu,
	title: 'Context Menu'
};

export default meta;

export function RightClickMenu(
	args: Omit<
		React.ComponentProps<typeof ContextMenu>,
		'anchor' | 'open' | 'onClose'
	>
) {
	const [open, setOpen] = useState(false);
	const [anchor, setAnchor] = useState<
		HTMLElement | {x: number; y: number} | undefined
	>(undefined);

	// Open menu from right-click zone
	const handleZoneContextMenu = (
		e: React.MouseEvent<HTMLDivElement>
	) => {
		e.preventDefault();
		setAnchor({x: e.clientX, y: e.clientY});
		setOpen(true);
	};

	return (
		<div>
			<div
				onContextMenu={handleZoneContextMenu}
				style={{
					width: '100%',
					height: 'calc(100vh - 32px)',
					border: '2px dashed #888',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					color: '#888',
					userSelect: 'none'
				}}
			>
				Right-click in this zone
			</div>
			<ContextMenu
				anchor={anchor}
				options={args.options}
				open={open}
				onClose={() => setOpen(false)}
				preferredPlacement={args.preferredPlacement}
			/>
		</div>
	);
}

export function AnchorElementsMenu(
	args: Omit<
		React.ComponentProps<typeof ContextMenu>,
		'anchor' | 'open' | 'onClose'
	>
) {
	const [open, setOpen] = useState(false);
	const [anchor, setAnchor] = useState<
		HTMLElement | {x: number; y: number} | undefined
	>(undefined);

	// Open menu from button
	const handleButtonClick = (
		e: React.MouseEvent<HTMLButtonElement>
	) => {
		setAnchor(e.currentTarget ?? undefined);
		setOpen(true);
	};

	return (
		<div
			style={{
				padding: 16,
				display: 'flex',
				justifyContent: 'space-between',
				height: 'calc(100% - 32px)'
			}}
		>
			<div>
				<Button onClick={handleButtonClick} appearance='secondary'>
					...
				</Button>
			</div>
			<div style={{alignSelf: 'center'}}>
				<Button onClick={handleButtonClick} appearance='secondary'>
					...
				</Button>
			</div>
			<div style={{alignSelf: 'flex-end'}}>
				<Button onClick={handleButtonClick} appearance='secondary'>
					...
				</Button>
			</div>

			<ContextMenu
				anchor={anchor}
				options={args.options}
				open={open}
				onClose={() => setOpen(false)}
				preferredPlacement={args.preferredPlacement}
			/>
		</div>
	);
}

const defaultOptions = [
	{
		id: 'edit',
		label: 'Edit',
		onClick: () => alert('Edit clicked')
	},
	{
		id: 'delete',
		label: 'Delete',
		onClick: () => alert('Delete clicked')
	},
	'divider',
	{
		id: 'long-option',
		label: 'A very looooooooong option',
		onClick: () => alert('long option clicked')
	}
];

RightClickMenu.args = {
	options: defaultOptions
};

AnchorElementsMenu.args = {
	options: defaultOptions
};
