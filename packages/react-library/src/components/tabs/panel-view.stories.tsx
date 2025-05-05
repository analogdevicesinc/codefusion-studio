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
import PanelView from './panel-view';

const meta: Meta<typeof PanelView> = {
	component: PanelView,
	title: 'PanelView'
};

export default meta;

export function Default(
	args: React.ComponentProps<typeof PanelView>
) {
	return <PanelView {...args} />;
}

Default.args = {
	id: '1'
};
