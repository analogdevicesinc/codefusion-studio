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
import {fn} from '@storybook/test';
import SegmentedControls, {SegmentOption} from './segmented-controls';
import {CloseIcon} from '../../main';
import CheckedIcon from '../icons/checked-icon';

const meta: Meta<typeof SegmentedControls> = {
	component: SegmentedControls,
	title: 'SegmentedControls'
};

export default meta;

export function Default(
	args: React.ComponentProps<typeof SegmentedControls>
) {
	return <SegmentedControls {...args} />;
}

const options: SegmentOption[] = [
	{key: 'action1', content: <CloseIcon />, onClick: fn()},
	{key: 'action2', content: <CheckedIcon />, onClick: fn()},
	{key: 'action3', content: 'Text', onClick: fn()}
];

Default.args = {
	options,
	dataTest: 'segmented-controls-test',
	ariaLabel: 'Document actions'
};

export function WithDisabled(
	args: React.ComponentProps<typeof SegmentedControls>
) {
	return <SegmentedControls {...args} />;
}

const optionsWithDisabled: SegmentOption[] = [
	{key: 'undo', content: 'Undo', onClick: fn()},
	{key: 'redo', content: 'Redo', onClick: fn(), disabled: true},
	{key: 'reset', content: <CloseIcon />, onClick: fn()}
];

WithDisabled.args = {
	options: optionsWithDisabled,
	dataTest: 'segmented-controls-disabled-test',
	ariaLabel: 'Edit actions'
};
