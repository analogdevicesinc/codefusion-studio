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
import AdaptiveToolbar, {
	type ToolbarAction
} from './adaptive-toolbar';
import CopyIcon from '../icons/copy-icon';
import DeleteIcon from '../icons/delete-icon';
import RefreshIcon from '../icons/refresh-icon';
import SettingsIcon from '../icons/settings-icon';
import SearchIcon from '../icons/search-icon';
import PlusIcon from '../icons/plus-icon';
import ExportIcon from '../icons/export-icon';

const meta: Meta<typeof AdaptiveToolbar> = {
	component: AdaptiveToolbar,
	title: 'Adaptive Toolbar'
};

export default meta;

const sampleActions: ToolbarAction[] = [
	{
		id: 'add',
		label: 'Add',
		icon: <PlusIcon />,
		action: () => alert('Add clicked')
	},
	{
		id: 'search',
		label: 'Search',
		icon: <SearchIcon />,
		action: () => alert('Search clicked')
	},
	{
		id: 'copy',
		label: 'Copy',
		icon: <CopyIcon />,
		action: () => alert('Copy clicked')
	},
	{
		id: 'export',
		label: 'Export',
		icon: <ExportIcon />,
		action: () => alert('Export clicked')
	},
	{
		id: 'refresh',
		label: 'Refresh',
		icon: <RefreshIcon />,
		action: () => alert('Refresh clicked')
	},
	{
		id: 'settings',
		label: 'Settings',
		icon: <SettingsIcon />,
		action: () => alert('Settings clicked')
	},
	{
		id: 'delete',
		label: 'Delete',
		tooltip: 'Delete (disabled)',
		icon: <DeleteIcon />,
		disabled: true,
		action: () => alert('Delete clicked')
	}
];

export function Default(
	args: React.ComponentProps<typeof AdaptiveToolbar>
) {
	return <AdaptiveToolbar {...args} />;
}

Default.args = {
	actions: sampleActions,
	ariaLabel: 'Sample toolbar'
};

export function Overflowing(
	args: React.ComponentProps<typeof AdaptiveToolbar>
) {
	return (
		<div style={{width: 120, border: '1px dashed #888'}}>
			<AdaptiveToolbar {...args} />
		</div>
	);
}

Overflowing.args = {
	actions: sampleActions,
	ariaLabel: 'Sample toolbar'
};

type ResizableArgs = React.ComponentProps<typeof AdaptiveToolbar> & {
	width: number;
};

export function Resizable({width, ...args}: ResizableArgs) {
	return (
		<div style={{width, border: '1px dashed #888'}}>
			<AdaptiveToolbar {...args} />
		</div>
	);
}

Resizable.args = {
	actions: sampleActions,
	ariaLabel: 'Sample toolbar',
	width: 400
};

Resizable.argTypes = {
	width: {
		control: {type: 'range', min: 0, max: 300, step: 5}
	}
};
