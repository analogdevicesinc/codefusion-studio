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
// Components
import Charts from './components/Charts/Charts';
import HeaderInfo from './components/HeaderInfo/HeaderInfo';
import AttributesList from './components/AttributesList/AttributesList';
// Layout
import ScreenLayout from '../../layouts/ScreenLayout/ScreenLayout';

import {useLocaleContext} from '@common/contexts/LocaleContext';
import {getElfMetadata, getSections} from '../../common/api';
import {formatSections} from '../../utils/format';
import type {TMetadata} from '../../common/types/metadata';
import type {TSection} from '../../common/types/memory-layout';
import type {TLocaleContext} from '../../common/types/context';

import styles from './Metadata.module.scss';

export default function Metadata() {
	const [metadata, setMetadata] = useState<TMetadata>({
		header: [],
		armAttributes: [],
		heuristicInfo: []
	});
	const [sections, setSections] = useState<TSection[]>([]);
	const i10n: TLocaleContext | undefined =
		useLocaleContext()?.metadata;

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
					const formattedSections = formatSections(sectionsResponse);
					setSections(formattedSections);
				}
			} catch (err) {
				console.log('Error fetching sections:', err);
			}
		};

		void fetchData();
	}, []);

	return (
		<ScreenLayout>
			<div className={styles.container}>
				<Charts sections={sections} />
				<HeaderInfo data={metadata.header ?? []} />
				<section className={styles['lists-container']}>
					<AttributesList
						list={metadata.armAttributes}
						i10n={i10n?.armAttributes || ''}
					/>
					{metadata.heuristicInfo.length > 1 ? (
						<AttributesList
							list={metadata.heuristicInfo}
							i10n={i10n?.heuristicInfo || ''}
						/>
					) : (
						<AttributesList
							list={[]}
							noDataMessage='No heuristics information available.'
							i10n={i10n?.heuristicInfo || ''}
						/>
					)}
				</section>
			</div>
		</ScreenLayout>
	);
}
