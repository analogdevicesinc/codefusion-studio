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
import {useLocaleContext} from '@common/contexts/LocaleContext';
import {
	calculateSectionSizes,
	chartLegendColors
} from '../../../../utils/chart-utils';
import ChartLegend from '../../../../components/ChartLegend/ChartLegend';
import {transformBtoKB} from '../../../../utils/number';
import {formatSize} from '../../../../utils/stats-utils';

import type {TSection} from '../../../../common/types/memory-layout';
import type {TLocaleContext} from '../../../../common/types/context';

import styles from './MainSectionChart.module.scss';
import type {ECElementEvent} from 'echarts';

type TMainSectionChartProps = {
	readonly sections: TSection[];
};

export default function MainSectionChart({
	sections
}: TMainSectionChartProps) {
	const chartData = calculateSectionSizes(sections);
	const i10n: TLocaleContext | undefined =
		useLocaleContext()?.stats?.chart;

	const totalSize = chartData.text + chartData.data + chartData.bss;
	const step = Math.ceil(totalSize / 5);

	const text = `(${transformBtoKB(chartData.text)})`;
	const data = `(${transformBtoKB(chartData.data)})`;
	const bss = `(${transformBtoKB(chartData.bss)})`;

	const legendData = {text, data, bss};

	const getOption = (): EChartsOption => ({
		animation: false,
		grid: {
			left: '0',
			top: '-10',
			right: '50%',
			bottom: '5'
		},
		xAxis: {
			type: 'category',
			data: ['Total Size'],
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
		yAxis: {
			type: 'value',
			position: 'right',
			axisLine: {
				show: false
			},
			axisTick: {
				show: true,
				inside: true
			},
			splitLine: {
				show: false
			},
			alignTicks: true,
			axisLabel: {
				show: true,
				align: 'left',
				verticalAlign: 'middle',
				formatter(value: number) {
					// Add an underscore and a space before each label item
					return value % step === 0
						? formatSize(value).toString()
						: '';
				}
			},
			min: 0,
			max: totalSize + step,
			interval: step
		},
		tooltip: {
			trigger: 'item',
			className: styles.chartTooltip,
			formatter(params: ECElementEvent) {
				// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
				return `Section: ${params.marker}${params.seriesName} <br/>Size: ${params.value?.toLocaleString()} bytes`;
			},
			confine: true
		},
		series: [
			{
				name: 'text',
				type: 'bar',
				stack: 'total',
				data: [chartData.text],
				itemStyle: {
					color: chartLegendColors.text
				},
				barCategoryGap: '0%',
				barWidth: '80px',
				emphasis: {
					disabled: true
				},
				cursor: 'default'
			},
			{
				name: 'data',
				type: 'bar',
				stack: 'total',
				data: [chartData.data],
				itemStyle: {
					color: chartLegendColors.data
				},
				barCategoryGap: '0%',
				barWidth: '80px',
				emphasis: {
					disabled: true
				},
				cursor: 'default'
			},
			{
				name: 'bss',
				type: 'bar',
				stack: 'total',
				data: [chartData.bss],
				itemStyle: {
					color: chartLegendColors.bss
				},
				barCategoryGap: '0%',
				barWidth: '80px',
				emphasis: {
					disabled: true
				},
				cursor: 'default'
			}
		]
	});

	return (
		<div className={styles.container}>
			<div className={styles.title}>
				<HeaderWithTooltip
					title={`${i10n?.title} ${transformBtoKB(totalSize, true)}`}
					i10n={i10n}
				/>
			</div>
			<div className={styles.chartWrapper}>
				<div className={styles.chartContainer}>
					<ReactECharts
						option={getOption()}
						style={{
							height: '100%',
							width: '180px'
						}}
					/>
					<div className={styles.legendContainer}>
						<ChartLegend data={legendData} />
					</div>
				</div>
			</div>
		</div>
	);
}
