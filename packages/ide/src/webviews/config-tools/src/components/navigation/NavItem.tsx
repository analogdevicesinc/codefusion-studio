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
import type {
	NavigationItem,
	NavigationLabel
} from '@common/types/navigation';

import styles from './NavItem.module.scss';

export function NavItem({
	id,
	label,
	disabled,
	icon,
	isActive,
	tooltipLabel,
	onClick
}: {
	readonly id: NavigationItem;
	readonly disabled: boolean | undefined;
	readonly icon: ReactElement;
	readonly isActive: boolean;
	readonly label?: NavigationLabel;
	readonly tooltipLabel?: string;
	readonly onClick: (id: NavigationItem) => void;
}) {
	return (
		<div
			id={id}
			data-test={`nav-item:${id}`}
			data-tooltip={tooltipLabel}
			className={`${styles.icon}${isActive ? ` ${styles.active}` : ''}${disabled ? ` ${styles.disabled}` : ''}`}
			onClick={() => {
				onClick(id);
			}}
		>
			{icon}
			{label && <p>{label}</p>}
			{tooltipLabel && (
				<div
					data-test={`nav-item:${id}:tooltip-notch`}
					className={styles.tooltipNotch}
				/>
			)}
		</div>
	);
}
