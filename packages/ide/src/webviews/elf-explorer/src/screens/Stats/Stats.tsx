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

// API
import {
	getElfMetadata,
	getSavedOptionsForTableFormat,
	getSections,
	updateSavedOptionsForTableFormat
} from '../../common/api';
// Components
import ScreenLayout from '../../layouts/ScreenLayout/ScreenLayout';
import MetadataOverview from './components/MetadataOverview/MetadataOverview';
import SymbolTypes from './components/SymbolTypes/SymbolTypes';
import SectionsTable from './components/SectionsTable/SectionsTable';
import TopSymbols from './components/TopSymbols/TopSymbols';
import MainSectionChart from './components/Chart/MainSectionChart';
import Loader from '../../components/Loader/Loader';

import {formatSections} from '../../utils/format';
import type {
	TSavedTableOptions,
	TSection
} from '../../common/types/memory-layout';
import styles from './Stats.module.scss';
import type {TSymbol} from '../../common/types/symbols';
import {type TMetadata} from '../../common/types/metadata';

import {extractAllSymbols} from '../../utils/stats-utils';

export default function Stats() {
	const [sections, setSections] = useState<TSection[]>([]);
	const [symbols, setSymbols] = useState<TSymbol[]>([]);
	const [metadata, setMetadata] = useState<TMetadata>({
		header: [],
		armAttributes: [],
		heuristicInfo: []
	});
	const [savedOptions, setSavedOptions] = useState<
		TSavedTableOptions | undefined
	>(undefined);

	const fetchData = useCallback(async () => {
		try {
			const [
				metadataResponse,
				sectionsResponse,
				savedOptionsResponse
			] = await Promise.all([
				getElfMetadata(),
				getSections(),
				getSavedOptionsForTableFormat()
			]);

			setMetadata(metadataResponse);
			setSavedOptions(savedOptionsResponse);

			if (sectionsResponse?.length) {
				const formattedSections = formatSections(
					sectionsResponse,
					true
				);
				setSymbols(extractAllSymbols(formattedSections));
				setSections(formattedSections);
			}
		} catch (err) {
			if (err instanceof Error) {
				throw new Error(`Error fetching data: ${err.message}`);
			} else {
				throw new Error('Error fetching data');
			}
		}
	}, []);

	useEffect(() => {
		void fetchData();
	}, [fetchData]);

	const updateSavedOptions = useCallback(
		(newOptions: TSavedTableOptions) => {
			updateSavedOptionsForTableFormat(newOptions)
				.then((response: TSavedTableOptions) => {
					setSavedOptions(response);
				})
				.catch((err: string) => {
					console.error(err);
					throw new Error(err);
				});
		},
		[]
	);

	return (
		<ScreenLayout>
			<MetadataOverview data={metadata.header} sections={sections} />

			<div className={styles.container} data-test='stats:container'>
				{symbols?.length && sections.length ? (
					<>
						<MainSectionChart sections={sections} />
						<SymbolTypes symbols={symbols} />
						{savedOptions && (
							<SectionsTable
								sections={sections}
								savedOptions={savedOptions}
								onUpdateOptions={newOptions => {
									updateSavedOptions(newOptions);
								}}
							/>
						)}
						{savedOptions && (
							<TopSymbols
								symbols={symbols}
								savedOptions={savedOptions}
								onUpdateOptions={newOptions => {
									updateSavedOptions(newOptions);
								}}
							/>
						)}
					</>
				) : (
					<Loader />
				)}
			</div>
		</ScreenLayout>
	);
}
