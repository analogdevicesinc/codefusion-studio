/**
 *
 * Copyright (c) 2025 Analog Devices, Inc.
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

import styles from './CoreContentTrustZoneItems.module.scss';
import CfsSelectionCard from '../../../../../../common/components/cfs-selection-card/CfsSelectionCard';
import {CheckBox} from 'cfs-react-library';

import {
	type TLocaleContext,
	useLocaleContext
} from '../../../../../../common/contexts/LocaleContext';
import {useIsCoreEnabled} from '../../../../state/slices/workspace-config/workspace-config.selector';
import {useAppDispatch} from '../../../../state/store';
import {toggleCoreEnabled} from '../../../../state/slices/workspace-config/workspace-config.reducer';
import {getTrustZoneIds} from '../../../../utils/workspace-config';

function CoreContentTrustZoneItems({
	coreId
}: Readonly<{coreId: string}>) {
	const dispatch = useAppDispatch();
	const l10n: TLocaleContext | undefined = useLocaleContext();

	const {secureCoreId, nonSecureCoreId} = getTrustZoneIds(coreId);

	const isSecureEnabled = useIsCoreEnabled(secureCoreId);
	const isNonSecureEnabled = useIsCoreEnabled(nonSecureCoreId);

	const handleClick = (id: string) => {
		dispatch(toggleCoreEnabled(id));
	};

	return (
		<div
			className={styles.container}
			onClick={e => e.stopPropagation()}
		>
			<CfsSelectionCard
				id='core-secure'
				isChecked={isSecureEnabled}
				testId={`core-secure-${coreId}`}
				onChange={() => handleClick(secureCoreId)}
			>
				<div slot='start'>
					<CheckBox checked={isSecureEnabled} />
				</div>
				<div className={styles.title} slot='title'>
					<h4>{l10n?.['cores-config']?.trustZone?.secure?.title}</h4>
					<span>
						{l10n?.['cores-config']?.trustZone?.secure?.description}
					</span>
				</div>
			</CfsSelectionCard>
			<CfsSelectionCard
				id='core-non-secure'
				isChecked={isNonSecureEnabled}
				testId={`core-non-secure-${coreId}`}
				onChange={() => handleClick(nonSecureCoreId)}
			>
				<div slot='start'>
					<CheckBox checked={isNonSecureEnabled} />
				</div>
				<div slot='title'>
					<h4>
						{l10n?.['cores-config']?.trustZone?.['non-secure']?.title}
					</h4>
					<span>
						{
							l10n?.['cores-config']?.trustZone?.['non-secure']
								?.description
						}
					</span>
				</div>
			</CfsSelectionCard>
		</div>
	);
}

export default CoreContentTrustZoneItems;
