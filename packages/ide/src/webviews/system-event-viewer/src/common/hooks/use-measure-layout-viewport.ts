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

import {useEffect, useState, type RefObject} from 'react';
import type {EChartsType} from 'echarts/core';
import {DIAGRAM_CONTAINER_ID} from '../../common/constants/timeline';

export type LayoutViewport = Readonly<{
	overlayWidth: number;
	overlayLeft: number;
	viewportTop: number;
	viewportBottom: number;
	headerChartWidth: number;
	headerChartLeft: number;
}>;

const getViewport = (
	overlay: HTMLDivElement,
	headerChart?: EChartsType
): LayoutViewport => {
	const diagramContainer = overlay.closest(
		`#${DIAGRAM_CONTAINER_ID}`
	);
	const chartDom = headerChart?.getDom();
	const chartRect = chartDom?.getBoundingClientRect();
	const overlayRect = overlay.getBoundingClientRect();

	const viewportTop = diagramContainer?.scrollTop ?? 0;
	const viewportBottom = diagramContainer
		? viewportTop + diagramContainer.clientHeight
		: overlay.clientHeight;

	return {
		overlayWidth: overlay.clientWidth,
		overlayLeft: overlayRect.left,
		viewportTop,
		viewportBottom,
		headerChartWidth: chartDom?.clientWidth ?? 0,
		headerChartLeft: chartRect?.left ?? 0
	};
};

/**
 * The purpose is to measure the dimensions of the diagram container and the position of the viewport within it,
 * so that we can determine whether certain elements are within the visible area and adjust their layout accordingly.
 */
export default function useMeasureLayoutViewport(
	overlayRef: RefObject<HTMLDivElement>,
	headerChart?: EChartsType
): LayoutViewport {
	const [viewport, setViewport] = useState<LayoutViewport>({
		overlayWidth: 0,
		overlayLeft: 0,
		viewportTop: 0,
		viewportBottom: 0,
		headerChartWidth: 0,
		headerChartLeft: 0
	});

	useEffect(() => {
		const overlay = overlayRef.current;
		if (!overlay) return;

		const diagramContainer = overlay.closest(
			`#${DIAGRAM_CONTAINER_ID}`
		);

		if (!diagramContainer) return;

		const updateViewport = () => {
			const next = getViewport(overlay, headerChart);

			setViewport(prev => {
				if (
					prev.overlayWidth === next.overlayWidth &&
					prev.overlayLeft === next.overlayLeft &&
					prev.viewportTop === next.viewportTop &&
					prev.viewportBottom === next.viewportBottom &&
					prev.headerChartWidth === next.headerChartWidth &&
					prev.headerChartLeft === next.headerChartLeft
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

		const headerChartDom = headerChart?.getDom();
		const resizeObserver = new ResizeObserver(updateViewport);
		// Observe the overlay, diagram container and header chart for size changes
		// to recompute the measurement viewport accordingly
		resizeObserver.observe(overlay);
		resizeObserver.observe(diagramContainer);
		if (headerChartDom) resizeObserver.observe(headerChartDom);

		return () => {
			diagramContainer.removeEventListener('scroll', updateViewport);
			resizeObserver.disconnect();
		};
	}, [overlayRef, headerChart]);

	return viewport;
}
