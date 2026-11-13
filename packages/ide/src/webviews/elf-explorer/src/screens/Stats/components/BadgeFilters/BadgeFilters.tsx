/**
 *
 * Copyright (c) 2024-2026 Analog Devices, Inc.
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
import {useLocaleContext} from '@common/contexts/LocaleContext';

type FiltersProps = {
	readonly selectedFilter: string;
	readonly onFilterClick: (filter: string) => void;
};

const FILTER_IDS = ['All', 'Text', 'Data', 'Bss'] as const;

const FILTER_L10N_KEYS: Record<string, string> = {
	All: 'filterAll',
	Text: 'filterText',
	Data: 'filterData',
	Bss: 'filterBss'
};

function BadgeFilter({selectedFilter, onFilterClick}: FiltersProps) {
	const commonL10n = useLocaleContext()?.common as
		| Record<string, string>
		| undefined;

	return (
		<div className={styles.filtersContainer}>
			{FILTER_IDS.map(id => (
				<Chip
					key={id}
					label={commonL10n?.[FILTER_L10N_KEYS[id]] ?? id}
					isDisabled={false}
					isActive={selectedFilter === id}
					dataTest={`stats:badge-filters-${id.toLowerCase()}`}
					onClick={() => {
						onFilterClick(id);
					}}
				/>
			))}
		</div>
	);
}

export default BadgeFilter;
