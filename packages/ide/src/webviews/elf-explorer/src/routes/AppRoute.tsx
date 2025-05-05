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
// Screens
import Metadata from '../screens/Metadata/Metadata';
import Symbols from '../screens/Symbols/Symbols';
import Stats from '../screens/Stats/Stats';
import MemoryLayout from '../screens/MemoryLayout/MemoryLayout';

// Outside dependencies
import NavigationPanel from '@common/components/navigation-panel/NavigationPanel';
import {navigationItems} from '../common/constants/navigation';

// State
import {useActiveScreen} from '../state/slices/elf-context/elfContext.selector';

/**
 * This component handles the routing mechanism
 * clicking on side nav item, will save selection in store and then based on that, will show the correct screen component
 */
export default function CfsAppPanel() {
	const activeScreen = useActiveScreen();

	return (
		<NavigationPanel activeNavItem={activeScreen}>
			<Stats key={navigationItems.stats} />
			<Metadata key={navigationItems.metadata} />
			<Symbols key={navigationItems.symbols} />
			<MemoryLayout key={navigationItems.memoryLayout} />
		</NavigationPanel>
	);
}
