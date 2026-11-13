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
import {getRoundingTolerance} from '../utils/axis-scale';
import {getTimelineMinZoomSpan} from '../utils/time-axis-utils';
import type {DataZoom, Range} from '../types/timeline';

export default function useCanZoomIn(
	dataZoom: DataZoom,
	range: Range
): boolean {
	const minSpan = getTimelineMinZoomSpan(range);

	return useMemo(() => {
		const axisSpan = range.max - range.min;
		if (!Number.isFinite(axisSpan) || axisSpan <= 0) return false;

		const currentZoomWindowPct = dataZoom.end - dataZoom.start;
		if (currentZoomWindowPct <= 0) return false;
		const minZoomWindowPct = (minSpan / axisSpan) * 100;

		const tolerance = getRoundingTolerance(
			Math.max(Math.abs(dataZoom.start), Math.abs(dataZoom.end))
		);

		return currentZoomWindowPct > minZoomWindowPct + tolerance;
	}, [dataZoom.start, dataZoom.end, range, minSpan]);
}
