/**
 *
 * Copyright (c) 2025-2026 Analog Devices, Inc.
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
import FilterControls, {
	type FilterOption
} from '../../../components/filter-controls/filter-controls';
import styles from './search-scope-picker.module.scss';
import {usePinmuxSearchResults} from '../../../hooks/use-pinmux-search-results';
import {useActivePinconfigSearchScope} from '../../../state/slices/app-context/appContext.selector';
import {useDispatch} from 'react-redux';
import {
	type PinconfigSearchScope,
	setActivePinconfigSearchScope
} from '../../../state/slices/app-context/appContext.reducer';
import {PINCONFIG_SEARCH_SCOPES} from '../constants/search-scope';
import {
	getAvailablePinconfigSearchScopes,
	isPinconfigSearchScopeAvailable,
	resolveEffectivePinconfigSearchScope
} from '../utils/search-scope';
import {useRegisterScopeControls} from '../../../components/search-results-panel/search-panel-keyboard';

export default function ScopeFilterControls() {
	const results = usePinmuxSearchResults();
	const dispatch = useDispatch();
	const activeScope = useActivePinconfigSearchScope();

	const availableScopes = getAvailablePinconfigSearchScopes(results);
	const hasAnyResults = availableScopes.length > 0;

	const selectedScope: PinconfigSearchScope | '' = hasAnyResults
		? resolveEffectivePinconfigSearchScope(activeScope, results)
		: '';

	const filterOptions: Record<PinconfigSearchScope, FilterOption> = {
		pins: {
			isDisabled: !isPinconfigSearchScopeAvailable(
				PINCONFIG_SEARCH_SCOPES.PINS,
				results
			),
			isSelected: selectedScope === PINCONFIG_SEARCH_SCOPES.PINS
		},
		peripherals: {
			isDisabled: !isPinconfigSearchScopeAvailable(
				PINCONFIG_SEARCH_SCOPES.PERIPHERALS,
				results
			),
			isSelected:
				selectedScope === PINCONFIG_SEARCH_SCOPES.PERIPHERALS
		},
		signals: {
			isDisabled: !isPinconfigSearchScopeAvailable(
				PINCONFIG_SEARCH_SCOPES.SIGNALS,
				results
			),
			isSelected: selectedScope === PINCONFIG_SEARCH_SCOPES.SIGNALS
		}
	};

	const handleScopeSelect = (scope: string) => {
		if (!hasAnyResults) return;

		dispatch(
			setActivePinconfigSearchScope(scope as PinconfigSearchScope)
		);
	};

	useRegisterScopeControls({
		availableScopes,
		effectiveScope: selectedScope,
		onScopeChange: handleScopeSelect
	});

	return (
		<div className={styles.filterControlsContainer}>
			<FilterControls
				id='pinmux-search:filterControlsContainer'
				data-test='pinmux-search-filter-controls'
				options={filterOptions}
				onSelect={handleScopeSelect}
			/>
		</div>
	);
}
