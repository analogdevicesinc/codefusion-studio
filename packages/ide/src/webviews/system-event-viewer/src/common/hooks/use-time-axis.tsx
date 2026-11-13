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

import {useEffect, useMemo} from 'react';
import {useAppDispatch} from '../../state/store';
import {useDataZoom} from '../../state/slices/timeline/timeline.selector';
import {setReferenceValue} from '../../state/slices/timeline/timeline.reducer';
import {
	getVisibleRange,
	getRoundingTolerance
} from '../utils/axis-scale';
import {
	formatReferenceLabel,
	getTickFormatter,
	computeTickInterval,
	type TimeMode
} from '../utils/time-mode-formatters';
import {
	getTimeAxisCoordinates,
	getTimelineMinZoomSpan
} from '../utils/time-axis-utils';
import type {Range} from '../types/timeline';

/** Builds the header's rebased axis while formatters and Redux continue using elapsed seconds. */
const useTimeAxis = (timestampRange: Range, mode: TimeMode) => {
	const dispatch = useAppDispatch();
	const dataZoom = useDataZoom();
	const coordinates = getTimeAxisCoordinates(mode);
	const minZoomSpan = getTimelineMinZoomSpan(timestampRange);

	const axis = useMemo(() => {
		const visibleRange = getVisibleRange(timestampRange, dataZoom);
		const tickInterval = computeTickInterval(visibleRange, mode);

		const {formatter} = getTickFormatter(
			timestampRange,
			visibleRange,
			mode
		);

		const isAligned = (elapsed: number) => {
			const value = coordinates.toAxis(elapsed);
			const tolerance = Math.min(
				tickInterval / 4,
				getRoundingTolerance(value)
			);

			return (
				Math.abs(
					value - Math.round(value / tickInterval) * tickInterval
				) <= tolerance
			);
		};

		return {
			coordinates,
			visibleRange: {
				min: coordinates.toAxis(visibleRange.min),
				max: coordinates.toAxis(visibleRange.max)
			},
			range: {
				min: coordinates.toAxis(timestampRange.min),
				max: coordinates.toAxis(timestampRange.max)
			},
			tickInterval,
			referenceLabel: formatReferenceLabel(
				visibleRange.min,
				visibleRange,
				mode
			),
			axisLabelOptions: {
				formatter: (axisSeconds: number) =>
					formatter(coordinates.toElapsed(axisSeconds)),
				hideOverlap: true,
				showMinLabel: isAligned(visibleRange.min),
				showMaxLabel: isAligned(visibleRange.max)
			}
		};
	}, [timestampRange, dataZoom, mode, coordinates]);

	useEffect(() => {
		dispatch(setReferenceValue(axis.referenceLabel));
	}, [dispatch, axis.referenceLabel]);

	return {...axis, minZoomSpan};
};

export default useTimeAxis;
