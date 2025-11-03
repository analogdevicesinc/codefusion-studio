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
import GenerateCode from '../../screens/generate-code/GenerateCode';
import PinMuxScreen from '../../screens/pinmux/PinMux';
import Registers from '../../screens/registers/Registers';
import {useActiveScreen} from '../../state/slices/app-context/appContext.selector';
import NavigationPanel from '../navigation-panel/NavigationPanel';
import PeripheralConfig from '../../screens/peripheral-config/PeripheralConfig';
import MemoryAllocation from '../../screens/memory-allocation/MemoryAllocation';
import Dashboard from '../../screens/dashboard/Dashboard';
import {Dfg} from '../../screens/dfg/DFG';
import {AiTools} from '../../screens/ai-tools/ai-tools';
import {Profiling} from '../../screens/profiling/profiling';

function AppPanel() {
	const activeScreen = useActiveScreen();

	return (
		<NavigationPanel activeNavItem={activeScreen}>
			<Dashboard key={navigationItems.dashboard} />
			<PinMuxScreen key={navigationItems.pinmux} />
			<ClockConfig key={navigationItems.clockConfig} />
			<Dfg key={navigationItems.dfg} />
			<PeripheralConfig key={navigationItems.peripherals} />
			<MemoryAllocation key={navigationItems.memory} />
			<Registers key={navigationItems.registers} />
			<AiTools key={navigationItems.aiTools} />
			<Profiling key={navigationItems.profiling} />
			<GenerateCode key={navigationItems.generate} />
		</NavigationPanel>
	);
}

export default AppPanel;
