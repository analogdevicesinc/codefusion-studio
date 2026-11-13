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

import {useLayoutEffect, useState} from 'react';
import type {HeaderChartHandle, Range} from '../types/timeline';

export type AppliedChartProjection = Readonly<{
	minPixel: number | undefined;
	maxPixel: number | undefined;
}>;

const EMPTY_PROJECTION: AppliedChartProjection = {
	minPixel: undefined,
	maxPixel: undefined
};

const getAppliedChartProjection = (
	headerChart: HeaderChartHandle | undefined,
	timestampMin: number,
	timestampMax: number
): AppliedChartProjection => {
	if (!headerChart) return EMPTY_PROJECTION;

	return {
		minPixel: headerChart.elapsedToPixel(timestampMin),
		maxPixel: headerChart.elapsedToPixel(timestampMax)
	};
};

/**
 * Tracks the header chart's applied X-axis projection. ECharts emits
 * `finished` after its pending actions and rendering have completed, making
 * the resulting state update the synchronization point for measurement
 * elements that depend on the chart's coordinate system.
 */
export default function useAppliedChartProjection(
	headerChart: HeaderChartHandle | undefined,
	timestampRange: Range
): AppliedChartProjection {
	const {min: timestampMin, max: timestampMax} = timestampRange;
	const [projection, setProjection] =
		useState<AppliedChartProjection>(() =>
			getAppliedChartProjection(
				headerChart,
				timestampMin,
				timestampMax
			)
		);

	useLayoutEffect(() => {
		const updateProjection = () => {
			const next = getAppliedChartProjection(
				headerChart,
				timestampMin,
				timestampMax
			);

			setProjection(previous =>
				previous.minPixel === next.minPixel &&
				previous.maxPixel === next.maxPixel
					? previous
					: next
			);
		};

		if (!headerChart) {
			updateProjection();

			return undefined;
		}

		headerChart.chart.on('finished', updateProjection);
		updateProjection();

		return () => {
			headerChart.chart.off('finished', updateProjection);
		};
	}, [headerChart, timestampMax, timestampMin]);

	return projection;
}
