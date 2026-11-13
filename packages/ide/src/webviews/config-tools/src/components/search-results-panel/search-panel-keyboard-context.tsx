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
import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	type FocusEvent,
	type KeyboardEvent,
	type ReactNode
} from 'react';
import {
	SearchPanelKeyboardContext,
	type ContextValue,
	type ListRegistration,
	type NavMode,
	type ScopeRegistration
} from './search-panel-keyboard';

/**
 * Drives keyboard navigation for a search input + floating results panel
 * pair: caret movement in the field, arrow-key browsing of the scope chips
 * and result rows, and dismiss-but-keep-text on Escape/Tab/blur.
 *
 * Focus never leaves the search input - this is virtual focus, in the same
 * spirit as `grid-combobox`. A `navMode` flag decides what Left/Right/Up/Down
 * mean: caret and native behaviour while `'input'`, scope/row browsing while
 * `'results'`.
 *
 * Concretely: Down moves from the field into the list and then down it, Up
 * walks back up and out to the field, and Left/Right cycle the scope chips
 * only once a row is highlighted. Deferring the chips to `'results'` is what
 * keeps Left/Right moving the caret while the user is still typing.
 *
 * The panel is considered open whenever `searchText` is non-empty and hasn't
 * been dismissed. Dismissal is local state, not derived from `searchText`,
 * which is what lets Escape close the panel while keeping the typed text -
 * `dismissed` resets on the next keystroke, so typing again reopens it.
 */
export function SearchPanelKeyboardProvider({
	searchText,
	children
}: {
	readonly searchText: string;
	readonly children: ReactNode;
}) {
	const [dismissed, setDismissed] = useState(false);
	const [navMode, setNavMode] = useState<NavMode>('input');
	const [activeIndex, setActiveIndex] = useState(-1);

	const listRegistrationRef = useRef<ListRegistration | undefined>(
		undefined
	);
	const scopeRegistrationRef = useRef<ScopeRegistration | undefined>(
		undefined
	);

	const previousSearchText = useRef(searchText);
	useEffect(() => {
		if (previousSearchText.current !== searchText) {
			previousSearchText.current = searchText;
			setDismissed(false);
			setNavMode('input');
			setActiveIndex(-1);
		}
	}, [searchText]);

	const isOpen = searchText.length > 0 && !dismissed;

	const dismiss = useCallback(() => {
		setDismissed(true);
	}, []);

	const resetHighlight = useCallback(() => {
		setActiveIndex(0);
	}, []);

	const setListRegistration = useCallback(
		(registration: ListRegistration | undefined) => {
			listRegistrationRef.current = registration;
		},
		[]
	);

	const setScopeRegistration = useCallback(
		(registration: ScopeRegistration | undefined) => {
			scopeRegistrationRef.current = registration;
		},
		[]
	);

	const onHoverIndex = useCallback((visualIndex: number) => {
		setNavMode('results');
		setActiveIndex(visualIndex);
	}, []);

	const handleScopeArrowKey = useCallback(
		(event: KeyboardEvent<HTMLInputElement>) => {
			const scopeReg = scopeRegistrationRef.current;

			if (
				navMode !== 'results' ||
				!scopeReg ||
				scopeReg.availableScopes.length === 0
			) {
				return;
			}

			event.preventDefault();
			const {availableScopes, effectiveScope} = scopeReg;
			const currentIndex = Math.max(
				availableScopes.indexOf(effectiveScope),
				0
			);
			const delta = event.key === 'ArrowRight' ? 1 : -1;
			const nextIndex =
				(currentIndex + delta + availableScopes.length) %
				availableScopes.length;

			scopeReg.onScopeChange(availableScopes[nextIndex]);
		},
		[navMode]
	);

	const handleArrowDownKey = useCallback(
		(event: KeyboardEvent<HTMLInputElement>) => {
			const listReg = listRegistrationRef.current;

			if (!isOpen || !listReg || listReg.itemCount === 0) {
				return;
			}

			event.preventDefault();

			if (navMode === 'input') {
				setNavMode('results');
				setActiveIndex(0);
			} else {
				setActiveIndex(
					Math.min(activeIndex + 1, listReg.itemCount - 1)
				);
			}
		},
		[isOpen, navMode, activeIndex]
	);

	const handleArrowUpKey = useCallback(
		(event: KeyboardEvent<HTMLInputElement>) => {
			if (navMode !== 'results') {
				return;
			}

			event.preventDefault();

			if (activeIndex <= 0) {
				setNavMode('input');
				setActiveIndex(-1);
			} else {
				setActiveIndex(activeIndex - 1);
			}
		},
		[navMode, activeIndex]
	);

	const handleEnterKey = useCallback(
		(event: KeyboardEvent<HTMLInputElement>) => {
			const listReg = listRegistrationRef.current;

			// Only a row the user can actually see highlighted may be
			// selected - submitting the typed query must never reach into
			// the list and mutate the configuration on its own.
			if (
				!isOpen ||
				!listReg ||
				navMode !== 'results' ||
				activeIndex < 0 ||
				activeIndex >= listReg.itemCount
			) {
				return;
			}

			event.preventDefault();
			listReg.onSelect(listReg.getSourceIndex(activeIndex));
		},
		[isOpen, navMode, activeIndex]
	);

	const handleEscapeKey = useCallback(
		(event: KeyboardEvent<HTMLInputElement>) => {
			if (!isOpen) {
				return;
			}

			event.preventDefault();
			dismiss();
		},
		[isOpen, dismiss]
	);

	const handleTabKey = useCallback(() => {
		if (isOpen) {
			dismiss();
		}
	}, [isOpen, dismiss]);

	const handleKeyDown = useCallback(
		(event: KeyboardEvent<HTMLInputElement>) => {
			switch (event.key) {
				case 'ArrowLeft':
				case 'ArrowRight':
					handleScopeArrowKey(event);
					break;

				case 'ArrowDown':
					handleArrowDownKey(event);
					break;

				case 'ArrowUp':
					handleArrowUpKey(event);
					break;

				case 'Enter':
					handleEnterKey(event);
					break;

				case 'Escape':
					handleEscapeKey(event);
					break;

				case 'Tab':
					handleTabKey();
					break;

				default:
					break;
			}
		},
		[
			handleScopeArrowKey,
			handleArrowDownKey,
			handleArrowUpKey,
			handleEnterKey,
			handleEscapeKey,
			handleTabKey
		]
	);

	const handleBlur = useCallback(
		(event: FocusEvent) => {
			if (
				!event.currentTarget.contains(
					// eslint-disable-next-line @typescript-eslint/ban-types -- Element.contains() requires Node | null, not undefined
					event.relatedTarget as Node | null
				)
			) {
				dismiss();
			}
		},
		[dismiss]
	);

	const value = useMemo<ContextValue>(
		() => ({
			isOpen,
			navMode,
			activeIndex,
			dismiss,
			handleKeyDown,
			handleBlur,
			onHoverIndex,
			resetHighlight,
			setListRegistration,
			setScopeRegistration
		}),
		[
			isOpen,
			navMode,
			activeIndex,
			dismiss,
			handleKeyDown,
			handleBlur,
			onHoverIndex,
			resetHighlight,
			setListRegistration,
			setScopeRegistration
		]
	);

	return (
		<SearchPanelKeyboardContext.Provider value={value}>
			{children}
		</SearchPanelKeyboardContext.Provider>
	);
}
