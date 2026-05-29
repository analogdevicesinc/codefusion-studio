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
import styles from './search-scope-picker.module.scss';
import ScopeFilterControls from './scope-filter-controls';
import SearchResult from './search-result';
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
	PINCONFIG_SEARCH_SCOPE_PRIORITY,
	PINCONFIG_SEARCH_SCOPES
} from '../constants/search-scope';

export default function SearchScopePicker() {
	const l10n: TLocaleContext | undefined = useLocaleContext();
	const dispatch = useDispatch();

	const searchString = useSearchString('pinconfig');
	const activeScope = useActivePinconfigSearchScope();
	const results = usePinmuxSearchResults();

	const isScopeAvailable = (scope: PinconfigSearchScope) => {
		switch (scope) {
			case PINCONFIG_SEARCH_SCOPES.PINS:
				return results.pinResults.length > 0;
			case PINCONFIG_SEARCH_SCOPES.PERIPHERALS:
				return results.peripheralResults.length > 0;
			case PINCONFIG_SEARCH_SCOPES.SIGNALS:
				return results.signalResults.length > 0;
			default:
				return false;
		}
	};

	const effectiveScope: PinconfigSearchScope = isScopeAvailable(
		activeScope
	)
		? activeScope
		: (PINCONFIG_SEARCH_SCOPE_PRIORITY.find(isScopeAvailable) ??
			PINCONFIG_SEARCH_SCOPES.PINS);

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

	const showMinLengthMessage =
		searchString.length < MIN_PINCONFIG_SEARCH_LENGTH;
	const showNoResults =
		!showMinLengthMessage && formattedResults.length === 0;

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
		<div className={styles.container}>
			<ScopeFilterControls />
			<div className={styles.horizontalDivider} />

			{/* Show minimum length message */}
			{showMinLengthMessage && (
				<div
					data-test='min-characters'
					className={styles.noResultsLabel}
				>
					{(
						l10n?.l10n?.pinmux?.search?.minLength ??
						`A minimum of ${MIN_PINCONFIG_SEARCH_LENGTH} characters is required to start searching`
					).replace(
						'{minLength}',
						String(MIN_PINCONFIG_SEARCH_LENGTH)
					)}
				</div>
			)}

			{/* Show no results message */}
			{!showMinLengthMessage && showNoResults && (
				<div data-test='no-results' className={styles.noResultsLabel}>
					{l10n?.l10n?.pinmux?.search?.noResults ??
						'No results found.'}
				</div>
			)}

			{/* Show results */}
			{!showMinLengthMessage && !showNoResults && (
				<div
					key={`search-result-${effectiveScope}-list`}
					className={styles.resultsContainer}
				>
					{formattedResults.map(result => (
						<div
							key={`search-result-${effectiveScope}-${result.key}`}
							className={styles.resultItem}
						>
							<SearchResult
								result={result}
								matchedTerm={searchString}
								onClick={handleResultClick}
							/>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
