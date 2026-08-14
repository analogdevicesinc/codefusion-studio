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

import {DIAGRAM_CONTAINER_ID} from '../../common/constants/timeline';
import type {SevEventSource} from '../types/events';

export type LayoutViewport = Readonly<{
	overlayWidth: number;
	overlayLeft: number;
	overlayTop: number;
	viewportTop: number;
	viewportBottom: number;
	headerChartWidth: number;
	headerChartLeft: number;
	rowTopBySourceId: ReadonlyMap<string, number>;
}>;

const INITIAL_ROW_TOPS: ReadonlyMap<string, number> = new Map();

const areRowTopsEqual = (
	previous: ReadonlyMap<string, number>,
	next: ReadonlyMap<string, number>
): boolean => {
	if (previous === next) return true;
	if (previous.size !== next.size) return false;

	for (const [sourceId, top] of previous) {
		if (next.get(sourceId) !== top) return false;
	}

	return true;
};

const areViewportDimensionsEqual = (
	previous: LayoutViewport,
	next: LayoutViewport
): boolean =>
	previous.overlayWidth === next.overlayWidth &&
	previous.overlayLeft === next.overlayLeft &&
	previous.overlayTop === next.overlayTop &&
	previous.viewportTop === next.viewportTop &&
	previous.viewportBottom === next.viewportBottom &&
	previous.headerChartWidth === next.headerChartWidth &&
	previous.headerChartLeft === next.headerChartLeft;

const getViewport = (
	overlay: HTMLDivElement,
	headerChart: EChartsType | undefined,
	eventSources: readonly SevEventSource[],
	getChartInstance: (sourceId: string) => EChartsType | undefined
): LayoutViewport => {
	const diagramContainer = overlay.closest(
		`#${DIAGRAM_CONTAINER_ID}`
	);
	const overlayRect = overlay.getBoundingClientRect();
	const headerChartDom = headerChart?.getDom();
	const headerChartRect = headerChartDom?.getBoundingClientRect();

	const rowTopBySourceId = new Map<string, number>();

	// Record each row chart's current viewport top so committed points can be
	// re-projected after row reorder, resize, or scroll.
	for (const source of eventSources) {
		const sourceId = String(source.id);
		const sourceChartDom = getChartInstance(sourceId)?.getDom();

		if (sourceChartDom) {
			rowTopBySourceId.set(
				sourceId,
				sourceChartDom.getBoundingClientRect().top
			);
		}
	}

	const viewportTop = diagramContainer?.scrollTop ?? 0;
	const viewportBottom = diagramContainer
		? viewportTop + diagramContainer.clientHeight
		: overlay.clientHeight;

	return {
		overlayWidth: overlay.clientWidth,
		overlayLeft: overlayRect.left,
		overlayTop: overlayRect.top,
		viewportTop,
		viewportBottom,
		headerChartWidth: headerChartDom?.clientWidth ?? 0,
		headerChartLeft: headerChartRect?.left ?? 0,
		rowTopBySourceId
	};
};

/**
 * The purpose is to measure the dimensions of the diagram container and the position of the viewport within it,
 * so that we can determine whether certain elements are within the visible area and adjust their layout accordingly.
 * It also tracks the top of each event-source row so the measurement overlay can re-project committed points
 * after the row order or size changes.
 */
export default function useMeasureLayoutViewport(
	overlayRef: RefObject<HTMLDivElement>,
	headerChart: EChartsType | undefined,
	eventSources: readonly SevEventSource[],
	getChartInstance: (sourceId: string) => EChartsType | undefined
): LayoutViewport {
	const [viewport, setViewport] = useState<LayoutViewport>({
		overlayWidth: 0,
		overlayLeft: 0,
		overlayTop: 0,
		viewportTop: 0,
		viewportBottom: 0,
		headerChartWidth: 0,
		headerChartLeft: 0,
		rowTopBySourceId: INITIAL_ROW_TOPS
	});

	useLayoutEffect(() => {
		const overlay = overlayRef.current;
		if (!overlay) return;

		const diagramContainer = overlay.closest(
			`#${DIAGRAM_CONTAINER_ID}`
		);
		if (!diagramContainer) return;

		const updateViewport = () => {
			const next = getViewport(
				overlay,
				headerChart,
				eventSources,
				getChartInstance
			);

			setViewport(prev => {
				if (
					areViewportDimensionsEqual(prev, next) &&
					areRowTopsEqual(
						prev.rowTopBySourceId,
						next.rowTopBySourceId
					)
				) {
					return prev;
				}

				return next;
			});
		};

		updateViewport();

		diagramContainer.addEventListener('scroll', updateViewport, {
			passive: true
		});

		const resizeObserver = new ResizeObserver(updateViewport);
		// Observe the overlay, diagram container, header chart, and each
		// source-row chart so the viewport is recomputed on size changes.
		// Position-only changes are handled by scroll events or effect reruns.
		resizeObserver.observe(overlay);
		resizeObserver.observe(diagramContainer);

		const headerChartDom = headerChart?.getDom();
		if (headerChartDom) resizeObserver.observe(headerChartDom);

		for (const source of eventSources) {
			const chart = getChartInstance(String(source.id))?.getDom();
			if (chart) resizeObserver.observe(chart);
		}

		return () => {
			diagramContainer.removeEventListener('scroll', updateViewport);
			resizeObserver.disconnect();
		};
	}, [overlayRef, headerChart, eventSources, getChartInstance]);

	return viewport;
}
