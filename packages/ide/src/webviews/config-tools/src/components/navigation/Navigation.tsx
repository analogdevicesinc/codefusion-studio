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
import useFilteredNavigationIcons from '../../hooks/use-filtered-navigation-icons';

export default function Navigation() {
	const dispatch = useAppDispatch();
	const activeScreen = useActiveScreen();
	const {mainIcons, footerIcons} = useFilteredNavigationIcons();

	const handleNavItemClick = useCallback(
		async (id: NavigationItem) => {
			dispatch(setActiveScreen(id));
		},
		[dispatch]
	);

	return (
		<CfsNavigation
			activeScreen={activeScreen}
			availableIcons={mainIcons}
			footerIcons={footerIcons}
			onNavItemClick={handleNavItemClick}
		/>
	);
}
