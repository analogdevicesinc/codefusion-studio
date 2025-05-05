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
							className={`${styles.icon} ${isCoreEnabled ? '' : styles.inactive}`}
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
							className={`${styles.icon} ${isCoreEnabled ? '' : styles.hide}`}
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
