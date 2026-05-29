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

import {useCallback, useEffect, useRef, useState} from 'react';

type ScrollState = {
	canScrollLeft: boolean;
	canScrollRight: boolean;
};

/**
 * Hook that tracks horizontal scroll state of a container element.
 * Attaches scroll and resize listeners and returns whether the
 * element can scroll in each direction along with a ref to attach
 * to the target element.
 */
export default function useMemoryScrollState() {
	const scrollRef = useRef<HTMLDivElement>(null);
	const [scrollState, setScrollState] = useState<ScrollState>({
		canScrollLeft: false,
		canScrollRight: false
	});

	const updateScrollState = useCallback(() => {
		const el = scrollRef.current;
		if (!el) return;

		const canScrollLeft = el.scrollLeft > 0;
		// Use a threshold of 1 pixel to account for potential rounding issues
		const canScrollRight =
			el.scrollWidth - el.clientWidth - el.scrollLeft > 1;
		setScrollState(prev => {
			if (
				prev.canScrollLeft === canScrollLeft &&
				prev.canScrollRight === canScrollRight
			) {
				return prev;
			}

			return {canScrollLeft, canScrollRight};
		});
	}, []);

	useEffect(() => {
		const el = scrollRef.current;
		if (!el) return;

		updateScrollState();

		el.addEventListener('scroll', updateScrollState, {passive: true});
		const observer = new ResizeObserver(updateScrollState);
		observer.observe(el);

		return () => {
			el.removeEventListener('scroll', updateScrollState);
			observer.disconnect();
		};
	}, [updateScrollState]);

	return {scrollRef, ...scrollState};
}
