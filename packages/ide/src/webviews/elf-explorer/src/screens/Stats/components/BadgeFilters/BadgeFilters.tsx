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
import {Chip} from 'cfs-react-library';
import styles from './BadgeFilters.module.scss';

type FiltersProps = {
	readonly selectedFilter: string;
	readonly onFilterClick: (filter: string) => void;
};

const FILTERS = ['All', 'Text', 'Data', 'Bss'];

function BadgeFilter({selectedFilter, onFilterClick}: FiltersProps) {
	return (
		<div className={styles.filtersContainer}>
			{FILTERS.map(label => (
				<Chip
					key={label}
					label={label}
					isDisabled={false}
					isActive={selectedFilter === label}
					dataTest={`stats:badge-filters-${label.toLowerCase()}`}
					onClick={() => {
						onFilterClick(label);
					}}
				/>
			))}
		</div>
	);
}

export default BadgeFilter;
