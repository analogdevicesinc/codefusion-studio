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
import {VSCodeBadge} from '@vscode/webview-ui-toolkit/react';
import styles from './BadgeFilters.module.scss';

type FiltersProps = {
	readonly selectedFilter: string;
	readonly onFilterClick: (filter: string) => void;
};

function BadgeFilter({selectedFilter, onFilterClick}: FiltersProps) {
	return (
		<>
			<VSCodeBadge
				className={`${styles.customBadge} ${selectedFilter === 'All' ? styles.selected : ''}`}
				onClick={() => {
					onFilterClick('All');
				}}
			>
				All
			</VSCodeBadge>
			<VSCodeBadge
				className={`${styles.customBadge} ${selectedFilter === 'Text' ? styles.selected : ''}`}
				onClick={() => {
					onFilterClick('Text');
				}}
			>
				Text
			</VSCodeBadge>
			<VSCodeBadge
				className={`${styles.customBadge} ${selectedFilter === 'Data' ? styles.selected : ''}`}
				onClick={() => {
					onFilterClick('Data');
				}}
			>
				Data
			</VSCodeBadge>
			<VSCodeBadge
				className={`${styles.customBadge} ${selectedFilter === 'Bss' ? styles.selected : ''}`}
				onClick={() => {
					onFilterClick('Bss');
				}}
			>
				Bss
			</VSCodeBadge>
		</>
	);
}

export default BadgeFilter;
