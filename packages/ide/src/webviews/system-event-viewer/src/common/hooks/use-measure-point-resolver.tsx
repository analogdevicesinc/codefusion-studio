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
	isPointInsideHeaderStrip,
	isPointWithinBounds,
	resolvePointFromBackground,
	resolvePointFromCandidate
} from '../utils/measurement-tool';
import {HEADER_HEIGHT} from '../constants/timeline';

import type {MouseEvent} from 'react';
import type {EChartsType} from 'echarts/core';
import type {
	MeasurePoint,
	MeasureSnapCandidate,
	MeasureResolvedPoint
} from '../types/timeline';
import type {SevEventSource} from '../types/events';

type MeasurePointResolver = Readonly<{
	eventSources: SevEventSource[];
	getChartInstance: (sourceId: string) => EChartsType | undefined;
	getHeaderChartInstance: () => EChartsType | undefined;
}>;

type MeasurePreviewResult = Readonly<{
	guidePoint: MeasurePoint;
	timestamp: number | undefined;
	isSnapped: boolean;
	snappedCandidate: MeasureSnapCandidate | undefined;
}>;

type ResolvedPoint = Readonly<{
	resolvePoint: (
		event: MouseEvent<HTMLElement>
	) => MeasureResolvedPoint | undefined;
	resolvePreviewFromMouseEvent: (
		event: MouseEvent<HTMLElement>
	) => MeasurePreviewResult;
	resolvePreviewFromLocalPointer: (
		point: MeasurePoint,
		containerRect: DOMRect
	) => MeasurePreviewResult;
}>;

/**
 * Custom hook to resolve preview and commit points on the timeline diagram,
 * including lockable pre-click snap behavior.
 */
export function useMeasurePointResolver({
	eventSources,
	getChartInstance,
	getHeaderChartInstance
}: MeasurePointResolver): ResolvedPoint {
	const getRawLocalPoint = useCallback(
		(event: MouseEvent<HTMLElement>): MeasurePoint => {
			const rect = event.currentTarget.getBoundingClientRect();

			return {
				x: event.clientX - rect.left,
				y: event.clientY - rect.top
			};
		},
		[]
	);

	const getClampedLocalPoint = useCallback(
		(
			point: MeasurePoint,
			containerRect: Pick<DOMRect, 'width' | 'height'>
		): MeasurePoint => ({
			x: Math.max(0, Math.min(point.x, containerRect.width)),
			y: Math.max(0, Math.min(point.y, containerRect.height))
		}),
		[]
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
						sourceId,
						eventIndex
					});
				});
			});

			return candidates;
		},
		[eventSources, getChartInstance]
	);

	const getBackgroundTimestamp = useCallback(
		(
			point: MeasurePoint,
			containerRect: DOMRect
		): number | undefined => {
			let chartInstance: EChartsType | undefined;

			for (const source of eventSources) {
				chartInstance = getChartInstance(String(source.id));

				if (chartInstance) break;
			}

			if (!chartInstance) {
				chartInstance = getHeaderChartInstance();
			}

			if (!chartInstance) return undefined;

			const chartRect = chartInstance
				.getDom()
				.getBoundingClientRect();
			const localX = point.x - (chartRect.left - containerRect.left);
			const localY = point.y - (chartRect.top - containerRect.top);

			const coordinates = chartInstance.convertFromPixel(
				{xAxisIndex: 0, yAxisIndex: 0},
				[localX, localY]
			);

			const timestamp = Array.isArray(coordinates)
				? coordinates[0]
				: coordinates;

			return timestamp;
		},
		[eventSources, getChartInstance, getHeaderChartInstance]
	);

	const resolvePreviewCore = useCallback(
		(
			rawPoint: MeasurePoint,
			guidePoint: MeasurePoint,
			containerRect: DOMRect
		): MeasurePreviewResult => {
			const backgroundTimestamp = getBackgroundTimestamp(
				rawPoint,
				containerRect
			);

			if (isPointInsideHeaderStrip(rawPoint, HEADER_HEIGHT)) {
				return {
					guidePoint,
					timestamp: backgroundTimestamp,
					isSnapped: false,
					snappedCandidate: undefined
				};
			}

			const candidates = buildSnapCandidates(containerRect);
			const snappedCandidate = findNearestSnapCandidate(
				rawPoint,
				candidates
			);

			if (!snappedCandidate) {
				return {
					guidePoint,
					timestamp: backgroundTimestamp,
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
		[buildSnapCandidates, getBackgroundTimestamp]
	);

	// The main point resolver function that will be used on mouse move and click events.
	// It will determine the appropriate point to use based on the mouse position, snap candidates, and chart boundaries.
	const resolvePreviewFromMouseEvent = useCallback(
		(event: MouseEvent<HTMLElement>): MeasurePreviewResult => {
			const containerRect =
				event.currentTarget.getBoundingClientRect();
			const rawPoint = getRawLocalPoint(event);
			const guidePoint = getClampedLocalPoint(
				rawPoint,
				containerRect
			);

			return resolvePreviewCore(rawPoint, guidePoint, containerRect);
		},
		[getRawLocalPoint, getClampedLocalPoint, resolvePreviewCore]
	);

	// The purpose is to resolve a local pointer position (while live updataing on zoom/pan) to a preview point
	// using the same core logic as the mouse event resolver
	const resolvePreviewFromLocalPointer = useCallback(
		(
			point: MeasurePoint,
			containerRect: DOMRect
		): MeasurePreviewResult => {
			const guidePoint = getClampedLocalPoint(point, containerRect);

			return resolvePreviewCore(point, guidePoint, containerRect);
		},
		[getClampedLocalPoint, resolvePreviewCore]
	);

	// This is the main function to resolve the mouse event to a point on the chart
	// It check if the point is within bound or in the chart header component,
	// then it checks if it should snap to a locked candidate,
	// and finally if no snapping applies it resolves to a background point with a timestamp.
	const resolvePoint = useCallback(
		(
			event: MouseEvent<HTMLElement>
		): MeasureResolvedPoint | undefined => {
			const containerRect =
				event.currentTarget.getBoundingClientRect();
			const rawPoint = getRawLocalPoint(event);

			if (
				!isPointWithinBounds(
					rawPoint,
					containerRect.width,
					containerRect.height
				)
			) {
				return undefined;
			}

			if (isPointInsideHeaderStrip(rawPoint, HEADER_HEIGHT)) {
				return undefined;
			}

			const candidates = buildSnapCandidates(containerRect);
			const snappedCandidate = findNearestSnapCandidate(
				rawPoint,
				candidates
			);

			if (snappedCandidate) {
				return resolvePointFromCandidate(snappedCandidate);
			}

			const timestamp = getBackgroundTimestamp(
				rawPoint,
				containerRect
			);

			return resolvePointFromBackground(rawPoint, timestamp);
		},
		[buildSnapCandidates, getRawLocalPoint, getBackgroundTimestamp]
	);

	return {
		resolvePoint,
		resolvePreviewFromMouseEvent,
		resolvePreviewFromLocalPointer
	};
}
