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

import {Meta} from '@storybook/react';
import StepList, {StepListProps} from './wizard-stepper';

const meta: Meta<typeof StepList> = {
	component: StepList,
	title: 'Wizard Stepper'
};

export default meta;

export function Default(args: React.ComponentProps<typeof StepList>) {
	return (
		<div style={{width: '350px'}}>
			<StepList {...args} />
		</div>
	);
}

Default.args = {
	steps: [
		{title: 'Step 1'},
		{
			title: 'Step 2',
			description: 'This is a description for step 2'
		},
		{
			title: 'Step 3',
			completed: true,
			description: 'some desc',
			substeps: [{title: 'Substep 3.1', badges: ['test']}]
		},
		{
			title: 'Step disabled',
			completed: false,
			description: 'disabled',
			disabled: true,
			substeps: [{title: 'Substep 4.1', badges: ['Badge']}]
		},
		{
			title: 'Step disabled substep',
			completed: false,
			description: 'disabled',
			substeps: [
				{title: 'Substep 5.1', badges: ['Badge'], disabled: true},
				{title: 'Substep 5.2'}
			]
		}
	],
	activeStepIndex: 1,
	onStepClick: (stepIndex, substep) => {
		console.log(
			`Step ${stepIndex + 1}${substep !== undefined ? '.' + (substep + 1) : ''} clicked`
		);
	}
} as StepListProps;
