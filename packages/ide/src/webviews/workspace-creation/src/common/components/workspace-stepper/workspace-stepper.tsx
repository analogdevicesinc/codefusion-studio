/**
 *
 * Copyright (c) 2024 - 2025 Analog Devices, Inc.
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

import {useMemo} from 'react';
import {StepList} from 'cfs-react-library';
import {useActiveScreen} from '../../../state/slices/app-context/appContext.selector';
import {
	useSelectedBoardPackage,
	useSelectedCores,
	useSelectedSoc,
	useWorkspaceConfig,
	useWorkspaceTemplate
} from '../../../state/slices/workspace-config/workspace-config.selector';
import {navigationItems} from '../../constants/navigation';
import {initializeSteps} from '../../utils/stepper-utils';
import useIsPrimaryMultipleProjects from '../../../hooks/use-is-primary-multiple-projects';
import {CORES, CORE_CONFIG} from '../../constants/workspace-stepper';

import type {StepItem} from '../../types/stepper';

export default function WorkspaceStepper() {
	// Redux state used to compute steps
	const activeScreen = useActiveScreen();
	const selectedSoc = useSelectedSoc();
	const {packageId, boardId} = useSelectedBoardPackage();
	const selectedTemplate = useWorkspaceTemplate();
	const selectedCoresObject = useSelectedCores();
	const {name, path, templateType} = useWorkspaceConfig();

	let currentStep = activeScreen;
	const isPredefined = templateType === 'predefined';
	if (activeScreen === CORE_CONFIG) currentStep = CORES;
	const isSingleCore = useIsPrimaryMultipleProjects(true);

	const stepItems: StepItem[] = useMemo(() => {
		// Descriptions for some of the steps
		const boardDesc =
			boardId && packageId
				? `${boardId} & ${packageId}`
				: packageId || '';
		const optionsDesc =
			selectedSoc &&
			packageId &&
			(isPredefined
				? selectedTemplate?.pluginName || selectedTemplate?.pluginId
				: 'Manual Configuration');

		let steps: StepItem[] = initializeSteps(
			navigationItems,
			isPredefined,
			selectedCoresObject,
			name,
			isSingleCore,
			{
				selectedSoc,
				boardDesc,
				optionsDesc
			}
		);

		return steps;
	}, [
		activeScreen,
		selectedSoc,
		boardId,
		packageId,
		selectedTemplate,
		selectedCoresObject,
		name,
		path,
		templateType
	]);

	const getCurrentStepIndex = useMemo(() => {
		const activeStepIndex = stepItems.findIndex(
			step => step.id === currentStep
		);

		return activeStepIndex;
	}, [stepItems]);

	return (
		<StepList
			steps={stepItems}
			activeStepIndex={getCurrentStepIndex}
			onStepClick={() => void 0}
		/>
	);
}
