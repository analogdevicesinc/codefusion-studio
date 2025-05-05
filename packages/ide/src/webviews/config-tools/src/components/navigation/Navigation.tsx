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
import {useCallback} from 'react';

import type {NavigationItem} from '../../../../common/types/navigation';
import CfsNavigation from '../../../../common/components/cfs-navigation/CfsNavigation';

import {useActiveScreen} from '../../state/slices/app-context/appContext.selector';
import {useAppDispatch} from '../../state/store';
import {setActiveScreen} from '../../state/slices/app-context/appContext.reducer';

// SVGs

import PinMUX from '@common/icons/PinMUX';
import Registers from '@common/icons/Registers';
import Generate from '@common/icons/Generate';
import ClockIcon from '@common/icons/Clock';
import Home from '../../../../common/icons/Home';

import {navigationItems} from '@common/constants/navigation';

import {MemoryLayoutIcon, PeripheralsIcon} from 'cfs-react-library';

const availableSVG = [
	{
		icon: <Home />,
		id: navigationItems.dashboard,
		tooltipLabel: 'Dashboard'
	},
	{
		icon: <PeripheralsIcon />,
		id: navigationItems.peripherals,
		tooltipLabel: 'Peripheral Allocation'
	},
	{
		icon: <PinMUX />,
		id: navigationItems.pinmux,
		tooltipLabel: 'Pin Config'
	},
	{
		icon: <ClockIcon />,
		id: navigationItems.clockConfig,
		tooltipLabel: 'Clock Config'
	},
	{
		icon: <MemoryLayoutIcon width={24} height={24} />,
		id: navigationItems.memory,
		tooltipLabel: 'Memory Allocation'
	},
	{
		icon: <Registers />,
		id: navigationItems.registers,
		tooltipLabel: 'Registers'
	},
	{
		icon: <Generate />,
		id: navigationItems.generate,
		tooltipLabel: 'Generate Code'
	}
];

export default function Navigation() {
	const dispatch = useAppDispatch();
	const activeScreen = useActiveScreen();

	const handleNavItemClick = useCallback(
		async (id: NavigationItem) => {
			dispatch(setActiveScreen(id));
		},
		[dispatch]
	);

	return (
		<CfsNavigation
			activeScreen={activeScreen}
			availableIcons={availableSVG}
			onNavItemClick={handleNavItemClick}
		/>
	);
}
