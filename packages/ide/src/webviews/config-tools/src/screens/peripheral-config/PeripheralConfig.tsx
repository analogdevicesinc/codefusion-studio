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
import CfsTwoColumnLayout from '@common/components/cfs-main-layout/CfsTwoColumnLayout';
import SideListContainer from './side-list-container/side-list-container';
import styles from './PeripheralConfig.module.scss';
import CoreSummary from './core-summary/CoreSummary';
import ConfigSidebar from './config-sidebar/ConfigSidebar';
import {useEffect, useState} from 'react';
import {useLocaleContext} from '@common/contexts/LocaleContext';
import {useAppDispatch} from '../../state/store';
import {
	setActivePeripheral,
	setActiveSignal
} from '../../state/slices/peripherals/peripherals.reducer';
import {setProjectFilter} from '../../state/slices/app-context/appContext.reducer';
import {
	useActivePeripheral,
	useActiveSignal
} from '../../state/slices/peripherals/peripherals.selector';
import EightColumnLayout from '../../components/eight-column-layout/EightColumnLayout';

function PeripheralConfig() {
	const dispatch = useAppDispatch();
	const activeSignal = useActiveSignal();
	const activePeripheral = useActivePeripheral();
	const l10nContext = useLocaleContext();
	const commonL10n = l10nContext?.common as
		| Record<string, string>
		| undefined;
	const peripheralsL10n = l10nContext?.peripherals as
		| Record<string, string>
		| undefined;
	const [innerWidth, setInnerWidth] = useState(window.innerWidth);
	const [innerHeight, setInnerHeight] = useState(window.innerHeight);

	useEffect(() => {
		const handleResize = () => {
			setInnerWidth(window.innerWidth);
			setInnerHeight(window.innerHeight);
		};

		window.addEventListener('resize', handleResize);

		return () => {
			window.removeEventListener('resize', handleResize);
		};
	}, []);

	useEffect(() => {
		// Assure that the config task bar is always closed when navigating from pinmux screen
		dispatch(setActivePeripheral(undefined));
		dispatch(setActiveSignal(undefined));

		return () => {
			// Clear the cores filter when navigating away from the peripheral config screen
			dispatch(setProjectFilter([]));
		};
	}, [dispatch]);

	return innerWidth < 900 || innerHeight < 475 ? (
		<EightColumnLayout
			header={peripheralsL10n?.title ?? 'Peripheral Allocation'}
			subtitle={
				commonL10n?.windowTooSmall ??
				'This feature is not currently supported for windows this size. If possible please increase the size of this window.'
			}
		/>
	) : (
		<div className={styles.peripheralConfigContainer}>
			<CfsTwoColumnLayout>
				<div
					slot='side-panel'
					id='peripheral-navigation'
					style={{height: '100%'}}
				>
					<SideListContainer />
				</div>

				<CoreSummary />
				<ConfigSidebar
					isMinimised={!activePeripheral && !activeSignal}
				/>
			</CfsTwoColumnLayout>
		</div>
	);
}

export default PeripheralConfig;
