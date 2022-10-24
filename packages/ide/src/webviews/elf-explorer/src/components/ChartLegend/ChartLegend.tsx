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
import styles from './ChartLegend.module.scss';
type ChartLegendProps = {
	readonly data: Record<string, string>;
	readonly direction?: 'row' | 'column';
};

export default function ChartLegend({
	data,
	direction = 'column'
}: ChartLegendProps) {
	return (
		<div
			className={`${styles.chartLegendWrapper} ${
				direction === 'row' ? styles.row : ''
			}`}
		>
			{Object.entries(data).map(([key, value]) => (
				<div key={key} className={styles.labelWrapper}>
					<div
						className={`${styles.legendDot} ${styles[key.toLowerCase()]}`}
					/>
					<div className={styles.legendLabel}>
						{key} {value}
					</div>
				</div>
			))}
		</div>
	);
}
