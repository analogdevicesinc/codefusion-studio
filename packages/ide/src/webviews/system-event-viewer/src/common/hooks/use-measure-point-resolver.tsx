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

import {useCallback} from 'react';

import {
	findNearestSnapCandidate,
	isPointWithinBounds,
	resolvePointFromBackground,
	resolvePointFromCandidate
} from '../utils/measurement-tool';

import type {EChartsType} from 'echarts/core';
import type {
	HeaderChartHandle,
	MeasurePoint,
	MeasureSnapCandidate,
	MeasureResolvedPoint,
	PreparedMeasurementValue,
	RowBounds
} from '../types/timeline';
import type {SevEventSource} from '../types/events';
type MeasurePointResolver = Readonly<{
	eventSources: SevEventSource[];
	getChartInstance: (sourceId: string) => EChartsType | undefined;
	getHeaderChartInstance: () => HeaderChartHandle | undefined;
	/** Prepares background timestamps for both previews and committed points. */
	prepareBackgroundValue: (
		value: number | undefined
	) => PreparedMeasurementValue | undefined;
	rowBoundsByRowId: ReadonlyMap<string, RowBounds>;
	visibleAnchorRowIds: ReadonlyMap<string, string>;
	visibleGroupRowIds: ReadonlySet<string>;
}>;

type MeasurePreviewResult = Readonly<{
	guidePoint: MeasurePoint | undefined;
	timestamp: number | undefined;
	preparedValue?: PreparedMeasurementValue;
	isSnapped: boolean;
	snappedCandidate: MeasureSnapCandidate | undefined;
}>;

type ResolvedPoint = Readonly<{
	resolvePoint: (
		point: MeasurePoint,
		containerRect: DOMRect
	) => MeasureResolvedPoint | undefined;
	resolvePreviewFromLocalPointer: (
		point: MeasurePoint,
		containerRect: DOMRect
	) => MeasurePreviewResult;
}>;

/**
 * Custom hook to resolve preview and commit points on the timeline diagram,
 * including lockable pre-click snap behavior.
 * Background values are prepared before returning; snapped event timestamps keep their original value.
 */
