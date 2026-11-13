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

export function isHighlightsAPISupported(): boolean {
	return 'highlights' in CSS;
}

function createRangeFromQuery(
	node: HTMLElement,
	query: string | RegExp
): Range | undefined {
	const text = node.textContent ?? '';
	const lowerText = text.toLowerCase();

	let start: number;
	let end: number;

	if (typeof query === 'string') {
		start = lowerText.indexOf(query.toLowerCase());
		end = start + query.length;
	} else {
		const match = text.match(query);
		start = match ? (match.index ?? -1) : -1;
		end = start + (match ? match[0].length : 0);
	}

	if (start === -1 || end === -1) return undefined;

	const range = new Range();

	if (node.firstChild) {
		range.setStart(node.firstChild, start);
		range.setEnd(node.firstChild, end);
	}

	return range;
}

export function createHighlightForElements(
	nodes: HTMLCollection,
	query: string | RegExp
): Highlight {
	const ranges: Range[] = [];

	for (const node of nodes) {
		const range = createRangeFromQuery(node as HTMLElement, query);

		if (range) {
			ranges.push(range);
		}
	}

	return new Highlight(...ranges);
}

/**
 * Builds a `Range` for every occurrence of `query` within a single text node.
 *
 * @param textNode - The text node to search.
 * @param query - The search string or pattern to match.
 * @returns One `Range` per match; an empty array when there are no matches.
 */
function createRangesFromTextNode(
	textNode: Text,
	query: string | RegExp
): Range[] {
	const text = textNode.data;

	if (!text) {
		return [];
	}

	const ranges: Range[] = [];

	if (typeof query === 'string') {
		if (!query) {
			return [];
		}

		const haystack = text.toLowerCase();
		const needle = query.toLowerCase();
		let index = haystack.indexOf(needle);

		while (index !== -1) {
			const range = new Range();
			range.setStart(textNode, index);
			range.setEnd(textNode, index + query.length);
			ranges.push(range);
			index = haystack.indexOf(needle, index + query.length);
		}

		return ranges;
	}

	// Work on a fresh, global copy so we never mutate the caller's regex
	// (its `lastIndex`) and can iterate every match within the node.
	const globalRegex = new RegExp(
		query.source,
		query.flags.includes('g') ? query.flags : `${query.flags}g`
	);

	let match = globalRegex.exec(text);

	while (match) {
		if (match[0].length === 0) {
			// Guard against zero-width matches to avoid an infinite loop.
			globalRegex.lastIndex += 1;
		} else {
			const range = new Range();
			range.setStart(textNode, match.index);
			range.setEnd(textNode, match.index + match[0].length);
			ranges.push(range);
		}

		match = globalRegex.exec(text);
	}

	return ranges;
}

/**
 * Builds a highlight covering every match of `query` across all descendant
 * text nodes of `root`.
 *
 * Unlike {@link createHighlightForElements}, which expects a specific set of
 * leaf elements, this walks the entire subtree. That makes it suitable for
 * highlighting matches inside markup you do not control (for example, text
 * rendered by a shared component), without needing to tag individual
 * elements with a class.
 *
 * @param root - The container whose descendant text is searched.
 * @param query - The search string or pattern to match.
 * @returns A `Highlight` containing a range for every match.
 */
export function createHighlightFromTextNodes(
	root: HTMLElement,
	query: string | RegExp
): Highlight {
	const ranges: Range[] = [];
	const walker = document.createTreeWalker(
		root,
		NodeFilter.SHOW_TEXT
	);

	let node = walker.nextNode();

	while (node) {
		ranges.push(...createRangesFromTextNode(node as Text, query));
		node = walker.nextNode();
	}

	return new Highlight(...ranges);
}

/**
 * Creates a case-insensitive regex from a search string that ignores
 * whitespace, underscores, slashes, and dashes between characters. This lets a
 * query such as "NEWZONE" match (and highlight) text like "NEW ZONE", with the
 * match spanning the intervening separators.
 *
 * For example, "newzone1" would match "NEWZONE1", "NEW_ZONE1",
 * "NEW-ZONE1", and "NEW ZONE 1".
 *
 * @param search - The raw search string.
 * @returns A `RegExp` suitable for both filtering and highlighting.
 */
export function createSearchPattern(search: string): RegExp {
	const pattern = search
		.trim()
		.replace(/[\s_/-]+/g, '')
		// Split to single characters...
		.split('')
		// ...in order to map it and escape
		.map(char => char.replace(/[\\^$*+?.()|[\]{}/-]/g, '\\$&'))
		.join('[\\s_/-]*');

	return new RegExp(pattern, 'i');
}
