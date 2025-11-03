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
import {useCallback} from 'react';

import type {NavigationItem} from '@common/types/navigation';
import CfsNavigation from '@common/components/cfs-navigation/CfsNavigation';

import {setActiveScreen} from '../../state/slices/app-context/appContext.reducer';
import {useActiveScreen} from '../../state/slices/app-context/appContext.selector';
import {useAppDispatch} from '../../state/store';
import {availableIcons} from '../../constants/navigation-icons';
import {navigationItems} from '../../../../common/constants/navigation';
import {getClockNodeDictionary} from '../../utils/clock-nodes';
import {getGasketDictionary} from '../../utils/dfg';
import {getCoreMemoryDictionary} from '../../utils/memory';
import {getSocPinDictionary} from '../../utils/soc-pins';
import {getAICores} from '../../utils/ai-tools';
import {getProjectInfoList} from '../../utils/config';

export default function Navigation() {
	const dispatch = useAppDispatch();
	const activeScreen = useActiveScreen();
	const aiCores = getAICores();
	const projects = getProjectInfoList();

	const displayedIcons = availableIcons.filter(icon => {
		if (icon.id === navigationItems.dfg) {
			return Object.keys(getGasketDictionary()).length > 0;
		}

		if (icon.id === navigationItems.clockConfig) {
			return Object.keys(getClockNodeDictionary()).length > 0;
		}

		if (icon.id === navigationItems.memory) {
			return Object.keys(getCoreMemoryDictionary()).length > 0;
		}

		if (icon.id === navigationItems.pinmux) {
			// Only show pinmux if there is more than one pin in the SoC package.
			// Sometimes to keep Yoda/Soc Schema happy, we populate one dummy pin but the package is still unsupported.
			return Object.keys(getSocPinDictionary()).length > 1;
		}

		if (icon.id === navigationItems.aiTools) {
			return aiCores.length > 0;
		}

		if (icon.id === navigationItems.profiling) {
			return (
				projects?.some(p => p.FirmwarePlatform === 'zephyr') ?? false
			);
		}

		return true;
	});

	const handleNavItemClick = useCallback(
		async (id: NavigationItem) => {
			dispatch(setActiveScreen(id));
		},
		[dispatch]
	);

	return (
		<CfsNavigation
			activeScreen={activeScreen}
			availableIcons={displayedIcons}
			onNavItemClick={handleNavItemClick}
		/>
	);
}
