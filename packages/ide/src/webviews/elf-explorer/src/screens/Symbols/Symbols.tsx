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
import {useCallback, useEffect, useState} from 'react';
import type React from 'react';
import {
	getSavedOptionsForTableFormat,
	getSymbols,
	updateSavedOptionsForTableFormat
} from '../../common/api';
// Components
import SymbolsTable from './components/Table/SymbolsTable';
import SymbolsFilters from './components/Filters/SymbolsFilters';
import SymbolsSearch from './components/Search/SymbolsSearch';
import Loader from '../../components/Loader/Loader';
// Context
import {useAppContext} from '../../common/contexts/AppContext';

import ScreenLayout from '../../layouts/ScreenLayout/ScreenLayout';
import styles from './Symbols.module.scss';

import {formatSymbols} from '../../utils/format';
import {formatSymbolPathForQuery} from '../../utils/symbols-utils';
import {
	SYMBOL_COLUMNS,
	type TSymbol
} from '../../common/types/symbols';
import type {
	TSavedTableOptions,
	TSymbolResponse
} from '../../common/types/memory-layout';

export default function Symbols() {
	const [data, setData] = useState<{
		symbols: TSymbol[];
		error: string | undefined;
	}>({symbols: [], error: undefined});
	const [loading, setLoading] = useState<boolean>(false);
	const [savedOptions, setSavedOptions] = useState<
		TSavedTableOptions | undefined
	>(undefined);

	const {query, editQuery} = useAppContext();

	useEffect(() => {
		getSavedOptionsForTableFormat()
			.then(response => {
				setSavedOptions(response);
			})
			.catch((err: string) => {
				console.error(err);
				throw new Error(err);
			});
	}, []);

	useEffect(() => {
		setLoading(true);

		getSymbols(query)
			.then((response: TSymbolResponse[]) => {
				const formattedSymbols = formatSymbols(response);

				const symbols =
					formattedSymbols && Object.keys(formattedSymbols).length
						? formattedSymbols
						: [];

				setData(_ => ({
					symbols,
					error: undefined
				}));
				setLoading(false);
			})
			.catch((err: string) => {
				setData(_ => ({
					symbols: [],
					error: err
				}));
				setLoading(false);
			});
	}, [query]);

	const onEmitQuery = useCallback(
		(query: string) => {
			editQuery(query);
		},
		[editQuery]
	);

	const search = useCallback(
		(value: string) => {
			const query = isNaN(Number(value))
				? `SELECT * FROM symbols WHERE name LIKE '%${value}%'`
				: `SELECT * FROM symbols WHERE name LIKE '%${value}%' OR address = ${value}`;

			editQuery(query);
		},
		[editQuery]
	);

	const filterBySymbol = useCallback(
		(column: string, value: string) => {
			// We want to send the real typeof value to query and since value is always typeof === 'string' because is taken out from a string
			// we need to find the correct symbol by not using Strict Equality.
			let query = '';

			const symbol = data.symbols.find(
				// eslint-disable-next-line eqeqeq
				symbol => symbol[column] == value
			);
			value = symbol ? symbol[column] : value;

			let formattedValue =
				typeof value === 'string' ? `'${value}'` : value;
			// Particular case for address value which is typeof string
			formattedValue = column === 'address' ? value : formattedValue;
			query = `SELECT * FROM symbols WHERE ${column} = ${formattedValue}`;

			if (column === (SYMBOL_COLUMNS.PATH as typeof column)) {
				query = `SELECT * FROM symbols WHERE ${column} LIKE ${formatSymbolPathForQuery(formattedValue)}`;
			}

			editQuery(query);
		},
		[data, editQuery]
	);

	const updateSavedOptions = (newOptions: TSavedTableOptions) => {
		updateSavedOptionsForTableFormat(newOptions)
			.then((response: TSavedTableOptions) => {
				setSavedOptions(response);
			})
			.catch((err: string) => {
				console.error(err);
				throw new Error(err);
			});
	};

	const showContent = (): React.ReactNode => {
		if (data.symbols?.length && !data.error && savedOptions) {
			return (
				<SymbolsTable
					data={data.symbols}
					savedOptions={savedOptions}
					emitValToFilter={filterBySymbol}
					onUpdateOptions={updateSavedOptions}
				/>
			);
		}

		if (!data.symbols.length && !data.error) {
			return (
				<div className={styles['no-data']}>
					No items matching your query were found.
				</div>
			);
		}

		return <span />;
	};

	return (
		<ScreenLayout>
			<div className={styles.header}>
				<div className={styles.search}>
					<SymbolsSearch emitValue={search} />
				</div>
			</div>
			<section className={styles['table-section']}>
				<div className={styles['sticky-search']}>
					<SymbolsFilters
						queryToSet={query}
						error={data.error}
						emitQuery={(query: string) => {
							onEmitQuery(query);
						}}
					/>
				</div>
				{loading ? <Loader /> : showContent()}
			</section>
		</ScreenLayout>
	);
}
