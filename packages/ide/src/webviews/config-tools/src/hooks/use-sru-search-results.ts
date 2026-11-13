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
import {createSelector} from '@reduxjs/toolkit';
import {groupSruSignals} from '../utils/sru-navigation';
import {
	computeSruSearchMatches,
	filterSruPeripheralsByStatus,
	getAvailableSruSearchScopes,
	resolveEffectiveSruSearchScope
} from '../utils/sru-search';
import {
	selectConnectionByInput,
	selectConnectionsFilter,
	selectConnectionsSearchScope,
	selectModifiedConnectionEntries,
	selectSignalAliases
} from '../state/slices/sru/sru.selector';
import {useAppSelector, type RootState} from '../state/store';
import {
	MIN_SRU_SEARCH_LENGTH,
	type SruSearchScope
} from '../screens/signal-routing-unit/connections/constants/search-scope';
import {SruFilterState} from '../state/slices/sru/sru.reducer';

const selectConnectionsStatusFilter = (state: RootState) =>
	selectConnectionsFilter(state).statusFilter;

const selectConnectionsSearchText = (state: RootState) =>
	selectConnectionsFilter(state).searchText;

/**
 * Status-filtered navigation sections for the Connections side panel.
 * Shared across hook consumers via createSelector's memo cache.
 */
export const selectSruBaseNavigationSections = createSelector(
	[selectConnectionsStatusFilter, selectModifiedConnectionEntries],
	(statusFilter, modifiedConnections) =>
		groupSruSignals(
			filterSruPeripheralsByStatus(
				{statusFilter},
				modifiedConnections
			)
		)
);

/**
 * Scope-specific search matches for the current Connections filter text.
 * One scan of the navigation tree is shared by every hook consumer.
 */
export const selectSruSearchMatches = createSelector(
	[
		selectSruBaseNavigationSections,
		selectConnectionsSearchText,
		selectConnectionByInput,
		selectSignalAliases
	],
	(baseSections, searchText, connectionByInput, signalAliases) =>
		computeSruSearchMatches(
			baseSections,
			searchText,
			connectionByInput,
			signalAliases
		)
);

/** Active scope with pin-mux-style fallback when it has no matches. */
export const selectEffectiveSruConnectionsSearchScope =
	createSelector(
		[selectConnectionsSearchScope, selectSruSearchMatches],
		(activeScope, results): SruSearchScope =>
			resolveEffectiveSruSearchScope(activeScope, results)
	);

/** Status-filtered navigation sections for the Connections side panel. */
export function useSruBaseNavigationSections() {
	return useAppSelector(selectSruBaseNavigationSections);
}

export function useSruSearchResults() {
	return useAppSelector(selectSruSearchMatches);
}

/** Active scope with pin-mux-style fallback when it has no matches. */
export function useEffectiveSruConnectionsSearchScope(): SruSearchScope {
	return useAppSelector(selectEffectiveSruConnectionsSearchScope);
}

const selectDisableFilter = (
	statusFilter: SruFilterState['statusFilter']
) =>
	createSelector(
		[
			selectModifiedConnectionEntries,
			selectConnectionsSearchText,
			selectConnectionByInput,
			selectSignalAliases
		],
		(
			modifiedConnections,
			searchText,
			connectionsByInput,
			signalAliases
		) => {
			const peripherals = filterSruPeripheralsByStatus(
				{statusFilter},
				modifiedConnections
			);

			if (!peripherals.length) return true;

			return (
				searchText.length >= MIN_SRU_SEARCH_LENGTH &&
				getAvailableSruSearchScopes(
					computeSruSearchMatches(
						groupSruSignals(peripherals),
						searchText,
						connectionsByInput,
						signalAliases
					)
				).length === 0
			);
		}
	);

const selectDisableAllFilter = selectDisableFilter('all');
const selectDisableModifiedFilter = selectDisableFilter('modified');
const selectDisableDefaultFilter = selectDisableFilter('default');

export const useDisableAllFilter = () =>
	useAppSelector(selectDisableAllFilter);
export const useDisableModifiedFilter = () =>
	useAppSelector(selectDisableModifiedFilter);
export const useDisableDefaultFilter = () =>
	useAppSelector(selectDisableDefaultFilter);
