/**
 * Copyright (c) 2026 Analog Devices, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type {EChartsType} from 'echarts/core';

export type HeaderAxisOptions = {
	min: number;
	max: number;
	minInterval: number;
	axisLabel: {
		showMinLabel?: boolean;
		showMaxLabel?: boolean;
		formatter: (value: number) => string;
	};
};

type ChartWithAxisModel = {
	getModel: () => {
		getComponent: (
			name: 'xAxis',
			index: number
		) => {
			axis: {scale: {getTicks: () => Array<{value: number}>}};
		};
	};
};

/** Reads the actual ECharts scale ticks, omitting its unaligned extent endpoints. */
export const readHeaderAxis = (
	chart: EChartsType
): {axis: HeaderAxisOptions; ticks: number[]} => {
	const axis = (chart.getOption().xAxis as HeaderAxisOptions[])[0];
	const model = (chart as unknown as ChartWithAxisModel)
		.getModel()
		.getComponent('xAxis', 0);
	const interval = axis.minInterval;
	const ticks = model.axis.scale
		.getTicks()
		.map(tick => tick.value)
		.filter(value => {
			const tolerance = Math.min(
				interval / 4,
				Math.max(
					interval * 1e-6,
					Number.EPSILON * Math.max(1, Math.abs(value)) * 16
				)
			);

			return (
				Math.abs(value - Math.round(value / interval) * interval) <=
				tolerance
			);
		})
		.filter(
			(value, index, values) =>
				index === 0 || value - values[index - 1] >= interval / 2
		);

	return {axis, ticks};
};
