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

/** A run of characters that either does or does not belong to a match. */
export type TextSegment = {
	value: string;
	isMatch: boolean;
};

/**
 * Whether `text` contains `search`, case-insensitively, at any position.
 *
 * An empty or whitespace-only query matches everything, so clearing the
 * search box restores the full list.
 */
export function matchesSearch(text: string, search: string): boolean {
	const term = search.trim().toLowerCase();

	return term === '' || text.toLowerCase().includes(term);
}

/**
 * Splits `text` into alternating matched and unmatched runs, one entry per
 * occurrence of `search`. Concatenating every `value` reproduces `text`, so
 * the caller can style the matches without altering what is rendered.
 */
export function splitOnMatches(
	text: string,
	search: string
): TextSegment[] {
	const term = search.trim().toLowerCase();

	if (term === '') return [{value: text, isMatch: false}];

	const haystack = text.toLowerCase();
	const segments: TextSegment[] = [];
	let cursor = 0;
	let found = haystack.indexOf(term, cursor);

	while (found !== -1) {
		if (found > cursor) {
			segments.push({
				value: text.slice(cursor, found),
				isMatch: false
			});
		}

		segments.push({
			value: text.slice(found, found + term.length),
			isMatch: true
		});

		cursor = found + term.length;
		found = haystack.indexOf(term, cursor);
	}

	if (cursor < text.length) {
		segments.push({value: text.slice(cursor), isMatch: false});
	}

	return segments;
}
