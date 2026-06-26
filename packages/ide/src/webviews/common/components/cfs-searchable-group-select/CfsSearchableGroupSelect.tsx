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
import {memo, useCallback, useEffect, useMemo, useState} from 'react';

import styles from './CfsSearchableGroupSelect.module.scss';
import {
	CollapseAllIcon,
	ExpandAllIcon,
	SearchInput,
	SegmentedControls
} from 'cfs-react-library';
import CfsGroupedRadioSelection, {
	type SelectionGroup
} from '../cfs-grouped-radio-selection/CfsGroupedRadioSelection';
import {LocalizedMessage} from '../l10n/LocalizedMessage';

type CfsSocSelectProps = Readonly<{
	groupedOptions: SelectionGroup[];
	selectedOption: string | undefined;
	searchPlaceholder?: string;
	dataTest?: string;
	setSelectedOption: (optionId: string) => void;
	renderSelectedContent?: (optionId: string) => React.ReactNode;
	renderTitleEnhancement?: (id: string) => React.ReactNode;
}>;

function CfsSearchableGroupSelect({
	groupedOptions,
	selectedOption,
	searchPlaceholder,
	dataTest = 'searchable-grouped-selection',
	setSelectedOption,
	renderSelectedContent,
	renderTitleEnhancement
}: CfsSocSelectProps) {
	const [search, setSearch] = useState<string>('');

	const [openGroups, setOpenGroups] = useState<
		Record<string, boolean>
	>({});

	const expandAll = useCallback(() => {
		setOpenGroups(
			Object.fromEntries(
				groupedOptions.map(group => [group.id, true])
			)
		);
	}, [groupedOptions, setOpenGroups]);

	const collapseAll = useCallback(() => {
		setOpenGroups({});
	}, [setOpenGroups]);

	useEffect(() => {
		if (search.trim()) {
			expandAll();
		} else {
			collapseAll();
		}
	}, [search, collapseAll, expandAll]);

	const filteredGroupedOptions = useMemo(() => {
		const searchPattern = createSearchPattern(search);

		return groupedOptions
			.map(group => ({
				...group,
				options: group.options.filter(option =>
					searchPattern.test(option.label)
				)
			}))
			.filter(group => group.options.length > 0);
	}, [search, groupedOptions]);

	const catalogItemsCount = useMemo(
		() =>
			filteredGroupedOptions.reduce(
				(count, group) => count + group.options.length,
				0
			),
		[filteredGroupedOptions]
	);

	return (
		<div
			data-test={`${dataTest}:container`}
			className={styles.container}
		>
			<div className={styles.searchBox}>
				<SearchInput
					inputVal={search}
					placeholder={searchPlaceholder}
					rightAdornment={
						<span className={styles.rightAdornment}>
							<LocalizedMessage
								id={
									catalogItemsCount === 1
										? 'search.matchesAvailableSingular'
										: 'search.matchesAvailable'
								}
								params={{
									matchesCount:
										catalogItemsCount.toLocaleString('en-US')
								}}
							/>
						</span>
					}
					onClear={() => {
						setSearch('');
					}}
					onInputChange={val => {
						setSearch(val);
					}}
				/>
				<SegmentedControls
					dataTest={`${dataTest}:segmented-controls`}
					options={[
						{
							key: 'expand',
							tooltip: 'Expand all',
							content: <ExpandAllIcon />,
							onClick: expandAll
						},
						{
							key: 'collapse',
							tooltip: 'Collapse all',
							content: <CollapseAllIcon />,
							onClick: collapseAll
						}
					]}
				/>
			</div>

			{catalogItemsCount > 0 ? (
				<CfsGroupedRadioSelection
					options={filteredGroupedOptions}
					selectedId={selectedOption}
					highlightQuery={createSearchPattern(search)}
					openGroups={openGroups}
					dataTest={dataTest}
					setOpenGroups={setOpenGroups}
					renderSelectedContent={renderSelectedContent}
					renderTitleEnhancement={renderTitleEnhancement}
					onChange={setSelectedOption}
				/>
			) : (
				<NoSearchResults search={search} />
			)}
		</div>
	);
}

function NoSearchResults({search}: {readonly search: string}) {
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

function createSearchPattern(search: string): RegExp {
	// Creates a regex pattern based on the search string that ignores whitespace, underscores, slashes, and dashes between characters.
	// to something like this: "s[\\s_/-]*e[\\s_/-]*a[\\s_/-]*r[\\s_/-]*c[\\s_/-]*h" for the search string "search".
	// For example, "adsp21834" would match "ADSP21834", "ADSP_21834", "ADSP-21834", and "ADSP/21834".
	const pattern = search
		.trim()
		.replace(/[\s_/-]+/g, '')
		// Split to single characters...
		.split('')
		// ...in order to map it and escape
		.map(char => char.replace(/[\\^$*+?.()|[\]{}/-]/g, '\\$&'))
		.join('[\\s_/-]*');

	return new RegExp(pattern, 'i');
}

export default memo(CfsSearchableGroupSelect);
