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

import type {TimelineGroupRow as GroupRowType} from '../../../../../common/types/events';
import styles from './timestamps-chart-row.module.scss';

type TimelineGroupRowProps = Readonly<{
	row: GroupRowType;
	index: number;
	handleRowStateChange: (update: {
		rowIndex: number;
		isHovered: boolean;
	}) => void;
}>;

export default function TimelineGroupRow({
	row,
	index,
	handleRowStateChange
}: TimelineGroupRowProps) {
	return (
		<div
			className={styles.chartContainer}
			data-row-id={row.id}
			data-row-index={index}
			data-test={`timeline-diagram:group-row:${row.id}`}
			onMouseEnter={() => {
				handleRowStateChange({
					rowIndex: index,
					isHovered: true
				});
			}}
			onMouseLeave={() => {
				handleRowStateChange({
					rowIndex: index,
					isHovered: false
				});
			}}
		>
			<div className={styles.offsetBlock} />
			<div className={styles.timestampsChartRow} />
			<div className={styles.offsetBlock} />
		</div>
	);
}
