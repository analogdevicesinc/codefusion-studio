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

import {useLayoutEffect, useState, type RefObject} from 'react';
import type {EChartsType} from 'echarts/core';

import {
	DIAGRAM_CONTAINER_ID,
	MEASUREMENT_HEADER_CHART_ID
} from '../../common/constants/timeline';
import {ROW_SELECTOR} from '../../common/constants/events';

import type {RowBounds} from '../types/timeline';

export type LayoutViewport = Readonly<{
	overlayWidth: number;
	overlayLeft: number;
	headerChartWidth: number;
	headerChartLeft: number;
	overlayHeight: number;
	rowBoundsByRowId: ReadonlyMap<string, RowBounds>;
}>;

const INITIAL_ROW_BOUNDS: ReadonlyMap<string, RowBounds> = new Map();

const areRowBoundsEqual = (
	previous: ReadonlyMap<string, RowBounds>,
	next: ReadonlyMap<string, RowBounds>
): boolean => {
	if (previous === next) return true;
	if (previous.size !== next.size) return false;

	for (const [rowId, bounds] of previous) {
		const nextBounds = next.get(rowId);

		if (
			nextBounds?.top !== bounds.top ||
			nextBounds.height !== bounds.height ||
			nextBounds.canSnap !== bounds.canSnap
		) {
			return false;
		}
	}

	return true;
};

const areViewportDimensionsEqual = (
	previous: LayoutViewport,
	next: LayoutViewport
): boolean =>
	previous.overlayWidth === next.overlayWidth &&
	previous.overlayLeft === next.overlayLeft &&
	previous.headerChartWidth === next.headerChartWidth &&
	previous.headerChartLeft === next.headerChartLeft &&
	previous.overlayHeight === next.overlayHeight;

const getRowElements = (container: Element): HTMLElement[] =>
	Array.from(container.querySelectorAll<HTMLElement>(ROW_SELECTOR));

const getViewport = (
	overlay: HTMLElement,
	chartColumn: HTMLElement,
	headerChart: EChartsType | undefined,
	diagramContainer: Element
): LayoutViewport => {
	const overlayRect = overlay.getBoundingClientRect();
	const headerChartDom = headerChart?.getDom();
	const headerChartRect = headerChartDom?.getBoundingClientRect();
	const rowBoundsByRowId = new Map<string, RowBounds>();

	// The sticky chart takes priority over rows scrolling underneath it.
	if (headerChartRect) {
		rowBoundsByRowId.set(MEASUREMENT_HEADER_CHART_ID, {
			top: headerChartRect.top - overlayRect.top,
			height: headerChartRect.height,
			canSnap: false
		});
	}
	for (const rowElement of getRowElements(diagramContainer)) {
		const {rowId} = rowElement.dataset;
		if (!rowId) continue;

		const rowRect = rowElement.getBoundingClientRect();

		rowBoundsByRowId.set(rowId, {
			top: rowRect.top - overlayRect.top,
			height: rowRect.height,
			canSnap: true
		});
	}

	return {
		overlayWidth: overlay.clientWidth,
		overlayLeft: overlayRect.left,
		headerChartWidth: headerChartDom?.clientWidth ?? 0,
		headerChartLeft: headerChartRect?.left ?? 0,
		overlayHeight: Math.max(
			0,
			Math.min(
				diagramContainer.getBoundingClientRect().bottom,
				chartColumn.getBoundingClientRect().bottom
			) - overlayRect.top
		),
		rowBoundsByRowId
	};
};

/**
 * Measures the overlay, header chart, and all visible timeline row containers.
 * Row geometry remains available for expanded group rows that have no chart.
 */
export default function useMeasureLayoutViewport(
	measurementViewportRef: RefObject<HTMLDivElement>,
	measurementContainerRef: RefObject<HTMLElement>,
	headerChart: EChartsType | undefined,
	visibleRowIds: readonly string[],
	enabled: boolean
): LayoutViewport {
	const [viewport, setViewport] = useState<LayoutViewport>({
		overlayWidth: 0,
		overlayLeft: 0,
		headerChartWidth: 0,
		headerChartLeft: 0,
		overlayHeight: 0,
		rowBoundsByRowId: INITIAL_ROW_BOUNDS
	});

	useLayoutEffect(() => {
		if (!enabled) return;

		const overlay = measurementViewportRef.current;
		const chartColumn = measurementContainerRef.current;
		if (!overlay || !chartColumn) return;

		const diagramContainer = overlay.closest(
			`#${DIAGRAM_CONTAINER_ID}`
		);
		if (!diagramContainer) return;

		const updateViewport = () => {
			const next = getViewport(
				overlay,
				chartColumn,
				headerChart,
				diagramContainer
			);

			setViewport(prev => {
				if (
					areViewportDimensionsEqual(prev, next) &&
					areRowBoundsEqual(
						prev.rowBoundsByRowId,
						next.rowBoundsByRowId
					)
				) {
					return prev;
				}

				return next;
			});
		};

		updateViewport();

		const resizeObserver = new ResizeObserver(updateViewport);
		// Observe the overlay, diagram container, header chart, and each
		// source-row chart so the layout is recomputed on size changes.
		// Position-only changes are handled by effect reruns.
		resizeObserver.observe(overlay);
		resizeObserver.observe(chartColumn);
		resizeObserver.observe(diagramContainer);

		const headerChartDom = headerChart?.getDom();
		if (headerChartDom) resizeObserver.observe(headerChartDom);

		for (const rowElement of getRowElements(diagramContainer)) {
			resizeObserver.observe(rowElement);
		}

		diagramContainer.addEventListener('scroll', updateViewport, {
			passive: true
		});

		return () => {
			resizeObserver.disconnect();
			diagramContainer.removeEventListener('scroll', updateViewport);
		};
	}, [
		measurementViewportRef,
		measurementContainerRef,
		headerChart,
		visibleRowIds,
		enabled
	]);

	return viewport;
}
