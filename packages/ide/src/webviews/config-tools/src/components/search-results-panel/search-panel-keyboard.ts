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
import {createContext, useContext, useEffect, useRef} from 'react';
import type {FocusEvent, KeyboardEvent} from 'react';

/**
 * What the results list needs from the keyboard handler: how many rows are
 * on screen, how to turn a visual row index into the domain `sourceIndex`
 * `onResultSelect` expects, and the select callback itself. Registered by
 * `SearchResultsPanel`.
 */
export type ListRegistration = {
	itemCount: number;
	getSourceIndex: (visualIndex: number) => number;
	onSelect: (sourceIndex: number) => void;
};

/**
 * What the scope chip row needs from the keyboard handler: the chips that
 * can actually be landed on, which one is active, and how to change it.
 * Registered by each screen's `ScopeFilterControls`.
 */
export type ScopeRegistration = {
	availableScopes: readonly string[];
	effectiveScope: string;
	onScopeChange: (scope: string) => void;
};

export type NavMode = 'input' | 'results';

export type ContextValue = {
	isOpen: boolean;
	navMode: NavMode;
	activeIndex: number;
	dismiss: () => void;
	handleKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
	handleBlur: (event: FocusEvent) => void;
	onHoverIndex: (visualIndex: number) => void;
	resetHighlight: () => void;
	setListRegistration: (
		registration: ListRegistration | undefined
	) => void;
	setScopeRegistration: (
		registration: ScopeRegistration | undefined
	) => void;
};

const noop = () => {
	/* No-op default so the panel can still mount without a provider */
};

export const DEFAULT_CONTEXT_VALUE: ContextValue = {
	isOpen: false,
	navMode: 'input',
	activeIndex: -1,
	dismiss: noop,
	handleKeyDown: noop,
	handleBlur: noop,
	onHoverIndex: noop,
	resetHighlight: noop,
	setListRegistration: noop,
	setScopeRegistration: noop
};

export const SearchPanelKeyboardContext = createContext<ContextValue>(
	DEFAULT_CONTEXT_VALUE
);

function useSearchPanelKeyboardContext() {
	return useContext(SearchPanelKeyboardContext);
}

/** For the screen: whether the panel should render, plus the handlers to
 * wire onto the search input and its wrapping element. */
export function useSearchPanelKeyboard() {
	const {isOpen, handleKeyDown, handleBlur, dismiss} =
		useSearchPanelKeyboardContext();

	return {isOpen, handleKeyDown, handleBlur, dismiss};
}

/**
 * For `SearchResultsPanel`: registers the flattened result list so Up/Down/
 * Home/End/Enter know how many rows there are and how to select one.
 * Call unconditionally on every render - the registration is cheap and this
 * avoids stale closures over `onResultSelect`/the current sections.
 */
export function useRegisterResultList(
	registration: ListRegistration
) {
	const {setListRegistration} = useSearchPanelKeyboardContext();

	useEffect(() => {
		setListRegistration(registration);

		return () => {
			setListRegistration(undefined);
		};
	});
}

/**
 * For each screen's `ScopeFilterControls`: registers the available scopes so
 * Left/Right can cycle them, and resets the row highlight whenever the
 * effective scope changes - whether that change came from a chip click or
 * from Left/Right itself.
 */
export function useRegisterScopeControls(
	registration: ScopeRegistration
) {
	const {setScopeRegistration, resetHighlight} =
		useSearchPanelKeyboardContext();

	useEffect(() => {
		setScopeRegistration(registration);

		return () => {
			setScopeRegistration(undefined);
		};
	});

	const previousScope = useRef(registration.effectiveScope);
	useEffect(() => {
		if (previousScope.current !== registration.effectiveScope) {
			previousScope.current = registration.effectiveScope;
			resetHighlight();
		}
	}, [registration.effectiveScope, resetHighlight]);
}

/** For `SearchResult` rows: the currently highlighted visual index (`-1` for
 * none) and the hover handler that claims the highlight for the mouse. */
export function useSearchPanelHighlight() {
	const {navMode, activeIndex, onHoverIndex} =
		useSearchPanelKeyboardContext();

	return {
		activeIndex: navMode === 'results' ? activeIndex : -1,
		onHoverIndex
	};
}
