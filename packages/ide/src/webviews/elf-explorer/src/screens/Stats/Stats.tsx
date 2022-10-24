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

	useEffect(() => {
		const fetchData = async () => {
			try {
				const metadataResponse = await getElfMetadata();
				setMetadata(metadataResponse);
			} catch (err) {
				console.log('Error fetching metadata:', err);
			}

			try {
				const sectionsResponse = await getSections();

				if (sectionsResponse?.length) {
					const formattedSections = formatSections(
						sectionsResponse,
						true
					);
					setSymbols(extractAllSymbols(formattedSections));
					setSections(formattedSections);
				}
			} catch (err) {
				console.log('Error fetching sections:', err);
			}
		};

		void fetchData();

		getSavedOptionsForTableFormat()
			.then(response => {
				setSavedOptions(response);
			})
			.catch((err: string) => {
				console.error(err);
				throw new Error(err);
			});
	}, []);

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

	return (
		<ScreenLayout>
			<MetadataOverview data={metadata.header} sections={sections} />

			<div className={styles.container}>
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
