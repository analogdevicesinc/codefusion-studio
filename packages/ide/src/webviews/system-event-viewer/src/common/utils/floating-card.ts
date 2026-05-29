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

export function clampYWithinList(
	listRef: React.RefObject<HTMLUListElement>,
	clientY: number,
	rowHeight: number
) {
	if (!listRef.current) return clientY;

	const {top, bottom} = listRef.current.getBoundingClientRect();
	const min = top + rowHeight / 2;
	const max = bottom - rowHeight / 2;

	return Math.min(Math.max(clientY, min), max);
}

export function isWithinList(
	listRef: React.RefObject<HTMLUListElement>,
	clientY: number
) {
	if (!listRef.current) return false;

	const {top, bottom} = listRef.current.getBoundingClientRect();

	return clientY >= top && clientY <= bottom;
}
