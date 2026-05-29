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

import {
	type TLocaleContext,
	useLocaleContext
} from '../../../../../common/contexts/LocaleContext';
import {navigationItems} from '../../../../../common/constants/navigation';
import {setActiveScreen} from '../../../state/slices/app-context/appContext.reducer';
import {useAppDispatch} from '../../../state/store';
import sectionStyles from '../security-settings/workspace-security-settings.module.scss';
import styles from './mcuboot-settings.module.scss';
import EnableMCUBootSettings from './enable-mcuboot/enable-mcuboot';
import {Button} from 'cfs-react-library';

function MCUBootSettings() {
	const dispatch = useAppDispatch();
	const i10n: TLocaleContext | undefined =
		useLocaleContext()?.settings?.security?.['mcuboot-settings'];

	return (
		<div
			id='mcuboot-config'
			data-test='workspace-setting:mcuboot-config'
			className={sectionStyles.sectionContainer}
		>
			<div className={sectionStyles.titleContainer}>
				<div className={sectionStyles.title}>{i10n?.title}</div>
				<div className={styles.mcubootNav}>
					<Button
						appearance='icon'
						dataTest='navigate-to-mcuboot-config'
						onClick={() => {
							dispatch(
								setActiveScreen(navigationItems.mcubootConfig)
							);
						}}
					>
						{i10n?.['config-mcuboot']}
					</Button>
				</div>
			</div>

			<EnableMCUBootSettings />
		</div>
	);
}

export default MCUBootSettings;
