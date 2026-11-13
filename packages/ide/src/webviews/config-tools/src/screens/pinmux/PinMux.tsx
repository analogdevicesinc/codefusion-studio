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
import PinmuxHeader from './header/PinmuxHeader';
import PinmuxSide from './side/Side';
import PackageDisplay from './package-display/PackageDisplay';
import {useEffect, useState} from 'react';
import {useLocaleContext} from '@common/contexts/LocaleContext';
import EightColumnLayout from '../../components/eight-column-layout/EightColumnLayout';
import PinConfigSidebar from './pin-config-sidebar/pin-config-sidebar';
import {useAppDispatch} from '../../state/store';
import {
	setActivePeripheral,
	setActiveSignal
} from '../../state/slices/peripherals/peripherals.reducer';
import {
	useActivePeripheral,
	useActiveSignal,
	useCurrentSignalTarget
} from '../../state/slices/peripherals/peripherals.selector';
import styles from './pin-mux.module.scss';
import {usePinHasConfiguration} from '../../hooks/use-pin-has-configuration';

function PinMUX() {
	const dispatch = useAppDispatch();
	const activeSignal = useActiveSignal();
	const peripheral = useActivePeripheral();

	const signalName = activeSignal?.split(' ')[1] ?? '';
	const pinId = useCurrentSignalTarget(peripheral ?? '', signalName);

	// Check if the pin has a configuration for the given peripheral and signal
	// This prevents the config sidebar from being displayed for pins that don't have a configuration
	const pinHasConfiguration = usePinHasConfiguration({
		pinId,
		peripheral: peripheral ?? '',
		signal: signalName
	});

	const l10nContext = useLocaleContext();
	const commonL10n = l10nContext?.common as
		| Record<string, string>
		| undefined;
	const pinmuxL10n = l10nContext?.pinmux as
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

	useEffect(
		() => () => {
			// Assure that the config task bar is always closed when navigating from pinmux screen
			dispatch(setActivePeripheral(undefined));
			dispatch(setActiveSignal(undefined));
		},
		[dispatch]
	);

	return innerWidth < 900 || innerHeight < 475 ? (
		<EightColumnLayout
			header={pinmuxL10n?.title ?? 'Pin Config'}
			subtitle={
				commonL10n?.windowTooSmall ??
				'This feature is not currently supported for windows this size. If possible please increase the size of this window.'
			}
		/>
	) : (
		<CfsTwoColumnLayout>
			<div slot='header' data-test='pinmux:header'>
				<PinmuxHeader />
			</div>
			<div
				slot='side-panel'
				id='peripheral-navigation'
				data-test='pinmux:peripheral-navigation'
				className={styles.pincfgPeripheralSidePanelContainer}
			>
				<PinmuxSide />
			</div>

			<PackageDisplay />
			<div className={styles.sidePanelContainer}>
				<PinConfigSidebar
					isMinimised={
						!activeSignal || !peripheral || !pinHasConfiguration
					}
				/>
			</div>
		</CfsTwoColumnLayout>
	);
}

export default PinMUX;
