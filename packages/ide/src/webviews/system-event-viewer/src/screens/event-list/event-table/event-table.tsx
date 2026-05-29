/**
 *
 * Copyright (c) 2025 Analog Devices, Inc.
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

import {DataGrid, DataGridCell, DataGridRow} from 'cfs-react-library';
import type {TimestampList} from '../../../common/types/events';

import styles from './event-table.module.scss';

type EventTableProps = Readonly<{
	list: TimestampList;
}>;

export default function EventTable({list}: EventTableProps) {
	return (
		<div className={styles.evTableContainer}>
			<DataGrid
				className={styles.tableContent}
				ariaLabel='Event Table (List)'
				gridTemplateColumns='80px 100px 200px 300px 1fr'
			>
				<DataGridRow
					rowType='sticky-header'
					className={styles.header}
				>
					<DataGridCell
						key='0'
						cellType='columnheader'
						gridColumn='1'
						className={styles.centerContent}
					>
						Index
					</DataGridCell>
					<DataGridCell
						key='1'
						cellType='columnheader'
						gridColumn='2'
						className={styles.centerContent}
					>
						Timestamp
					</DataGridCell>
					<DataGridCell
						key='2'
						cellType='columnheader'
						gridColumn='3'
						className={styles.centerContent}
					>
						Source
					</DataGridCell>
					<DataGridCell
						key='3'
						cellType='columnheader'
						gridColumn='4'
						className={styles.centerContent}
					>
						Alias
					</DataGridCell>
					<DataGridCell
						key='4'
						cellType='columnheader'
						gridColumn='5'
						className={styles.centerContent}
					>
						Information
					</DataGridCell>
				</DataGridRow>

				{list.map((item, i) => (
					<DataGridRow
						key={String(item.id)}
						id={String(item.id)}
						className={styles.tableRow}
					>
						<DataGridCell key='0' gridColumn='1'>
							{i}
						</DataGridCell>
						<DataGridCell
							key='1'
							gridColumn='2'
							className={styles.rowCell}
						>
							{`${item.value}s`}
						</DataGridCell>
						<DataGridCell
							key='2'
							gridColumn='3'
							className={styles.rowCell}
						>
							{item.name}
						</DataGridCell>
						<DataGridCell
							key='3'
							gridColumn='4'
							className={styles.rowCell}
						>
							{item.alias}
						</DataGridCell>
						<DataGridCell
							key='4'
							gridColumn='5'
							className={styles.rowCell}
						>
							{item.description}
						</DataGridCell>
					</DataGridRow>
				))}
			</DataGrid>
		</div>
	);
}
