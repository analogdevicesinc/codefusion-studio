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
import ScopeFilterControls from './scope-filter-controls';
import SearchResultsPanel, {
	type SearchResultsEmptyState
} from '../../../../components/search-results-panel/search-results-panel';
import {
	useSruConnectionsFilter,
	useSruConnectionsSearchScope,
	useSruExpandedSignals
} from '../../../../state/slices/sru/sru.selector';
import {
	type TLocaleContext,
	useLocaleContext
} from '@common/contexts/LocaleContext';
import {
	useEffectiveSruConnectionsSearchScope,
	useSruSearchResults
} from '../../../../hooks/use-sru-search-results';
import {
	selectSruInput,
	selectSruOutput,
	revealNavigationGroup,
	setConnectionsFilter,
	setExpandedSignals,
	setSelectedSignalGroup,
	setSruConnectionsSearchScope
} from '../../../../state/slices/sru/sru.reducer';
import {useAppDispatch} from '../../../../state/store';
import {
	formatDescriptionResults,
	formatPeripheralResults,
	formatPinBufferResults,
	formatSignalResults
} from './utils/format-search-results';
import {useCallback, useMemo} from 'react';
import {
	MIN_SRU_SEARCH_LENGTH,
	SRU_SEARCH_SCOPES
} from '../constants/search-scope';
import type {SruInputSignal, SruOutputSignal} from 'cfs-types';
import type {SruPeripheralSignalGroup} from '../../../../utils/sru-navigation';
import type {SruGroupScopeMatch} from '../../../../utils/sru-search';

export default function SearchScopePicker() {
	const l10n: TLocaleContext | undefined =
		useLocaleContext()?.signalRoutingUnit?.connections;
	const dispatch = useAppDispatch();

	const {searchText} = useSruConnectionsFilter();
	const activeScope = useSruConnectionsSearchScope();
	const expandedSignals = useSruExpandedSignals();
	const results = useSruSearchResults();
	const effectiveScope = useEffectiveSruConnectionsSearchScope();

	const sectionCaptions = l10n?.search?.sections;
	const groupsCaption = sectionCaptions?.groups ?? 'Groups';

	const formattedSections = useMemo(() => {
		switch (effectiveScope) {
			case SRU_SEARCH_SCOPES.PIN_BUFFERS:
				return formatPinBufferResults(results.pinBufferGroups, {
					pinBuffers: sectionCaptions?.pinBuffers ?? 'Pin Buffers',
					groups: groupsCaption
				});
			case SRU_SEARCH_SCOPES.PERIPHERALS:
				return formatPeripheralResults(results.peripheralGroups, {
					peripherals: sectionCaptions?.peripherals ?? 'Peripherals',
					groups: groupsCaption
				});
			case SRU_SEARCH_SCOPES.SIGNALS:
				return formatSignalResults(results.signalMatches);
			case SRU_SEARCH_SCOPES.DESCRIPTIONS:
				return formatDescriptionResults(results.descriptionMatches, {
					connection:
						sectionCaptions?.connectionDescriptions ??
						'Connection Descriptions',
					signal:
						sectionCaptions?.signalDescriptions ??
						'Signal Descriptions',
					peripheral:
						sectionCaptions?.peripheralDescriptions ??
						'Peripheral Descriptions'
				});
			default:
				return [];
		}
	}, [effectiveScope, results, sectionCaptions, groupsCaption]);

	const emptyState = useMemo<
		SearchResultsEmptyState | undefined
	>(() => {
		if (searchText.length < MIN_SRU_SEARCH_LENGTH) {
			return {
				kind: 'minLength',
				message: l10n?.search?.minLength?.replace(
					'{minLength}',
					String(MIN_SRU_SEARCH_LENGTH)
				)
			};
		}

		const totalResultCount = formattedSections.reduce(
			(count, section) => count + section.items.length,
			0
		);

		if (totalResultCount === 0) {
			return {
				kind: 'noResults',
				message: l10n?.search?.noResults
			};
		}

		return undefined;
	}, [searchText, formattedSections, l10n]);

	const selectSignal = useCallback(
		(
			signalGroup: SruPeripheralSignalGroup,
			signal: SruInputSignal | SruOutputSignal,
			direction: 'input' | 'output'
		) => {
			dispatch(setSelectedSignalGroup(signalGroup.key));

			if (!expandedSignals.includes(signal.Name)) {
				dispatch(
					setExpandedSignals([...expandedSignals, signal.Name])
				);
			}

			if (direction === 'input') {
				dispatch(
					selectSruInput({
						peripheralName: signalGroup.peripheralName,
						input: signal as SruInputSignal
					})
				);
			} else {
				dispatch(
					selectSruOutput({
						peripheralName: signalGroup.peripheralName,
						output: signal as SruOutputSignal
					})
				);
			}
		},
		[dispatch, expandedSignals]
	);

	const selectGroupScopeMatch = useCallback(
		(match: SruGroupScopeMatch) => {
			if (match.kind === 'navigationGroup') {
				dispatch(
					revealNavigationGroup({
						sectionKind: match.sectionKind,
						group: match.group
					})
				);
			} else {
				dispatch(setSelectedSignalGroup(match.signalGroup.key));
			}
		},
		[dispatch]
	);

	const handleResultClick = useCallback(
		(sourceIndex: number) => {
			if (effectiveScope !== activeScope) {
				dispatch(setSruConnectionsSearchScope(effectiveScope));
			}

			switch (effectiveScope) {
				case SRU_SEARCH_SCOPES.PIN_BUFFERS:
					selectGroupScopeMatch(results.pinBufferGroups[sourceIndex]);
					break;

				case SRU_SEARCH_SCOPES.PERIPHERALS:
					selectGroupScopeMatch(
						results.peripheralGroups[sourceIndex]
					);
					break;

				case SRU_SEARCH_SCOPES.SIGNALS: {
					const match = results.signalMatches[sourceIndex];
					selectSignal(
						match.signalGroup,
						match.signal,
						match.direction
					);
					break;
				}

				case SRU_SEARCH_SCOPES.DESCRIPTIONS: {
					const match = results.descriptionMatches[sourceIndex];

					if (match.kind === 'peripheral') {
						dispatch(setSelectedSignalGroup(match.signalGroup.key));
					} else if (match.kind === 'signal') {
						selectSignal(
							match.signalGroup,
							match.signal,
							match.direction
						);
					} else {
						selectSignal(match.signalGroup, match.input, 'input');
					}

					break;
				}

				default:
					break;
			}

			dispatch(setConnectionsFilter({searchText: ''}));
		},
		[
			dispatch,
			effectiveScope,
			activeScope,
			results,
			selectSignal,
			selectGroupScopeMatch
		]
	);

	return (
		<SearchResultsPanel
			scopeControls={<ScopeFilterControls />}
			sections={formattedSections}
			matchedTerm={searchText}
			resultLayout='stacked'
			emptyState={emptyState}
			resetKey={effectiveScope}
			onResultSelect={handleResultClick}
		/>
	);
}
