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

import Toggle from '../../../../../../common/components/toggle/Toggle';
import styles from './TrustZoneToggle.module.scss';
import {useAppDispatch} from '../../../../state/store';
import {
	addOrUpdateTrustZoneCores,
	removeTrustZoneCores,
	setIsTrustZoneEnabled
} from '../../../../state/slices/workspace-config/workspace-config.reducer';
import {useIsTrustZoneEnabled} from '../../../../state/slices/workspace-config/workspace-config.selector';
import {
	type TLocaleContext,
	useLocaleContext
} from '../../../../../../common/contexts/LocaleContext';

function TrustZoneToggle({coreId}: Readonly<{coreId: string}>) {
	const l10n: TLocaleContext | undefined = useLocaleContext();
	const dispatch = useAppDispatch();
	const isToggledOn = useIsTrustZoneEnabled(coreId);

	return (
		<div
			className={styles.container}
			data-test={`toggle:trustzone-container-${coreId}`}
		>
			<Toggle
				isToggledOn={isToggledOn}
				dataTest={`toggle:trustzone-${coreId}`}
				handleToggle={() => {
					dispatch(
						setIsTrustZoneEnabled({id: coreId, enabled: !isToggledOn})
					);

					if (!isToggledOn) {
						dispatch(
							addOrUpdateTrustZoneCores({
								baseId: coreId,
								secureEnabled: true,
								nonSecureEnabled: true
							})
						);
					} else {
						// When toggle is off TrustZone, remove the TrustZone cores
						dispatch(removeTrustZoneCores({baseId: coreId}));
					}
				}}
			/>
			<div className={styles.label}>
				{l10n?.['cores-config']?.trustZone?.title}
			</div>
		</div>
	);
}

export default TrustZoneToggle;
