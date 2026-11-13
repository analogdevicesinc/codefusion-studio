/**
 *
 * Copyright (c) 2025-2026 Analog Devices, Inc.
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

import {memo, useCallback, useMemo} from 'react';
import {CheckBox} from 'cfs-react-library';
import CfsSelectionCard from '@common/components/cfs-selection-card/CfsSelectionCard';
import {
	setConfigErrors,
	toggleProjects
} from '../../../../state/slices/workspace-config/workspace-config.reducer';
import {useAppDispatch} from '../../../../state/store';
import {useConfiguredCores} from '../../../../state/slices/workspace-config/workspace-config.selector';

import MultipleProjectsToggle from '../inner-project-card/multiple-projects-toggle';
import InnerProjectCard from '../inner-project-card/inner-project-card';
import CoreCardTitle from './core-card-title';

import {
	getBaseCoreName,
	getMultipleProjectIds
} from '../../../../utils/workspace-config';
import {configErrors} from '../../../../common/constants/validation-errors';

import styles from './CoreCard.module.scss';

type MultipleProjectsCardProps = Readonly<{
	baseCore: {
		id: string;
		isPrimary: boolean;
		name: string;
	};
	onCheckboxChange: (newValue: boolean) => void;
}>;

function MultipleProjectsCard({
	baseCore: {id: baseCoreId, isPrimary, name},
	onCheckboxChange
}: MultipleProjectsCardProps) {
	const dispatch = useAppDispatch();
	const projectIds = getMultipleProjectIds(baseCoreId);
	const stateProjects = useConfiguredCores(projectIds);
	const baseCoreName = getBaseCoreName(name) ?? '';

	const isBaseCoreEnabled = useMemo(
		() => stateProjects.every(project => project.isEnabled),
		[stateProjects]
	);

	const isIndeterminate = useMemo(() => {
		const enabledCount = stateProjects.filter(
			project => project.isEnabled
		).length;

		return enabledCount > 0 && enabledCount < stateProjects.length;
	}, [stateProjects]);

	const handleCheckboxChange = useCallback(() => {
		dispatch(
			toggleProjects({
				projectIds,
				isChecked: !isBaseCoreEnabled
			})
		);

		dispatch(
			setConfigErrors({
				id: configErrors.cores,
				notifications: []
			})
		);
	}, [dispatch, projectIds, isBaseCoreEnabled]);

	if (!stateProjects.length) return null;

	return (
		<CfsSelectionCard
			key={baseCoreId}
			alwaysShowContent
			testId={`coresSelection:card:${baseCoreId}`}
			id={baseCoreId}
			hasError={false}
			isChecked={isBaseCoreEnabled}
			endSlotSelectsCard
			onChange={() => {
				handleCheckboxChange();
			}}
		>
			<div slot='start'>
				<CheckBox
					checked={isBaseCoreEnabled}
					indeterminate={isIndeterminate}
					dataTest={`cores-selection:${baseCoreId}-card:checkbox`}
				/>
			</div>
			<section className={styles.collapsedContainer} slot='title'>
				<CoreCardTitle
					title={baseCoreName}
					isPrimary={isPrimary ?? false}
				/>
			</section>

			<span slot='end'>
				<MultipleProjectsToggle
					isEnabled
					coreId={baseCoreId}
					onCheckboxChange={onCheckboxChange}
				/>
			</span>

			<div
				slot='content'
				className={styles.multipleProjectsContainer}
				onClick={e => {
					e.stopPropagation();
				}}
			>
				{stateProjects.map(project => (
					<InnerProjectCard key={project.id} project={project} />
				))}
			</div>
		</CfsSelectionCard>
	);
}

export default memo(MultipleProjectsCard);
