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

import {useAppDispatch} from '../../../../state/store';
import {useIsCoreEnabled} from '../../../../state/slices/workspace-config/workspace-config.selector';
import {
	setConfigErrors,
	toggleCoreEnabled
} from '../../../../state/slices/workspace-config/workspace-config.reducer';

import CoreCardTitle from './core-card-title';
import MultipleProjectsToggle from '../inner-project-card/multiple-projects-toggle';

import useCoreValidation from '../../../../hooks/useCoreValidation';
import type {StateProject} from '../../../../common/types/state';
import {configErrors} from '../../../../common/constants/validation-errors';
import {doesCoreHaveProperty} from '../../../../utils/workspace-config';

import styles from './CoreCard.module.scss';

type SingleProjectCardProps = Readonly<{
	id: string;
	coreState: StateProject;
	onCheckboxChange: (newValue: boolean) => void;
}>;

function SingleProjectCard({
	id,
	coreState,
	onCheckboxChange
}: SingleProjectCardProps) {
	const dispatch = useAppDispatch();
	const {name} = coreState;
	const isCoreEnabled = useIsCoreEnabled(id);
	const {isCoreCardErrorState} = useCoreValidation();
	const isError = isCoreCardErrorState(coreState);

	const hasSecureKey = useMemo(
		() => doesCoreHaveProperty(coreState, 'Secure'),
		[coreState]
	);

	const onCheckboxChangeHandler = useCallback(
		(id: string) => {
			dispatch(toggleCoreEnabled(id));

			dispatch(
				setConfigErrors({
					id: configErrors.cores,
					notifications: []
				})
			);
		},
		[dispatch]
	);

	return (
		<CfsSelectionCard
			key={id}
			testId={`coresSelection:card:${id}`}
			id={id}
			hasError={coreState ? isError : false}
			isChecked={isCoreEnabled}
			endSlotSelectsCard
			onChange={() => {
				onCheckboxChangeHandler(id);
			}}
		>
			<div slot='start'>
				<CheckBox
					checked={isCoreEnabled}
					dataTest={`cores-selection:${id}-card:checkbox`}
				/>
			</div>
			<section className={styles.collapsedContainer} slot='title'>
				<CoreCardTitle
					title={name ?? ''}
					isPrimary={coreState?.isPrimary ?? false}
				/>
			</section>
			<span slot='end'>
				{coreState?.isTrustZoneSupported && (
					<MultipleProjectsToggle
						coreId={id}
						isEnabled={hasSecureKey && Boolean(coreState?.Secure)}
						onCheckboxChange={onCheckboxChange}
					/>
				)}
			</span>
		</CfsSelectionCard>
	);
}

export default memo(SingleProjectCard);
