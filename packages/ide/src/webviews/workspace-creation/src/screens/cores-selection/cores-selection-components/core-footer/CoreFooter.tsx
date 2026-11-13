/**
 *
 * Copyright (c) 2024-2026 Analog Devices, Inc.
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

import {memo} from 'react';
import CircledCheckmarkIcon from '@common/icons/CircledCheckmark';
import ConflictIcon from '@common/icons/Conflict';
import {navigationItems} from '../../../../common/constants/navigation';
import {setActiveScreen} from '../../../../state/slices/app-context/appContext.reducer';
import {setCoreToConfigId} from '../../../../state/slices/workspace-config/workspace-config.reducer';
import {useConfiguredCore} from '../../../../state/slices/workspace-config/workspace-config.selector';
import {useAppDispatch} from '../../../../state/store';
import CoreFooterButton from '../core-footer-button/CoreFooterButton';

import styles from './CoreFooter.module.scss';

type CoreFooterProps = {
	readonly coreId: string;
};

function CoreFooter({coreId}: CoreFooterProps) {
	const dispatch = useAppDispatch();
	const targetCoreState = useConfiguredCore(coreId);
	const isCoreEnabled = Boolean(targetCoreState?.isEnabled);
	const isCoreConfigured = Boolean(targetCoreState?.pluginId);

	const handleConfigClick = () => {
		if (!isCoreEnabled) return;

		dispatch(setActiveScreen(navigationItems.coreConfig));
		dispatch(setCoreToConfigId(coreId));
	};

	return (
		<>
			<div className={styles.configurationContainer}>
				{isCoreConfigured ? (
					<>
						<span className={isCoreEnabled ? '' : styles.inactive}>
							Configured
						</span>
						<span
							className={`${styles.icon} ${
								isCoreEnabled ? '' : styles.inactive
							}`}
						>
							<CircledCheckmarkIcon />
						</span>
					</>
				) : (
					<>
						<span className={isCoreEnabled ? null : styles.inactive}>
							Unconfigured
						</span>

						<span
							className={`${styles.icon} ${
								isCoreEnabled ? '' : styles.hide
							}`}
						>
							<ConflictIcon />
						</span>
					</>
				)}
			</div>
			<CoreFooterButton
				coreId={coreId}
				isCoreEnabled={isCoreEnabled}
				onBtnClick={handleConfigClick}
			/>
		</>
	);
}

export default memo(CoreFooter);
