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

import {useCallback, useState, useRef, useEffect} from 'react';
import {Chip} from 'cfs-react-library';
import DownArrow from '../../../../../common/icons/DownArrow';
import styles from './view-dropdown.module.scss';

export type ViewType = 'Group' | 'Gasket';

type ViewDropdownProps = {
	readonly selectedView: ViewType;
	readonly onViewChange: (view: ViewType) => void;
};

export default function ViewDropdown({
	selectedView,
	onViewChange
}: ViewDropdownProps) {
	const dropdownRef = useRef<HTMLDivElement>(null);
	const [isDropdownOpen, setIsDropdownOpen] =
		useState<boolean>(false);

	const viewOptions: ViewType[] = ['Group', 'Gasket'];

	useEffect(() => {
		document.addEventListener('mousedown', handleOutsideClick);

		return () => {
			document.removeEventListener('mousedown', handleOutsideClick);
		};
	}, []);

	const handleOutsideClick = (event: MouseEvent) => {
		const target = event?.target as Node;

		if (
			dropdownRef.current &&
			!dropdownRef.current.contains(target || null)
		) {
			setIsDropdownOpen(false);
		}
	};

	const onChipClick = useCallback(() => {
		setIsDropdownOpen(prev => !prev);
	}, []);

	const onOptionClick = (option: ViewType) => {
		onViewChange(option);
		setIsDropdownOpen(false);
	};

	return (
		<section
			ref={dropdownRef}
			data-test='dfg:view-dropdown-container'
			className={styles.container}
			onKeyDown={e => {
				if (e.key === 'Escape') {
					setIsDropdownOpen(false);
				}
			}}
		>
			<Chip
				isDisabled={false}
				isActive={isDropdownOpen}
				id='view-by-dropdown'
				label='View By :'
				onClick={() => {
					onChipClick();
				}}
			>
				<div className={styles.chipContent}>
					<span>{selectedView}</span>
					<span
						className={`${styles.arrow} ${isDropdownOpen ? styles.arrowOpen : ''}`}
					>
						<DownArrow width='10' height='10' />
					</span>
				</div>
			</Chip>

			<div
				className={`${isDropdownOpen ? styles.show : styles.hide} ${styles.panel}`}
			>
				<div className={styles.optionsContainer}>
					{viewOptions.map(option => (
						<button
							key={option}
							type='button'
							className={styles.option}
							data-test={`view-dropdown-option-${option.toLowerCase()}`}
							onClick={() => {
								onOptionClick(option);
							}}
						>
							{option}
						</button>
					))}
				</div>
			</div>
		</section>
	);
}
