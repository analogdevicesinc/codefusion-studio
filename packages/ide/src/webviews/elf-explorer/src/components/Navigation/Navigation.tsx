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

import type {NavigationItem} from '../../common/types/navigation';

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

import styles from './Navigation.module.scss';
import {NavItem} from '../../../../config-tools/src/components/navigation/NavItem';

type INavItems = {
	icon: ReactElement;
	id: (typeof navigationItems)[keyof typeof navigationItems];
	disabled?: boolean;
	label: string;
};

export default function CfsNavigation() {
	const availableSVG: INavItems[] = [
		{icon: <Stats />, id: navigationItems.stats, label: 'Statistics'},
		{
			icon: <Metadata />,
			id: navigationItems.metadata,
			label: 'Metadata'
		},
		{
			icon: <Symbols />,
			id: navigationItems.symbols,
			label: 'Symbol Explorer'
		},
		{
			icon: <MemoryLayout />,
			id: navigationItems.memoryLayout,
			label: 'Memory Layout'
		}
	];

	const dispatch = useAppDispatch();
	const activeScreen = useActiveScreen();
	const i10n: TLocaleContext | undefined = useLocaleContext();

	const onNavItemClick = useCallback(
		async (id: NavigationItem) => {
			dispatch(setActiveScreen(id));
		},
		[dispatch]
	);

	return (
		<div className={styles.container}>
			{availableSVG.map(({icon, id, disabled, label}) => (
				<NavItem
					key={id}
					id={id as any}
					disabled={disabled}
					isActive={id === activeScreen}
					label={i10n?.[`${id}`]?.title as string}
					tooltipLabel={label}
					icon={icon}
					onClick={onNavItemClick as any}
				/>
			))}
		</div>
	);
}
