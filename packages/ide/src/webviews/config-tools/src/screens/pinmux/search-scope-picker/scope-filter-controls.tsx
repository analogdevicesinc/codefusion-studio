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
import {
	PINCONFIG_SEARCH_SCOPE_PRIORITY,
	PINCONFIG_SEARCH_SCOPES
} from '../constants/search-scope';

export default function ScopeFilterControls() {
	const results = usePinmuxSearchResults();
	const dispatch = useDispatch();
	const activeScope = useActivePinconfigSearchScope();

	const isAvailable = (scope: PinconfigSearchScope) =>
		(scope === PINCONFIG_SEARCH_SCOPES.PINS &&
			results.pinResults.length > 0) ||
		(scope === PINCONFIG_SEARCH_SCOPES.PERIPHERALS &&
			results.peripheralResults.length > 0) ||
		(scope === PINCONFIG_SEARCH_SCOPES.SIGNALS &&
			results.signalResults.length > 0);

	const hasAnyResults =
		isAvailable(PINCONFIG_SEARCH_SCOPES.PINS) ||
		isAvailable(PINCONFIG_SEARCH_SCOPES.PERIPHERALS) ||
		isAvailable(PINCONFIG_SEARCH_SCOPES.SIGNALS);

	const selectedScope: PinconfigSearchScope | '' = hasAnyResults
		? isAvailable(activeScope)
			? activeScope
			: (PINCONFIG_SEARCH_SCOPE_PRIORITY.find(isAvailable) ?? '')
		: '';

	const filterOptions: Record<PinconfigSearchScope, FilterOption> = {
		pins: {
			isDisabled: !isAvailable(PINCONFIG_SEARCH_SCOPES.PINS),
			isSelected: selectedScope === PINCONFIG_SEARCH_SCOPES.PINS
		},
		peripherals: {
			isDisabled: !isAvailable(PINCONFIG_SEARCH_SCOPES.PERIPHERALS),
			isSelected:
				selectedScope === PINCONFIG_SEARCH_SCOPES.PERIPHERALS
		},
		signals: {
			isDisabled: !isAvailable(PINCONFIG_SEARCH_SCOPES.SIGNALS),
			isSelected: selectedScope === PINCONFIG_SEARCH_SCOPES.SIGNALS
		}
	};

	return (
		<div className={styles.filterControlsContainer}>
			<FilterControls
				id='pinmux-search:filterControlsContainer'
				data-test='pinmux-search-filter-controls'
				options={filterOptions}
				onSelect={scope => {
					if (!hasAnyResults) return;

					dispatch(
						setActivePinconfigSearchScope(
							scope as PinconfigSearchScope
						)
					);
				}}
			/>
		</div>
	);
}
