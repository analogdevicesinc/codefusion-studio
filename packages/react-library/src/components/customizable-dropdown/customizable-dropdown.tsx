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
export type CustomizableDropdownProps = Readonly<{
	children: React.ReactNode;
	value: string;
	startSlot?: React.ReactNode;
	maxHeight?: number;
	containerRef?: HTMLElement;
	dataTest?: string;
	isExpanded: boolean;
	placeholder?: string;
	setIsExpanded: (value: boolean) => void;
}>;

export function CustomizableDropdown({
	value,
	children,
	startSlot,
	maxHeight = 250,
	isExpanded,
	containerRef,
	dataTest,
	placeholder,
	setIsExpanded
}: CustomizableDropdownProps) {
	const dropdownRef = useRef<HTMLDivElement>(null);
	const hasValue = !!value;

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
			{placeholder && !hasValue && !isExpanded && (
				<div className={styles.placeholder} aria-hidden='true'>
					{placeholder}
				</div>
			)}

			<button
				className={styles.dropdownField}
				data-test={
					dataTest ? `${dataTest}_button` : 'group_dropdownbutton'
				}
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
