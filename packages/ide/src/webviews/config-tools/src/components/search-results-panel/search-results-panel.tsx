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
import {useCallback, useMemo, type ReactNode} from 'react';
import styles from './search-results-panel.module.scss';
import SearchResult, {type SearchResultLayout} from './search-result';
import {type FormattedSearchSection} from './types';
import {
	useRegisterResultList,
	useSearchPanelHighlight
} from './search-panel-keyboard';

/**
 * Replaces the results list when there is nothing to show. The caller
 * decides which case applies, so precedence between "keep typing" and
 * "nothing matched" lives with the screen that owns the search string.
 */
export type SearchResultsEmptyState =
	| {kind: 'minLength'; message: string}
	| {kind: 'noResults'; message: string};

const EMPTY_STATE_TEST_IDS: Record<
	SearchResultsEmptyState['kind'],
	string
> = {
	minLength: 'min-characters',
	noResults: 'no-results'
};

type SearchResultsPanelProps = Readonly<{
	scopeControls: ReactNode;
	sections: FormattedSearchSection[];
	matchedTerm: string;
	resultLayout: SearchResultLayout;
	emptyState?: SearchResultsEmptyState;
	onResultSelect: (sourceIndex: number) => void;
	/**
	 * Identifies the list currently on screen, normally the active search
	 * scope. It is part of every React key below so that switching scopes
	 * remounts the list rather than reconciling unrelated rows into it.
	 */
	resetKey: string;
}>;

/**
 * The floating panel shared by the search pickers: scope controls on top,
 * then either an empty-state message or the captioned result sections.
 * It renders view models only — resolving a selected row back to a domain
 * object is the caller's job, via the `sourceIndex` passed to
 * `onResultSelect`.
 *
 * Width defaults to the content and can be fixed by setting
 * `--search-results-panel-width` on any ancestor.
 */
export default function SearchResultsPanel({
	scopeControls,
	sections,
	matchedTerm,
	resultLayout,
	emptyState,
	onResultSelect,
	resetKey
}: SearchResultsPanelProps) {
	// Sections are a rendering grouping only; keyboard navigation and
	// selection both work off one flat, caption-free row order.
	const flatItems = useMemo(
		() => sections.flatMap(section => section.items),
		[sections]
	);

	const getSourceIndex = useCallback(
		(visualIndex: number) => flatItems[visualIndex].sourceIndex,
		[flatItems]
	);

	useRegisterResultList({
		itemCount: emptyState ? 0 : flatItems.length,
		getSourceIndex,
		onSelect: onResultSelect
	});

	const {activeIndex, onHoverIndex} = useSearchPanelHighlight();

	let visualIndex = -1;

	return (
		<div
			className={styles.container}
			// Selecting a row or a scope chip must not blur the search
			// input first - a blur would dismiss the panel (see
			// useSearchPanelKeyboard) before the click is handled.
			onMouseDown={event => {
				event.preventDefault();
			}}
		>
			{scopeControls}
			<div className={styles.horizontalDivider} />

			{emptyState ? (
				<div
					data-test={EMPTY_STATE_TEST_IDS[emptyState.kind]}
					className={styles.noResultsLabel}
				>
					{emptyState.message}
				</div>
			) : (
				<div
					key={`search-result-${resetKey}-list`}
					className={styles.resultsContainer}
					role='listbox'
				>
					{sections.map((section, sectionIndex) => (
						<div
							key={`search-section-${resetKey}-${
								section.caption ?? sectionIndex
							}`}
						>
							{section.caption && (
								<p
									className={styles.sectionCaption}
									data-test={`search-section-caption-${section.caption}`}
								>
									{section.caption}
								</p>
							)}

							{section.items.map(result => {
								visualIndex++;
								const index = visualIndex;

								return (
									<SearchResult
										key={`search-result-${resetKey}-${result.key}`}
										id={`search-option-${resetKey}-${index}`}
										result={result}
										matchedTerm={matchedTerm}
										layout={resultLayout}
										isActive={index === activeIndex}
										onClick={onResultSelect}
										onHover={() => {
											onHoverIndex(index);
										}}
									/>
								);
							})}
						</div>
					))}
				</div>
			)}
		</div>
	);
}
