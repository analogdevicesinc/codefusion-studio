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

import {Badge, CheckBox} from 'cfs-react-library';
import {memo, useCallback, useMemo} from 'react';
import CfsSelectionCard from '../../../../../../common/components/cfs-selection-card/CfsSelectionCard';
import type {CatalogCoreInfo} from '../../../../common/types/catalog';
import {
	setConfigErrors,
	toggleCoreEnabled
} from '../../../../state/slices/workspace-config/workspace-config.reducer';
import {
	useConfiguredCore,
	useIsCoreEnabled,
	useIsTrustZoneEnabled
} from '../../../../state/slices/workspace-config/workspace-config.selector';
import {useAppDispatch} from '../../../../state/store';
import {PRIMARY} from '@common/constants/core-properties';
import useCoreValidation from '../../../../hooks/useCoreValidation';
import useIsPrimaryMultipleProjects from '../../../../hooks/use-is-primary-multiple-projects';

import styles from './CoreCard.module.scss';
import {configErrors} from '../../../../common/constants/validation-errors';
import TrustZoneToggle from '../core-content-trustzone/TrustZoneToggle';
import CoreContentTrustZoneItems from '../core-content-trustzone/CoreContentTrustZoneItems';
import {getTrustZoneIds} from '../../../../utils/workspace-config';

function CoreCard({core}: Readonly<{core: CatalogCoreInfo}>) {
	const dispatch = useAppDispatch();
	const {id, name} = core;
	const coreState = useConfiguredCore(id);
	const shouldShowPrimaryBadge = useIsPrimaryMultipleProjects(
		core?.isPrimary ?? false
	);

	const isCoreEnabled = useIsCoreEnabled(id);
	const {isCoreCardErrorState} = useCoreValidation();
	const isError = isCoreCardErrorState(coreState);
	const isTrustZoneEnabled = useIsTrustZoneEnabled(id);
	const {secureCoreId, nonSecureCoreId} = getTrustZoneIds(core.id);

	const isSecureEnabled = useIsCoreEnabled(secureCoreId);
	const isNonSecureEnabled = useIsCoreEnabled(nonSecureCoreId);

	// Calculate indeterminate state: true only for partial selection (one enabled, one disabled)
	const isIndeterminate = useMemo(() => {
		if (!isTrustZoneEnabled) return false;

		// Indeterminate only when we have partial selection (one true, one false)
		return isSecureEnabled !== isNonSecureEnabled;
	}, [isTrustZoneEnabled, isSecureEnabled, isNonSecureEnabled]);

	const handleCheckboxSelection = useCallback(
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
			alwaysShowContent={isTrustZoneEnabled}
			onChange={() => {
				handleCheckboxSelection(id);
			}}
		>
			<div slot='start'>
				<CheckBox
					checked={isCoreEnabled}
					indeterminate={isIndeterminate}
					dataTest={`cores-selection:${id}-card:checkbox`}
				/>
			</div>
			<section className={styles.collapsedContainer} slot='title'>
				<div className={styles.projectHeader}>
					<h3 className={styles.coreTitle}>{name}</h3>
					{shouldShowPrimaryBadge && (
						<Badge appearance='secondary'>{PRIMARY}</Badge>
					)}
				</div>

				{coreState?.supportsTrustZone && (
					<TrustZoneToggle coreId={id} />
				)}
			</section>
			{isTrustZoneEnabled && (
				<div slot='content'>
					<CoreContentTrustZoneItems coreId={id} />
				</div>
			)}
		</CfsSelectionCard>
	);
}

export default memo(CoreCard);
