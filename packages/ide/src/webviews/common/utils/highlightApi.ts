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
