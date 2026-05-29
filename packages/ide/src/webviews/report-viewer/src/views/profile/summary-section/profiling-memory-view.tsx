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
import styles from './profiling-memory-view.module.scss';
import {
	Bar,
	BarChart,
	CartesianGrid,
	ResponsiveContainer,
	XAxis,
	YAxis
} from 'recharts';
import {useLocaleContext} from '../../../../../common/contexts/LocaleContext';
import {formatToFixedOrFirstSignificant} from '../../../../../common/utils/string';
import {localizeMessage} from '../../../../../common/utils/localization';

export function ProfilingMemoryView({
	availableMemoryKb,
	modelMemoryKb,
	runTimeMemoryKb
}: {
	readonly availableMemoryKb: number;
	readonly modelMemoryKb: number;
	readonly runTimeMemoryKb: number;
}) {
	const l10n = useLocaleContext();
	const totalMemoryKb = Math.trunc(modelMemoryKb + runTimeMemoryKb);
	const legendPayload: LegendEntry[] = [
		{
			id: 'availableMemory',
			value: localizeMessage(
				l10n,
				'profiling.tableLegend.availableMemory',
				{
					value: availableMemoryKb.toString(10)
				}
			),
			type: 'line',
			color: '#89D185'
		},
		{
			id: 'modelMemory',
			value: localizeMessage(l10n, 'profiling.tableLegend.model', {
				value: formatToFixedOrFirstSignificant(modelMemoryKb, 2, 2)
			}),
			type: 'circle',
			color: '#3794FF'
		},
		{
			id: 'runTimeMemory',
			value: localizeMessage(
				l10n,
				'profiling.tableLegend.runtimeMemory',
				{
					value: runTimeMemoryKb.toString(10)
				}
			),
			type: 'circle',
			color: '#B180D7'
		}
	];

	return (
		<div className={styles.container}>
			<h4>{l10n?.profiling.estimatedRunTimePerformance}</h4>
			<ResponsiveContainer width='100%' height={50}>
				<BarChart
					title={l10n?.profiling.estimatedRunTimePerformance}
					layout='vertical'
					barGap={24}
					data={[
						{
							name: 'required',
							modelMemory: Math.trunc(modelMemoryKb),
							runTimeMemory: Math.trunc(runTimeMemoryKb)
						}
					]}
				>
					<XAxis
						type='number'
						axisLine={false}
						tickFormatter={(value: number) => `${value}kb`}
						domain={[0, Math.max(availableMemoryKb, totalMemoryKb)]}
					/>
					<YAxis dataKey='name' type='category' width={0} />
					<Bar
						dataKey='modelMemory'
						stackId='memory'
						fill='#3794FF'
						layout='vertical'
					/>
					<Bar
						dataKey='runTimeMemory'
						stackId='memory'
						fill='#B180D7'
						layout='vertical'
					/>
					<CartesianGrid
						strokeDasharray='3 3'
						horizontal={false}
						verticalValues={[availableMemoryKb]}
						stroke='#89D185'
						strokeWidth={2}
					/>
				</BarChart>
			</ResponsiveContainer>
			<CustomLegend payload={legendPayload} />
		</div>
	);
}

type LegendEntry = {
	readonly id: string;
	readonly value: string;
	readonly type: string;
	readonly color: string;
};

type CustomLegendProps = {
	readonly payload: LegendEntry[];
};

function CustomLegend({payload}: CustomLegendProps) {
	return (
		<div className={styles.legend}>
			{payload?.map(entry => (
				<div
					key={`legend-entry-${entry.id}`}
					className={styles.entry}
				>
					<div className={styles.iconContainer}>
						{entry.id === 'availableMemory' ? (
							// Custom dashed line for Available Memory
							<svg width={14} height={16}>
								<line
									x1={7}
									y1={0}
									x2={7}
									y2={16}
									stroke={entry.color}
									strokeWidth={1.75}
									strokeDasharray='4 4'
								/>
							</svg>
						) : (
							// Circle for other entries
							<svg width={6} height={6}>
								<circle cx={3} cy={3} r={3} fill={entry.color} />
							</svg>
						)}
					</div>
					<span className={styles.label}>{entry.value}</span>
				</div>
			))}
		</div>
	);
}
