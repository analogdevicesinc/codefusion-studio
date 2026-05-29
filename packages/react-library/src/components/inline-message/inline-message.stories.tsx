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
import InlineMessage from './inline-message';

const meta: Meta<typeof InlineMessage> = {
	component: InlineMessage,
	title: 'Components/InlineMessage'
};

export default meta;

export function Info(
	args: React.ComponentProps<typeof InlineMessage>
) {
	return (
		<InlineMessage {...args}>
			<div>Workspace has been synchronized.</div>
		</InlineMessage>
	);
}

Info.args = {
	type: 'info'
};

export function Warning(
	args: React.ComponentProps<typeof InlineMessage>
) {
	return (
		<InlineMessage {...args}>
			<div>Clock configuration has unresolved warnings.</div>
		</InlineMessage>
	);
}

Warning.args = {
	type: 'warning'
};

export function Error(
	args: React.ComponentProps<typeof InlineMessage>
) {
	return (
		<InlineMessage {...args}>
			<div>Peripheral allocation failed for selected target.</div>
		</InlineMessage>
	);
}

Error.args = {
	type: 'error'
};

export function Success(
	args: React.ComponentProps<typeof InlineMessage>
) {
	return (
		<InlineMessage {...args}>
			<div>Generated files are up to date.</div>
		</InlineMessage>
	);
}

Success.args = {
	type: 'success'
};
