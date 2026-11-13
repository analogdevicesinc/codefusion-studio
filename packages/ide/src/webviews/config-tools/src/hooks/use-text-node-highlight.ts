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

import {type RefObject, useLayoutEffect} from 'react';
import {
	createHighlightFromTextNodes,
	isHighlightsAPISupported
} from '../../../common/utils/highlightApi';

type TextNodeHighlightOptions = {
	readonly containerRef: RefObject<HTMLElement>;
	readonly highlightGroup: string;
	readonly searchQuery: string;
	readonly searchPattern: RegExp;
	readonly contentDeps: readonly unknown[];
};

/**
 * Highlights the text nodes inside `containerRef` that match `searchPattern`
 * using the CSS Custom Highlight API, keeping the highlight in sync with the
 * query and the provided content dependencies and clearing it on unmount.
 *
 * @param options - The highlight configuration.
 */
export function useTextNodeHighlight({
	containerRef,
	highlightGroup,
	searchQuery,
	searchPattern,
	contentDeps
}: TextNodeHighlightOptions): void {
	/* eslint-disable react-hooks/exhaustive-deps */
	useLayoutEffect(() => {
		if (!isHighlightsAPISupported()) {
			return;
		}

		CSS.highlights.delete(highlightGroup);

		if (containerRef.current && searchQuery.trim()) {
			const highlight = createHighlightFromTextNodes(
				containerRef.current,
				searchPattern
			);
			CSS.highlights.set(highlightGroup, highlight);
		}

		return () => {
			CSS.highlights.delete(highlightGroup);
		};
	}, [
		containerRef,
		highlightGroup,
		searchQuery,
		searchPattern,
		...contentDeps
	]);
}
