/**
 *
 * Copyright (c) 2026 Analog Devices, Inc.
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
import {LocalizedMessage} from '../l10n/LocalizedMessage';
import styles from './NoSearchResults.module.scss';

type NoSearchResultsProps = {
	readonly search: string;
};

export default function NoSearchResults({
	search
}: NoSearchResultsProps) {
	return (
		<aside
			className={styles.noSearchResults}
			data-test='no-search-results'
		>
			<h2>
				<LocalizedMessage id='search.noResults' />
			</h2>
			<p data-test='no-results-description'>
				<LocalizedMessage id='search.couldntFindResults' />{' '}
				<span className={styles.searchString}>
					&quot;{search}&quot;
				</span>
				{', '}
				<LocalizedMessage id='search.pleaseChangeQuery' />
			</p>
		</aside>
	);
}
