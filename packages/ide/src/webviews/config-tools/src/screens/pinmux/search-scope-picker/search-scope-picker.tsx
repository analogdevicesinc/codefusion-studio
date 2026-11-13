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
} from '../../../components/search-results-panel/search-results-panel';
import {
	useSearchString,
	useActivePinconfigSearchScope
} from '../../../state/slices/app-context/appContext.selector';
import {
	type TLocaleContext,
	useLocaleContext
} from '../../../../../common/contexts/LocaleContext';
import {usePinmuxSearchResults} from '../../../hooks/use-pinmux-search-results';
import {
	setActivePinconfigAssignmentFilter,
	setActivePinconfigSearchScope,
	setActiveSearchString,
	type PinconfigSearchScope
} from '../../../state/slices/app-context/appContext.reducer';
import {
	setActivePeripheral,
	setActiveSignal
} from '../../../state/slices/peripherals/peripherals.reducer';
import {useDispatch} from 'react-redux';
import {
	formatPeripheralResults,
	formatPinResults,
	formatSignalResults
} from '../utils/search-results';
import {
	focusPinSet,
	setPinDetailsTargetPin
} from '../../../state/slices/pins/pins.reducer';
import {useCallback, useMemo} from 'react';
import {
	MIN_PINCONFIG_SEARCH_LENGTH,
	PINCONFIG_SEARCH_SCOPES
} from '../constants/search-scope';
import {resolveEffectivePinconfigSearchScope} from '../utils/search-scope';

export default function SearchScopePicker() {
	const l10n: TLocaleContext | undefined = useLocaleContext();
	const dispatch = useDispatch();

	const searchString = useSearchString('pinconfig');
	const activeScope = useActivePinconfigSearchScope();
	const results = usePinmuxSearchResults();

	const effectiveScope: PinconfigSearchScope =
		resolveEffectivePinconfigSearchScope(activeScope, results);

	const formattedResults = useMemo(() => {
		switch (effectiveScope) {
			case PINCONFIG_SEARCH_SCOPES.PINS:
				return formatPinResults(results.pinResults);
			case PINCONFIG_SEARCH_SCOPES.PERIPHERALS:
				return formatPeripheralResults(results.peripheralResults);
			case PINCONFIG_SEARCH_SCOPES.SIGNALS:
				return formatSignalResults(results.signalResults);
			default:
				return [];
		}
	}, [effectiveScope, results]);

	const emptyState = useMemo<
		SearchResultsEmptyState | undefined
	>(() => {
		if (searchString.length < MIN_PINCONFIG_SEARCH_LENGTH) {
			return {
				kind: 'minLength',
				message: l10n?.pinmux?.search?.minLength?.replace(
					'{minLength}',
					String(MIN_PINCONFIG_SEARCH_LENGTH)
				)
			};
		}

		if (formattedResults.length === 0) {
			return {
				kind: 'noResults',
				message: l10n?.pinmux?.search?.noResults
			};
		}

		return undefined;
	}, [searchString, formattedResults, l10n]);

	const handleResultClick = useCallback(
		(sourceIndex: number) => {
			if (effectiveScope !== activeScope) {
				dispatch(setActivePinconfigSearchScope(effectiveScope));
			}

			// Unselect any selected assigned filter
			dispatch(setActivePinconfigAssignmentFilter(undefined));

			// Cleanup previous state
			dispatch(focusPinSet([]));
			dispatch(setActivePeripheral(undefined));
			dispatch(setActiveSignal(undefined));

			switch (effectiveScope) {
				case PINCONFIG_SEARCH_SCOPES.PERIPHERALS:
					dispatch(
						setActivePeripheral(
							results.peripheralResults[sourceIndex].peripheral
						)
					);
					break;

				case PINCONFIG_SEARCH_SCOPES.SIGNALS:
					dispatch(
						setActivePeripheral(
							results.signalResults[sourceIndex].signal.peripheral
						)
					);
					dispatch(
						setActiveSignal({
							peripheral:
								results.signalResults[sourceIndex].signal.peripheral,
							signal: results.signalResults[sourceIndex].signal.name,
							keepActivePeripheral: true
						})
					);
					break;

				default:
					dispatch(
						setPinDetailsTargetPin(
							results.pinResults[sourceIndex].pin.name
						)
					);
			}

			dispatch(
				setActiveSearchString({
					searchContext: 'pinconfig',
					value: ''
				})
			);
		},
		[dispatch, effectiveScope, activeScope, results]
	);

	return (
		<SearchResultsPanel
			scopeControls={<ScopeFilterControls />}
			sections={[{items: formattedResults}]}
			matchedTerm={searchString}
			resultLayout='inline'
			emptyState={emptyState}
			resetKey={effectiveScope}
			onResultSelect={handleResultClick}
		/>
	);
}
