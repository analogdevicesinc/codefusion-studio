/**
 *
 * Copyright (c) 2024-2025 Analog Devices, Inc.
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
import {VSCodeButton} from '@vscode/webview-ui-toolkit/react';
import {useState} from 'react';
import {SlidingPanel} from './sliding-panel';

const meta: Meta<typeof SlidingPanel> = {
	component: SlidingPanel,
	title: 'Sliding Panel'
};

export default meta;

export function Default(
	args: React.ComponentProps<typeof SlidingPanel>
) {
	const [isMinimised, setIsMinimised] = useState(true);

	const openSlider = (): void => {
		setIsMinimised(false);
	};

	const closeSlider = (): void => {
		setIsMinimised(true);
	};

	return (
		<>
			<SlidingPanel
				{...args}
				isMinimised={isMinimised}
				closeSlider={closeSlider}
			/>
			<VSCodeButton onClick={openSlider}>
				Open Sliding Panel
			</VSCodeButton>
		</>
	);
}

Default.args = {
	title: 'Sliding Panel Header',
	isCloseable: true,
	children: (
		<>
			<div>
				<h3>Sliding Panel Content</h3>
				<p>I am content...</p>
			</div>
		</>
	),
	footer: <h3>Sliding Panel Footer Section</h3>
};
