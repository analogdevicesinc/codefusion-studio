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
import {splitOnMatches} from '../utils/project-search';
import styles from './HighlightedText.module.scss';

type HighlightedTextProps = Readonly<{
	/** The full text to render. */
	text: string;
	/** Substring to emphasize; every occurrence is marked. */
	match: string;
}>;

/**
 * Renders `text` with each occurrence of `match` emphasized.
 *
 * The segments are plain text nodes, so the element's text content is still
 * the untouched `text`.
 */
export default function HighlightedText({
	text,
	match
}: HighlightedTextProps) {
	return (
		<>
			{splitOnMatches(text, match).map((segment, index) =>
				segment.isMatch ? (
					<mark
						// eslint-disable-next-line react/no-array-index-key
						key={`segment-${index}`}
						className={styles.match}
					>
						{segment.value}
					</mark>
				) : (
					// eslint-disable-next-line react/no-array-index-key
					<span key={`segment-${index}`}>{segment.value}</span>
				)
			)}
		</>
	);
}
