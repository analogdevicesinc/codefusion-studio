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
import {useCallback, type ReactElement} from 'react';
import PinMUX from '@common/icons/PinMUX';
import Config from '@common/icons/Config';
import Registers from '@common/icons/Registers';
import Generate from '@common/icons/Generate';
import ClockIcon from '@common/icons/Clock';
import type {NavigationItem} from '@common/types/navigation';
import {NavItem} from './NavItem';
import {useActiveScreen} from '../../state/slices/app-context/appContext.selector';
import {useAppDispatch} from '../../state/store';
import {setActiveScreen} from '../../state/slices/app-context/appContext.reducer';
import {navigationItems} from '@common/constants/navigation';

import styles from './Navigation.module.scss';

type Icons = {
	icon: ReactElement;
	id: (typeof navigationItems)[keyof typeof navigationItems];
	disabled?: boolean;
	tooltipLabel?: string;
};

const availableSVG: Icons[] = [
	{
		icon: <PinMUX />,
		id: navigationItems.pinmux,
		tooltipLabel: 'Pin Mux'
	},
	{
		icon: <Config />,
		id: navigationItems.pinconfig,
		tooltipLabel: 'Function Config'
	},
	{
		icon: <ClockIcon />,
		id: navigationItems.clockConfig,
		tooltipLabel: 'Clock Config'
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

	const onNavItemClick = useCallback(
		async (id: NavigationItem) => {
			dispatch(setActiveScreen(id));
		},
		[dispatch]
	);

	return (
		<div className={styles.container}>
			{availableSVG.map(({icon, id, disabled, tooltipLabel}) => (
				<NavItem
					key={id}
					id={id}
					disabled={disabled}
					isActive={id === activeScreen}
					icon={icon}
					tooltipLabel={tooltipLabel}
					onClick={onNavItemClick}
				/>
			))}
		</div>
	);
}
