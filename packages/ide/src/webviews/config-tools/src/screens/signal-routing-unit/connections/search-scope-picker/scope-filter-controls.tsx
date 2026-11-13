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
import FilterControls, {
	type FilterOption
} from '../../../../components/filter-controls/filter-controls';
import styles from './search-scope-picker.module.scss';
import {
	useEffectiveSruConnectionsSearchScope,
	useSruSearchResults
} from '../../../../hooks/use-sru-search-results';
import {useAppDispatch} from '../../../../state/store';
import {setSruConnectionsSearchScope} from '../../../../state/slices/sru/sru.reducer';
import {
	SRU_SEARCH_SCOPES,
	type SruSearchScope
} from '../constants/search-scope';
import {
	getAvailableSruSearchScopes,
	isSruSearchScopeAvailable
} from '../../../../utils/sru-search';
import {
	type TLocaleContext,
	useLocaleContext
} from '@common/contexts/LocaleContext';
import {useRegisterScopeControls} from '../../../../components/search-results-panel/search-panel-keyboard';

export default function ScopeFilterControls() {
	const results = useSruSearchResults();
	const dispatch = useAppDispatch();
	const effectiveScope = useEffectiveSruConnectionsSearchScope();
	const l10n: TLocaleContext | undefined =
		useLocaleContext()?.signalRoutingUnit?.connections;

	const availableScopes = getAvailableSruSearchScopes(results);
	const hasAnyResults = availableScopes.length > 0;
	const selectedScope: SruSearchScope | '' = hasAnyResults
		? effectiveScope
		: '';

	const filterOptions: Record<SruSearchScope, FilterOption> = {
		pinBuffers: {
			isDisabled: !isSruSearchScopeAvailable(
				SRU_SEARCH_SCOPES.PIN_BUFFERS,
				results
			),
			isSelected: selectedScope === SRU_SEARCH_SCOPES.PIN_BUFFERS
		},
		peripherals: {
			isDisabled: !isSruSearchScopeAvailable(
				SRU_SEARCH_SCOPES.PERIPHERALS,
				results
			),
			isSelected: selectedScope === SRU_SEARCH_SCOPES.PERIPHERALS
		},
		signals: {
			isDisabled: !isSruSearchScopeAvailable(
				SRU_SEARCH_SCOPES.SIGNALS,
				results
			),
			isSelected: selectedScope === SRU_SEARCH_SCOPES.SIGNALS
		},
		descriptions: {
			isDisabled: !isSruSearchScopeAvailable(
				SRU_SEARCH_SCOPES.DESCRIPTIONS,
				results
			),
			isSelected: selectedScope === SRU_SEARCH_SCOPES.DESCRIPTIONS
		}
	};

	const labels: Record<SruSearchScope, string> = {
		pinBuffers:
			l10n?.peripheralList?.sections?.pinBuffers ?? 'Pin Buffers',
		peripherals:
			l10n?.peripheralList?.sections?.peripherals ?? 'Peripherals',
		signals: l10n?.peripheralList?.sections?.signals ?? 'Signals',
		descriptions:
			l10n?.peripheralList?.sections?.descriptions ?? 'Descriptions'
	};

	const handleScopeSelect = (scope: string) => {
		if (!hasAnyResults) return;

		dispatch(setSruConnectionsSearchScope(scope as SruSearchScope));
	};

	useRegisterScopeControls({
		availableScopes,
		effectiveScope: selectedScope,
		onScopeChange: handleScopeSelect
	});

	return (
		<div className={styles.filterControlsContainer}>
			<FilterControls
				id='sru-search-filter-controls'
				options={filterOptions}
				labels={labels}
				onSelect={handleScopeSelect}
			/>
		</div>
	);
}
