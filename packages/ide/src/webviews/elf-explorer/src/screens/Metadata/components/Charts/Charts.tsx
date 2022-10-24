/**
 *
 * Copyright (c) 2024 Analog Devices, Inc.
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
import ReactECharts, {type EChartsOption} from 'echarts-for-react';

import HeaderWithTooltip from '../../../../components/HeaderWithTooltip/HeaderWithTooltip';
import {type TSection} from '../../../../common/types/memory-layout';
import {
	calculateSectionSizes,
	chartLegendColors,
	axisColor
} from '../../../../utils/chart-utils';
import ChartLegend from '../../../../components/ChartLegend/ChartLegend';
import {transformBtoKB} from '../../../../utils/number';
import {useLocaleContext} from '@common/contexts/LocaleContext';
import type {TLocaleContext} from '../../../../common/types/context';
import styles from './Charts.module.scss';

type TMainSectionChartProps = {
	readonly sections: TSection[];
};

export default function Charts({sections}: TMainSectionChartProps) {
	const i10n: TLocaleContext | undefined =
		useLocaleContext()?.metadata?.sizes;
	const chartData = calculateSectionSizes(sections);

	const totalSize = chartData.text + chartData.data + chartData.bss;

	const text = `(${transformBtoKB(chartData.text)})`;
	const data = `(${transformBtoKB(chartData.data)})`;
	const bss = `(${transformBtoKB(chartData.bss)})`;

	const legendData = {text, data, bss};

	const getOption = (): EChartsOption => ({
		animation: false,
		grid: {
			show: false,
			top: '1%',
			bottom: '25%',
			left: 'left',
			right: '4%',
			containLabel: false
		},
		xAxis: {
			type: 'value',
			boundaryGap: [0, 0.01],
			axisLabel: {
				align: 'left'
			},
			splitLine: {
				show: true,
				lineStyle: {
					color: axisColor // Change the color of the vertical dividers to red
				}
			}
		},
		yAxis: {
			type: 'category',
			data: ['Size'],
			axisLine: {
				show: false
			},
			axisTick: {
				show: false
			},
			axisLabel: {
				show: false
			}
		},
		series: [
			{
				name: 'text',
				type: 'bar',
				data: [chartData.text],
				barGap: '100%',
				itemStyle: {
					color: chartLegendColors.text
				}
			},
			{
				name: 'data',
				type: 'bar',
				data: [chartData.data],
				itemStyle: {
					color: chartLegendColors.data
				}
			},
			{
				name: 'bss',
				type: 'bar',
				data: [chartData.bss],
				itemStyle: {
					color: chartLegendColors.bss
				}
			}
		]
	});

	return (
		<div className={styles.container}>
			<HeaderWithTooltip
				title={`${i10n?.title} (${transformBtoKB(totalSize, false)})`}
				i10n={i10n}
			/>

			<div className={styles.chartWrapper}>
				<ReactECharts
					option={getOption()}
					style={{height: '100%', width: '100%'}}
				/>
				<div className={styles.legendContainer}>
					<ChartLegend data={legendData} direction='row' />
				</div>
			</div>
		</div>
	);
}
