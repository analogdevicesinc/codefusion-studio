/**
 *
 * Copyright (c) 2025 Analog Devices, Inc.
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

import {navigationItems} from '../../common/constants/navigation';

import {useActiveScreen} from '../../state/slices/app-context/app-context.selector';
import {useAppDispatch} from '../../state/store';
import {setActiveScreen} from '../../state/slices/app-context/app-context.reducer';

import CfsNavigation from '@common/components/cfs-navigation/CfsNavigation';
import TableIcon from '@common/icons/Table';
import TimelineIcon from '@common/icons/timeline';
import type {NavigationItem} from '../../common/types/navigation';

export default function SevNavigation() {
	const activeScreen = useActiveScreen();
	const dispatch = useAppDispatch();

	const icons = [
		{
			icon: <TimelineIcon />,
			id: navigationItems.timeline,
			tooltipLabel: 'Timeline'
		},
		{
			icon: <TableIcon />,
			id: navigationItems.list,
			tooltipLabel: 'List'
		}
	];

	const handleOnClick = (id: NavigationItem) => {
		dispatch(setActiveScreen(id));
	};

	return (
		<CfsNavigation
			activeScreen={activeScreen}
			availableIcons={icons}
			onNavItemClick={handleOnClick}
		/>
	);
}
