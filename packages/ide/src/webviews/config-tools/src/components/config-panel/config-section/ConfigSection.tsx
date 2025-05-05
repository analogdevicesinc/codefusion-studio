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

import ChevronRight from '@common/icons/ChevronRight';
import styles from './ConfigSection.module.scss';
import {useState} from 'react';

function ConfigSection({
	title,
	children,
	isExpanded: initialExpanded,
	isUnavailable = false,
	variant = 'default',
	dataTest,
	handleHeaderClick
}: Readonly<{
	title: string;
	children: React.ReactNode;
	isExpanded?: boolean;
	isUnavailable?: boolean;
	variant?: 'default' | 'navigate' | 'noChevron';
	dataTest?: string;
	handleHeaderClick?: () => void;
}>) {
	const [isExpanded, setIsExpanded] = useState(
		initialExpanded ?? false
	);

	const handleClickEvent = () => {
		if (isUnavailable || variant === 'noChevron') return;

		if (handleHeaderClick) {
			handleHeaderClick();
		} else {
			setIsExpanded(!isExpanded);
		}
	};

	return (
		<div
			className={`${styles.section} ${isUnavailable ? styles.disabled : ''}`}
		>
			<div
				data-test={dataTest ?? ''}
				className={`${styles.sectionHeader} ${isExpanded ? styles.expanded : ''} ${styles[variant]} ${isUnavailable ? styles.disabled : ''}`}
				onClick={handleClickEvent}
			>
				<h5>{title}</h5>
				<ChevronRight />
			</div>
			<div className={`${isExpanded ? '' : styles.collapsed}`}>
				{children}
			</div>
		</div>
	);
}

export default ConfigSection;
