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

import {useEffect, useMemo} from 'react';
import {useAppDispatch} from '../state/store';
import {setActiveSettingsChild} from '../state/slices/app-context/appContext.reducer';

let lastNavTimestamp = 0;

const SUPPRESSION_DURATION_MS = 800;

export function markProgrammaticScroll() {
	lastNavTimestamp = Date.now();
}

export function isProgrammaticScrollActive(): boolean {
	return Date.now() - lastNavTimestamp < SUPPRESSION_DURATION_MS;
}

/**
 * Locates the scrollable ancestor (typically the layout's main panel,
 * whose overflow is set via --cfs-layout-mainpanel-overflow).
 * We query getComputedStyle here not to discover the style but to
 * find the DOM element, since we don't have a direct ref to it.
 * Falls back to the element itself if no scrollable ancestor is found.
 */
function findScrollableAncestor(element: HTMLElement): HTMLElement {
	// DOM returns null for parentElement, so we need to allow null in the type here.
	// eslint-disable-next-line @typescript-eslint/ban-types
	let candidate: HTMLElement | null = element;

	while (candidate) {
		const {overflowY} = getComputedStyle(candidate);

		if (
			(overflowY === 'auto' || overflowY === 'scroll') &&
			candidate.scrollHeight > candidate.clientHeight
		) {
			return candidate;
		}

		candidate = candidate.parentElement;
	}

	return element;
}

/**
 * Observes settings sections within a scroll container and dispatches
 * the key of the topmost visible section to the Redux store.
 * This is similar to VS Code-style settings sidebar navigation.
 *
 * Dynamically finds the actual scrollable ancestor to handle cases
 * where the passed ref is not the element that actually scrolls
 * (e.g., due to nested overflow contexts).
 *
 * @param sectionIds - Ordered array of section element IDs to observe.
 *                     Should be a stable reference (e.g., a constant or memoized value)
 *                     to avoid unnecessary observer recreation.
 * @param scrollContainerRef - Ref to an element that contains the sections.
 *                             The actual scrollable ancestor is found dynamically.
 */
export default function useSettingsSectionObserver(
	sectionIds: string[],
	scrollContainerRef: React.RefObject<HTMLElement>
) {
	const dispatch = useAppDispatch();

	// Create a stable key from sectionIds to detect actual content changes
	// This makes the hook resilient to unstable array references
	const sectionIdsKey = useMemo(
		() => sectionIds.join(','),
		[sectionIds]
	);

	useEffect(() => {
		const container = scrollContainerRef.current;

		// Derive the array from the stable key to avoid direct dependency on sectionIds
		const sections = sectionIdsKey ? sectionIdsKey.split(',') : [];

		if (!container || sections.length === 0) return;

		// Set the first section as active by default
		dispatch(setActiveSettingsChild(sections[0]));

		// Cache section element references to avoid getElementById on every scroll tick
		const sectionElements: Array<{id: string; el: HTMLElement}> = [];

		for (const id of sections) {
			const el = document.getElementById(id);

			if (el) {
				sectionElements.push({id, el});
			}
		}

		let rafId: number | undefined;

		/**
		 * Determines which section is currently at the top of the
		 * scroll container's visible area and dispatches it as active.
		 *
		 * @param scrollTarget - The element that fired the scroll event.
		 */
		const syncActiveSection = (scrollTarget: HTMLElement) => {
			if (isProgrammaticScrollActive()) return;

			// When the container has not been scrolled, always highlight
			// the first section (e.g. when all sections fit within the visible area).
			if (scrollTarget.scrollTop < 1) {
				dispatch(setActiveSettingsChild(sections[0]));

				return;
			}

			const scrollRect = scrollTarget.getBoundingClientRect();

			// Find the section whose top edge is closest to (at or above)
			// the top of the scroll container's visible area.
			// Walk sections in order and pick the last one whose top
			// is at or above the midpoint of the scroll viewport.
			const midpoint = scrollRect.top + scrollRect.height * 0.5;
			let activeSection = sections[0];

			for (const {id, el} of sectionElements) {
				const rect = el.getBoundingClientRect();

				// A section is considered "active" if its top edge
				// has scrolled at or above the midpoint of the viewport.
				if (rect.top <= midpoint) {
					activeSection = id;
				}
			}

			dispatch(setActiveSettingsChild(activeSection));
		};

		/**
		 * Throttled scroll handler using document-level event capturing.
		 * Scroll events don't bubble, but they do propagate in the
		 * capture phase, allowing us to detect scrolls on any ancestor
		 * regardless of which element is actually scrollable at any
		 * given time.
		 */
		const onScroll = (event: Event) => {
			// Event.target can be the document itself (not an HTMLElement),
			// so we must verify it's an element before proceeding.
			const target =
				event.target instanceof HTMLElement
					? event.target
					: undefined;

			// Only react to scroll events from ancestors that contain
			// our sections (i.e., the actual scroll container).
			if (!target || !target.contains(container)) return;

			if (rafId !== undefined) return;

			rafId = requestAnimationFrame(() => {
				rafId = undefined;
				syncActiveSection(target);
			});
		};

		// Sync once on mount using the best available scroll container
		const initialScrollContainer = findScrollableAncestor(container);
		syncActiveSection(initialScrollContainer);

		// Listen at the document level in the capture phase to catch
		// scroll events from any ancestor, even if the scrollable
		// element changes after mount.
		document.addEventListener('scroll', onScroll, {
			capture: true,
			passive: true
		});

		return () => {
			document.removeEventListener('scroll', onScroll, {
				capture: true
			});

			if (rafId !== undefined) {
				cancelAnimationFrame(rafId);
			}
		};
	}, [sectionIdsKey, scrollContainerRef, dispatch]);
}
