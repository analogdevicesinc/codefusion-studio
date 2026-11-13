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
import type {usePinmuxSearchResults} from '../../../hooks/use-pinmux-search-results';
import type {PinconfigSearchScope} from '../../../state/slices/app-context/appContext.reducer';
import {
	PINCONFIG_SEARCH_SCOPE_PRIORITY,
	PINCONFIG_SEARCH_SCOPES
} from '../constants/search-scope';

type PinmuxSearchResults = ReturnType<typeof usePinmuxSearchResults>;

/**
 * Whether a search scope has any matches for the current query. Shared by
 * the effective-scope fallback below and by the scope chip row / keyboard
 * navigation, so mouse and keyboard agree on which scopes are reachable.
 */
export function isPinconfigSearchScopeAvailable(
	scope: PinconfigSearchScope,
	results: PinmuxSearchResults
): boolean {
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
}

/** Scopes with at least one match, in their fixed priority/chip order. */
export function getAvailablePinconfigSearchScopes(
	results: PinmuxSearchResults
): PinconfigSearchScope[] {
	return PINCONFIG_SEARCH_SCOPE_PRIORITY.filter(scope =>
		isPinconfigSearchScopeAvailable(scope, results)
	);
}

/**
 * Picks the first scope with matches when the active scope has none.
 */
export function resolveEffectivePinconfigSearchScope(
	activeScope: PinconfigSearchScope,
	results: PinmuxSearchResults
): PinconfigSearchScope {
	return isPinconfigSearchScopeAvailable(activeScope, results)
		? activeScope
		: (getAvailablePinconfigSearchScopes(results)[0] ??
				PINCONFIG_SEARCH_SCOPES.PINS);
}
