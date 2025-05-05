/**
 *
 * Copyright (c) 2024-2025 Analog Devices, Inc.
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
import PinmuxHeader from './header/PinmuxHeader';
import PinmuxSide from './side/Side';
import PackageDisplay from './package-display/PackageDisplay';
import {useEffect, useState} from 'react';
import EightColumnLayout from '../../components/eight-column-layout/EightColumnLayout';
import PinConfigSidebar from './pin-config-sidebar/pin-config-sidebar';
import {useAppDispatch} from '../../state/store';
import {
	setActivePeripheral,
	setActiveSignal
} from '../../state/slices/peripherals/peripherals.reducer';
import {
	useActivePeripheral,
	useActiveSignal
} from '../../state/slices/peripherals/peripherals.selector';
import styles from './pin-mux.module.scss';

function PinMUX() {
	const dispatch = useAppDispatch();
	const activeSignal = useActiveSignal();
	const peripheral = useActivePeripheral();
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
			header='Pin Config'
			subtitle='This feature is not currently supported for windows this size. If possible please increase the size of this window.'
		/>
	) : (
		<CfsTwoColumnLayout>
			<div slot='header'>
				<PinmuxHeader />
			</div>
			<div slot='side-panel' id='peripheral-navigation'>
				<PinmuxSide />
			</div>

			<PackageDisplay />
			<div className={styles.sidePanelContainer}>
				<PinConfigSidebar
					isMinimised={!activeSignal || !peripheral}
				/>
			</div>
		</CfsTwoColumnLayout>
	);
}

export default PinMUX;
