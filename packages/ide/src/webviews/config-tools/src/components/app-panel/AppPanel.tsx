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
import {navigationItems} from '@common/constants/navigation';
import ClockConfig from '../../screens/clock-config/ClockConfig';
import Generate from '../../screens/generate/Generate';
import PinConfigScreen from '../../screens/pin-config/PinConfig';
import PinMuxScreen from '../../screens/pinmux/PinMux';
import Registers from '../../screens/registers/Registers';
import {useActiveScreen} from '../../state/slices/app-context/appContext.selector';
import NavigationPanel from '../navigation-panel/NavigationPanel';

function AppPanel() {
	const activeScreen = useActiveScreen();

	return (
		<NavigationPanel activeNavItem={activeScreen}>
			<PinMuxScreen key={navigationItems.pinmux} />
			<PinConfigScreen key={navigationItems.pinconfig} />
			<ClockConfig key={navigationItems.clockConfig} />
			<Registers key={navigationItems.registers} />
			<Generate key={navigationItems.generate} />
		</NavigationPanel>
	);
}

export default AppPanel;