export function useMeasurePointResolver({
	eventSources,
	getChartInstance,
	getHeaderChartInstance,
	prepareBackgroundValue,
	rowBoundsByRowId,
	visibleAnchorRowIds,
	visibleGroupRowIds
}: MeasurePointResolver): ResolvedPoint {
	const findRowAtPoint = useCallback(
		(point: MeasurePoint) =>
			Array.from(rowBoundsByRowId).find(
				([, bounds]) =>
					point.y >= bounds.top &&
					point.y < bounds.top + bounds.height
			),
		[rowBoundsByRowId]
	);

	const buildSnapCandidates = useCallback(
		(containerRect: DOMRect) => {
			const candidates: MeasureSnapCandidate[] = [];

			eventSources.forEach(source => {
				const sourceId = String(source.id);
				const chartInstance = getChartInstance(sourceId);
				if (!chartInstance) return;

				const chartRect = chartInstance
					.getDom()
					.getBoundingClientRect();

				source.timestamps.forEach((timestamp, eventIndex) => {
					const pixel = chartInstance.convertToPixel(
						{xAxisIndex: 0, yAxisIndex: 0},
						[timestamp.value, 0]
					);

					if (!Array.isArray(pixel)) return;

					const [x, y] = pixel;

					candidates.push({
						x: chartRect.left - containerRect.left + x,
						y: chartRect.top - containerRect.top + y,
						timestamp: timestamp.value,
						rawTicks: timestamp.rawTicks,
						sourceId,
						eventIndex
					});
				});
			});

			return candidates;
		},
		[eventSources, getChartInstance]
	);

	const getSnapCandidate = useCallback(
		(point: MeasurePoint, containerRect: DOMRect) => {
			if (findRowAtPoint(point)?.[1].canSnap === false)
				return undefined;

			return findNearestSnapCandidate(
				point,
				buildSnapCandidates(containerRect)
			);
		},
		[findRowAtPoint, buildSnapCandidates]
	);

	const getBackgroundTimestamp = useCallback(
		(
			point: MeasurePoint,
			containerRect: DOMRect
		): PreparedMeasurementValue | undefined => {
			const header = getHeaderChartInstance();
			if (!header) return undefined;

			const chartRect = header.chart.getDom().getBoundingClientRect();
			const localX = point.x + containerRect.left - chartRect.left;

			return prepareBackgroundValue(header.pixelToElapsed(localX));
		},
		[getHeaderChartInstance, prepareBackgroundValue]
	);

	const resolvePreviewFromLocalPointer = useCallback(
		(
			rawPoint: MeasurePoint,
			containerRect: DOMRect
		): MeasurePreviewResult => {
			if (
				!isPointWithinBounds(
					rawPoint,
					containerRect.width,
					containerRect.height
				)
			) {
				return {
					guidePoint: undefined,
					timestamp: undefined,
					isSnapped: false,
					snappedCandidate: undefined
				};
			}

			const backgroundTimestamp = getBackgroundTimestamp(
				rawPoint,
				containerRect
			);

			const snappedCandidate = getSnapCandidate(
				rawPoint,
				containerRect
			);

			if (!snappedCandidate) {
				return {
					guidePoint: rawPoint,
					timestamp: backgroundTimestamp?.value,
					preparedValue: backgroundTimestamp,
					isSnapped: false,
					snappedCandidate: undefined
				};
			}

			return {
				guidePoint: {
					x: snappedCandidate.x,
					y: snappedCandidate.y
				},
				timestamp: snappedCandidate.timestamp,
				isSnapped: true,
				snappedCandidate
			};
		},
		[getSnapCandidate, getBackgroundTimestamp]
	);

	// Returns the resolved snapped point enriched with the row-local Y of the snap,
	// so the overlay can keep the marker aligned to the source row after reorder.
	const resolveSnappedPointWithRowLocalY = useCallback(
		(
			snappedCandidate: MeasureSnapCandidate
		): MeasureResolvedPoint | undefined => {
			const resolvedSnappedPoint =
				resolvePointFromCandidate(snappedCandidate);
			const visibleRowId =
				visibleAnchorRowIds.get(snappedCandidate.sourceId) ??
				snappedCandidate.sourceId;
			const rowBounds = rowBoundsByRowId.get(visibleRowId);

			if (!rowBounds) return undefined;

			return {
				...resolvedSnappedPoint,
				anchor: {
					rowId: snappedCandidate.sourceId,
					rowLocalY: snappedCandidate.y - rowBounds.top,
					kind: 'chart'
				}
			};
		},
		[rowBoundsByRowId, visibleAnchorRowIds]
	);

	// Background points follow the header chart, source, or group they were placed on.
	const resolveBackgroundPointWithAnchor = useCallback(
		(
			rawPoint: MeasurePoint,
			preparedValue: PreparedMeasurementValue | undefined
		): MeasureResolvedPoint | undefined => {
			if (!preparedValue) return undefined;

			const resolvedBackgroundPoint = resolvePointFromBackground(
				rawPoint,
				preparedValue.value
			);

			const row = findRowAtPoint(rawPoint);

			if (!row) return undefined;

			const [rowId, rowBounds] = row;
			const isGroupRow = visibleGroupRowIds.has(rowId);

			return {
				...resolvedBackgroundPoint,
				preparedValue,
				anchor: {
					rowId,
					rowLocalY: rawPoint.y - rowBounds.top,
					kind: isGroupRow ? 'group' : 'chart'
				}
			};
		},
		[findRowAtPoint, visibleGroupRowIds]
	);

	// Resolve a viewport-local point, preferring a snap when the row allows it.
	const resolvePoint = useCallback(
		(
			rawPoint: MeasurePoint,
			containerRect: DOMRect
		): MeasureResolvedPoint | undefined => {
			if (
				!isPointWithinBounds(
					rawPoint,
					containerRect.width,
					containerRect.height
				)
			) {
				return undefined;
			}

			const snappedCandidate = getSnapCandidate(
				rawPoint,
				containerRect
			);

			if (snappedCandidate) {
				return resolveSnappedPointWithRowLocalY(snappedCandidate);
			}

			const timestamp = getBackgroundTimestamp(
				rawPoint,
				containerRect
			);

			return resolveBackgroundPointWithAnchor(rawPoint, timestamp);
		},
		[
			getSnapCandidate,
			getBackgroundTimestamp,
			resolveBackgroundPointWithAnchor,
			resolveSnappedPointWithRowLocalY
		]
	);

	return {
		resolvePoint,
		resolvePreviewFromLocalPointer
	};
}
