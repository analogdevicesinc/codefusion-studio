/**
 *
 * Copyright (c) 2026 Analog Devices, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import {useEffect} from 'react';
import type {MutableRefObject, RefObject} from 'react';
import type {EChartsType} from 'echarts/core';

type UseTimelineChartsResizeParams = {
	chartAreaRef: RefObject<HTMLElement>;
	timestampChartsRef: MutableRefObject<Map<string, EChartsType>>;
};

/**
 * Keeps all timestamp charts synchronized with the shared chart-area width
 * and corrects stale ECharts dimensions when a retained webview is revealed.
 */
export function useTimelineChartsResize({
	chartAreaRef,
	timestampChartsRef
}: UseTimelineChartsResizeParams): void {
	useEffect(() => {
		const chartArea = chartAreaRef.current;
		if (!chartArea) return;

		const {ownerDocument} = chartArea;
		const ownerWindow = ownerDocument.defaultView;
		if (!ownerWindow) return;

		let scheduledResizeFrame: number | undefined;

		const resizeTimestampCharts = () => {
			scheduledResizeFrame = undefined;

			timestampChartsRef.current.forEach(chartInstance => {
				if (!chartInstance.isDisposed()) {
					chartInstance.resize({
						width: 'auto',
						height: 'auto'
					});
				}
			});
		};

		const scheduleTimestampChartsResize = () => {
			if (scheduledResizeFrame !== undefined) {
				ownerWindow.cancelAnimationFrame(scheduledResizeFrame);
			}

			scheduledResizeFrame = ownerWindow.requestAnimationFrame(
				resizeTimestampCharts
			);
		};

		const chartAreaResizeObserver = new ResizeObserver(
			scheduleTimestampChartsResize
		);

		const handleWebviewVisibilityChange = () => {
			if (ownerDocument.visibilityState === 'visible') {
				scheduleTimestampChartsResize();
			}
		};

		chartAreaResizeObserver.observe(chartArea);
		ownerDocument.addEventListener(
			'visibilitychange',
			handleWebviewVisibilityChange
		);

		return () => {
			chartAreaResizeObserver.disconnect();
			ownerDocument.removeEventListener(
				'visibilitychange',
				handleWebviewVisibilityChange
			);

			if (scheduledResizeFrame !== undefined) {
				ownerWindow.cancelAnimationFrame(scheduledResizeFrame);
			}
		};
	}, [chartAreaRef, timestampChartsRef]);
}
