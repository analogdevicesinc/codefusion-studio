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

import type {NavigationItem} from '../../common/types/navigation';
import CfsNavigation from '../../../../common/components/cfs-navigation/CfsNavigation';

import {useActiveScreen} from '../../state/slices/elf-context/elfContext.selector';
import {useAppDispatch} from '../../state/store';
import {setActiveScreen} from '../../state/slices/elf-context/elfContext.reducer';

// SVGs
import Metadata from '@common/icons/Metadata';
import Symbols from '@common/icons/Symbols';
import Stats from '@common/icons/Stats';
import MemoryLayout from '@common/icons/MemoryLayout';

import {navigationItems} from '../../common/constants/navigation';
import type {TLocaleContext} from '../../common/types/context';
import {useLocaleContext} from '@common/contexts/LocaleContext';

export default function Navigation() {
	const i10n: TLocaleContext | undefined = useLocaleContext();
	const dispatch = useAppDispatch();
	const activeScreen = useActiveScreen();

	const availableSVG = [
		{
			icon: <Stats />,
			id: navigationItems.stats,
			tooltipLabel: i10n?.[navigationItems.stats]?.title
		},
		{
			icon: <Metadata />,
			id: navigationItems.metadata,
			tooltipLabel: i10n?.[navigationItems.metadata]?.title
		},
		{
			icon: <Symbols />,
			id: navigationItems.symbols,
			tooltipLabel: i10n?.[navigationItems.symbols]?.title
		},
		{
			icon: <MemoryLayout />,
			id: navigationItems.memoryLayout,
			tooltipLabel: i10n?.[navigationItems.memoryLayout]?.title
		}
	];

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
