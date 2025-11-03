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
import {useEffect, useState} from 'react';
import type {TSymbol} from '../../../../common/types/symbols';
import styles from './SymbolTypes.module.scss';
import SymbolTypesTable from '../SymbolTypesTable/SymbolTypesTable';
import BadgeFilter from '../BadgeFilters/BadgeFilters';
import {filterSymbols} from '../../../../utils/stats-utils';
import HeaderWithTooltip from '../../../../components/HeaderWithTooltip/HeaderWithTooltip';

import type {TLocaleContext} from '../../../../common/types/context';
import {useLocaleContext} from '@common/contexts/LocaleContext';

type TSymbolTypesProps = {
	readonly symbols: TSymbol[];
};

export default function SymbolTypes({symbols}: TSymbolTypesProps) {
	const [funcs, setFuncs] = useState<TSymbol[]>([]);
	const [vars, setVars] = useState<TSymbol[]>([]);
	const [selectedFilter, setSelectedFilter] = useState('All');
	const i10n: TLocaleContext | undefined =
		useLocaleContext()?.stats?.symbolTypes;

	const handleFilterClick = (filter: string) => {
		setSelectedFilter(filter);
	};

	useEffect(() => {
		filterSymbols(symbols, selectedFilter, setFuncs, setVars);
	}, [selectedFilter, symbols]);

	return (
		<div
			className={styles.container}
			data-test='stats:symbol-types-container'
		>
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

			<article className={styles.tablesWrap}>
				<section>
					<h2 className={styles.uppercaseHeader}>
						Functions by binding
					</h2>
					<SymbolTypesTable data={funcs} />
				</section>
				<section>
					<h2 className={styles.uppercaseHeader}>
						Variables by binding
					</h2>
					<SymbolTypesTable data={vars} />
				</section>
			</article>
		</div>
	);
}
