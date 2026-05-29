/**
 *
 * Copyright (c) 2025-2026 Analog Devices, Inc.
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

type TooltipSize = Readonly<{
	contentSize?: number[];
	viewSize?: number[];
}>;

const clamp = (value: number, min: number, max: number) =>
	Math.min(Math.max(value, min), max);

export function useTimelineTooltipPosition(
	containerRef: React.RefObject<HTMLElement>,
	chartRef: React.RefObject<any>
) {
	return useCallback(
		(
			point: number[],
			_params: unknown,
			_dom: HTMLElement,
			_rect: unknown,
			size: TooltipSize
			// eslint-disable-next-line max-params
		) => {
			const [pointXRaw = 0] = point;
			const pointX = Number(pointXRaw);
			const contentWidth = size?.contentSize?.[0] ?? 0;
			const contentHeight = size?.contentSize?.[1] ?? 0;
			const viewWidth = size?.viewSize?.[0] ?? 0;
			const viewHeight = size?.viewSize?.[1] ?? 0;

			let left = pointX;
			let top = viewHeight;

			if (left + contentWidth > viewWidth) {
				left = pointX - contentWidth;
			}

			left = clamp(left, 0, Math.max(0, viewWidth - contentWidth));

			// If the row is near the bottom of the visible timeline area, place above it.
			const container = containerRef.current;
			const chart = chartRef.current?.getEchartsInstance?.();
			const chartRect = chart?.getDom?.()?.getBoundingClientRect();

			if (container && chartRect) {
				const containerRect = container.getBoundingClientRect();
				const rowBottomInContainer =
					Number(chartRect.bottom) -
					containerRect.top +
					container.scrollTop;
				const visibleBottom =
					container.scrollTop + container.clientHeight;

				if (rowBottomInContainer + contentHeight > visibleBottom) {
					top = -contentHeight;
				}
			}

			return [left, top];
		},
		[chartRef, containerRef]
	);
}
