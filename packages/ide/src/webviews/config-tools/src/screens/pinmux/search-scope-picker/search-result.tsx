/**
 *
 * Copyright (c) 2025 Analog Devices, Inc.
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
import {memo} from 'react';
import styles from './search-scope-picker.module.scss';
import {type FormatedSearchResultItem} from '../utils/search-results';

type SearchResultProps = Readonly<{
	result: FormatedSearchResultItem;
	matchedTerm: string;
	onClick: (sourceIndex: number) => void;
}>;

function SearchResult({
	result,
	matchedTerm,
	onClick
}: SearchResultProps) {
	return (
		<div
			className={styles.searchResult}
			data-test={`search-result-${result.displayName}-${result.subDisplayName}`}
			onClick={() => {
				onClick(result.sourceIndex);
			}}
		>
			<p className={styles.title} data-test='search-result-title'>
				{highlight(result.displayName, matchedTerm)}
			</p>

			{result.subDisplayName && (
				<p
					className={styles.subtitle}
					data-test='search-result-subtitle'
				>
					{highlight(result.subDisplayName, matchedTerm)}
				</p>
			)}
		</div>
	);
}

/* ------ Helpers ----- */

function highlight(text: string, matchedTerm: string) {
	if (!matchedTerm) {
		return <span>{text}</span>;
	}

	const regex = new RegExp(`(${escapeRegExp(matchedTerm)})`, 'gi');
	const parts = text.split(regex);

	const seen = new Map<string, number>();

	const getKey = (value: string) => {
		const count = seen.get(value) ?? 0;
		seen.set(value, count + 1);

		return `${value}-${count}`;
	};

	return parts.map(part => {
		const isMatch = part.toLowerCase() === matchedTerm.toLowerCase();

		return isMatch ? (
			<mark key={`mark-${getKey(part)}`}>{part}</mark>
		) : (
			<span key={`text-${getKey(part)}`}>{part}</span>
		);
	});
}

function escapeRegExp(value: string) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default memo(SearchResult);
