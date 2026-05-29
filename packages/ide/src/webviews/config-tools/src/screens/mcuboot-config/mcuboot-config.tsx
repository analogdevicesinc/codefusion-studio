/**
 *
 * Copyright (c) 2026 Analog Devices, Inc.
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

import CfsTwoColumnLayout from '@common/components/cfs-main-layout/CfsMainLayout';
import styles from './mcuboot-config.module.scss';
import MCUBootConfigSidebar from './mcuboot-config-sidebar/mcuboot-config-sidebar';
import ApplicationPackageSummary from './application-package-summary/application-package-summary';
import { Button, WarningIcon } from 'cfs-react-library';
import {
	setActiveScreen,
	setActiveSettingsChild,
	setActiveSettingsPage
} from '../../state/slices/app-context/appContext.reducer';
import {useMcubootEnableState} from '../../state/slices/app-context/appContext.selector';
import {useAppDispatch} from '../../state/store';
import {navigationItems} from '@common/constants/navigation';
import {
	type TLocaleContext,
	useLocaleContext
} from '../../../../common/contexts/LocaleContext';

function MCUBootConfig() {
		const dispatch = useAppDispatch();
	const mcubootEnableState = useMcubootEnableState();
	const i10n: TLocaleContext | undefined =
		useLocaleContext()?.mcubootConfig;

	const showWarningBanner =
		mcubootEnableState === 'disabled' ||
		mcubootEnableState === 'default';

	const handleNavigateToSettings = () => {
		dispatch(setActiveScreen(navigationItems.settings));
		dispatch(setActiveSettingsPage('security'));
		dispatch(setActiveSettingsChild('mcuboot-config'));
	};

	return (
		<div
			className={`${styles.mcubootConfigContainer} ${showWarningBanner ? styles.withBanner : ''}`}
			data-test='mcuboot-config:container'
		>
			<CfsTwoColumnLayout>
				{showWarningBanner && (
					<div
						className={styles.header}
						slot='header'
						data-test='mcuboot-config:banner'
					>
						<WarningIcon />
						<span className={styles.bannerMessage}>
							{i10n?.banner?.[mcubootEnableState]}
						</span>
						<Button
							appearance='secondary'
							dataTest='mcuboot-config:banner-settings-link'
							onClick={handleNavigateToSettings}
						>
							{i10n?.banner?.settingsLink}
						</Button>
					</div>
				)}
				<div slot='side-panel'>
					<MCUBootConfigSidebar />
				</div>

				<ApplicationPackageSummary />
			</CfsTwoColumnLayout>
		</div>
	);
}

export default MCUBootConfig;
