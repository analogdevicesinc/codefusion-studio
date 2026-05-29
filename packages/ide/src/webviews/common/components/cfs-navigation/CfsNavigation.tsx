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
import {type ReactElement} from 'react';
import {CfsNavItem} from './CfsNavItem';

import styles from './CfsNavigation.module.scss';

type Icons<T extends string> = {
	icon: ReactElement;
	id: T;
	disabled?: boolean;
	tooltipLabel?: string;
};

type CfsNavigationProps<T extends string> = {
	readonly activeScreen: string;
	readonly availableIcons: Array<Icons<T>>;
	readonly footerIcons?: Array<Icons<T>>;
	readonly onNavItemClick: (id: T) => void;
};

export default function CfsNavigation<T extends string>({
	activeScreen,
	availableIcons,
	footerIcons,
	onNavItemClick
}: CfsNavigationProps<T>) {
	const handleItemClick = (id: T) => {
		onNavItemClick(id);
	};

	const renderNavItems = (icons: Array<Icons<T>>) =>
		icons.map(({icon, id, disabled, tooltipLabel}) => (
			<CfsNavItem
				key={id}
				id={id}
				disabled={disabled}
				isActive={id === activeScreen}
				tooltipLabel={tooltipLabel}
				icon={icon}
				onClick={handleItemClick}
			/>
		));

	return (
		<nav className={styles.container}>
			{renderNavItems(availableIcons)}
			{footerIcons && footerIcons.length > 0 && (
				<>
					<div className={styles.footer} />
					{renderNavItems(footerIcons)}
				</>
			)}
		</nav>
	);
}
