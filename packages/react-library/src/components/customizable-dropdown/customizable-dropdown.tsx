/**
 *
 * Copyright (c) 2024 - 2025 Analog Devices, Inc.
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

import {useCallback, useEffect, useRef} from 'react';
import styles from './customizable-dropdown.module.scss';
import DownArrowIcon from '../icons/down-arrow-icon';

/**
 * ParentRef: a reference to a parent element which top and bottom will be used to determine if the dropdown should open upwards. If none is given just the windows height is used
 *
 */
export type CustomizableDropdownProps = {
	readonly children: React.ReactNode;
	readonly value: string;
	readonly startSlot?: React.ReactNode;
	readonly maxHeight?: number;
	readonly containerRef?: HTMLElement;
	readonly dataTest?: string;
	readonly isExpanded: boolean;
	readonly setIsExpanded: (value: boolean) => void;
};

export function CustomizableDropdown({
	value,
	children,
	startSlot,
	maxHeight = 250,
	isExpanded,
	containerRef,
	dataTest,
	setIsExpanded
}: CustomizableDropdownProps) {
	const dropdownRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (isExpanded) {
			// click outside
			const handleClickOutside = () => {
				if (isExpanded && dropdownRef.current) {
					setIsExpanded(false);
				}
			};
			setTimeout(() =>
				document.addEventListener('click', handleClickOutside)
			);
			return () =>
				document.removeEventListener('click', handleClickOutside);
		}
	}, [isExpanded, setIsExpanded]);

	const shouldOpenOnTop = useCallback(() => {
		if (!dropdownRef.current) {
			return false;
		}

		const dropdownRect = dropdownRef.current.getBoundingClientRect();

		let containerRefBottom = 0;
		if (containerRef) {
			const containerRect = containerRef.getBoundingClientRect();
			containerRefBottom =
				containerRect.bottom - containerRect.height;
		}

		const windowHeight = window.innerHeight;
		return (
			dropdownRect.top + maxHeight > windowHeight - containerRefBottom
		);
	}, [containerRef, maxHeight]);

	return (
		<div
			className={styles.container}
			ref={dropdownRef}
			data-test={dataTest}
		>
			<button
				className={styles.dropdownField}
				onClick={() => {
					setIsExpanded(!isExpanded);
				}}
			>
				<span className={styles.startSlot}>{startSlot}</span>
				<span className={styles.valueSlot}>{value}</span>
				<div
					className={`${styles.indicator}${isExpanded ? ` ${styles.expanded}` : ''}`}
				>
					<DownArrowIcon />
				</div>
			</button>
			<div className={styles.dropdownContainer}>
				{isExpanded && (
					<div
						style={{
							maxHeight: `${maxHeight}px`
						}}
						className={`${styles.dropdownPanel} ${shouldOpenOnTop() && styles.upwardsDropdown}`}
						onClick={e => e.stopPropagation()}
						data-test={`${dataTest}-content`}
					>
						{children}
					</div>
				)}
			</div>
		</div>
	);
}
