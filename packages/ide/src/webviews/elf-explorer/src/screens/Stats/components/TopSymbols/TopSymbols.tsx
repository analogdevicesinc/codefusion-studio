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
import {useState, useEffect} from 'react';
import type {TSymbol} from '../../../../common/types/symbols';
import type {TLocaleContext} from '../../../../common/types/context';
import type {TSavedTableOptions} from '../../../../common/types/memory-layout';
import styles from './TopSymbols.module.scss';
import BadgeFilter from '../BadgeFilters/BadgeFilters';
import TopSymbolsTable from '../TopSymbolsTable/TopSymbolsTable';
import {filterTopSymbols} from '../../../../utils/stats-utils';
import HeaderWithTooltip from '../../../../components/HeaderWithTooltip/HeaderWithTooltip';
import {useLocaleContext} from '@common/contexts/LocaleContext';

type TopSymbolsProps = {
	readonly symbols: TSymbol[];
	readonly savedOptions: TSavedTableOptions;
	readonly onUpdateOptions: (newOption: TSavedTableOptions) => void;
};

export default function TopSymbols({
	symbols,
	savedOptions,
	onUpdateOptions
}: TopSymbolsProps) {
	const [selectedFilter, setSelectedFilter] = useState('All');
	const [filter, setFilter] = useState<TSymbol[]>([]);
	const i10n: TLocaleContext | undefined =
		useLocaleContext()?.stats?.topSymbols;

	const handleFilterClick = (filter: string) => {
		setSelectedFilter(filter);
	};

	useEffect(() => {
		filterTopSymbols(symbols, selectedFilter, setFilter);
	}, [selectedFilter, symbols]);

	return (
		<div className={styles.container}>
			<article className={styles.filtersWrap}>
				<div className={styles.title}>
					<HeaderWithTooltip title={i10n?.title} i10n={i10n} />
				</div>

				<div className={styles.filters}>
					<BadgeFilter
						selectedFilter={selectedFilter}
						onFilterClick={handleFilterClick}
					/>
				</div>
			</article>
			<article>
				<TopSymbolsTable
					data={filter}
					savedOptions={savedOptions}
					onUpdateOptions={onUpdateOptions}
				/>
			</article>
		</div>
	);
}
