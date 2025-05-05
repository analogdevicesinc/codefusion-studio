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

import {CheckBox} from 'cfs-react-library';
import {memo, useCallback} from 'react';
import CfsSelectionCard from '../../../../../../common/components/cfs-selection-card/CfsSelectionCard';
import type {CatalogCoreInfo} from '../../../../common/types/catalog';
import {configErrors} from '../../../../common/constants/validation-errors';
import {
	setConfigErrors,
	toggleCoreEnabled
} from '../../../../state/slices/workspace-config/workspace-config.reducer';
import {
	useConfiguredCore,
	useIsCoreEnabled
} from '../../../../state/slices/workspace-config/workspace-config.selector';
import {useAppDispatch} from '../../../../state/store';
import CoreContentItem from '../core-content-item/CoreContentItem';
import CoreFooter from '../core-footer/CoreFooter';
import {PRIMARY} from '@common/constants/core-properties';
import useCoreValidation from '../../../../hooks/useCoreValidation';

import styles from './CoreCard.module.scss';

function CoreCard({core}: Readonly<{core: CatalogCoreInfo}>) {
	const dispatch = useAppDispatch();
	const {id, name, isPrimary} = core;
	const coreState = useConfiguredCore(id);
	const isCoreEnabled = useIsCoreEnabled(id);
	const {isCoreCardErrorState} = useCoreValidation();
	const isError = isCoreCardErrorState(coreState);

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
			onChange={handleCheckboxSelection}
		>
			<div slot='start'>
				<CheckBox checked={isCoreEnabled} />
			</div>
			<section className={styles.collapsedContainer} slot='title'>
				<div>
					<h3 className={styles.coreTitle}>{name}</h3>
					{isPrimary && <span className={styles.tag}>{PRIMARY}</span>}
				</div>
				<div>
					<CoreContentItem
						label='Platform'
						value={String(coreState?.firmwarePlatform ?? '')}
					/>
				</div>
			</section>
			<section className={styles.expandedContainer} slot='content'>
				<CoreContentItem
					label='Plugin'
					value={coreState?.pluginId ?? ''}
				/>
				<CoreContentItem
					label='Secure'
					value={(coreState?.isTrusted ? 'Yes' : '').toString()}
				/>
			</section>
			<div className={styles.coreFooter} slot='end'>
				<CoreFooter coreId={id} />
			</div>
		</CfsSelectionCard>
	);
}

export default memo(CoreCard);
