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

import {useMemo} from 'react';
import {MIN_VALUE_SPAN} from '../constants/timeline';
import type {DataZoom, Range} from '../types/timeline';

export default function useCanZoomIn(
	dataZoom: DataZoom,
	range: Range
): boolean {
	return useMemo(() => {
		const axisSpan = range.max - range.min;
		if (!Number.isFinite(axisSpan) || axisSpan <= 0) return false;

		const currentZoomWindowPct = dataZoom.end - dataZoom.start;
		if (currentZoomWindowPct <= 0) return false;

		const minZoomWindowPct = (MIN_VALUE_SPAN / axisSpan) * 100;
		// Small tolerance to avoid floating point precision issues
		const tolerance = Math.max(minZoomWindowPct * 1e-3, 1e-12);

		return currentZoomWindowPct > minZoomWindowPct + tolerance;
	}, [dataZoom.start, dataZoom.end, range.min, range.max]);
}
