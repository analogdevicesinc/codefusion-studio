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
import styles from './model-layers-table.module.scss';
import DownFilledArrow from '../../../../../common/icons/DownFilledArrow';
import DownArrow from '../../../../../common/icons/DownArrow';
import type {CfsAiProfilingOptimizationOpportunities} from 'cfs-types';
import type {FilterdLayerData} from '@ide-types/report-view-types';
import {getColumnAlias} from '@constants/report-viewer-db-columns';
import {
	Button,
	ContextMenu,
	DataGrid,
	DataGridCell,
	DataGridRow
} from 'cfs-react-library';
import {useCallback, useMemo, useState} from 'react';
import {formatToFixedOrFirstSignificant} from '../../../../../common/utils/string';
import {
	LayerRowDetail,
	type LayerRowDetailData
} from './layer-row-detail';
import type {ContextMenuProps} from '../../../../../../../../react-library/dist/src/components/context-menu/context-menu';

export type SortState = {
	sortedColumn: keyof FilterdLayerData['rows'][number];
	direction: 'asc' | 'desc';
};

type DataTableHeaderProps = {
	readonly columns: FilterdLayerData['columns'];
	readonly sortState: SortState | undefined;
	readonly setSortState: (sortState: SortState) => void;
};

type DataTableBodyProps = {
	readonly data: FilterdLayerData;
	readonly optimizations:
		| CfsAiProfilingOptimizationOpportunities
		| undefined;
	readonly setActiveSqlQuery: (query: string) => void;
	readonly sortState: SortState | undefined;
};

export function DataTableHeader({
	columns,
	sortState,
	setSortState
}: DataTableHeaderProps) {
	const showActions = columns.includes('layer_idx');
	const gridTemplateColumns = (
		showActions ? [...columns, 'actions'] : columns
	)
		.map((_, __, cols) => `${100.0 / cols.length}%`)
		.join(' ');

	return (
		<DataGrid
			className={styles.headerGrid}
			gridTemplateColumns={gridTemplateColumns}
		>
			<DataGridRow rowType='header' className={styles.headerRow}>
				{columns.map((col, i: number) => {
					const sorted =
						sortState && sortState.sortedColumn === col
							? sortState.direction
							: undefined;

					return (
						<DataGridCell
							key={col}
							gridColumn={(i + 1).toString()}
							cellType='columnheader'
							className={styles.headerCell}
						>
							<div
								className={`${styles['sortable-title']} ${
									styles[sorted ?? ''] ?? ''
								} `}
								onClick={() => {
									setSortState({
										sortedColumn:
											col as keyof FilterdLayerData['rows'][number],
										direction:
											sortState?.sortedColumn === col &&
											sortState?.direction === 'asc'
												? 'desc'
												: 'asc'
									});
								}}
							>
								<span title={getColumnAlias(col)}>
									{getColumnAlias(col)}
								</span>
								{sorted ? <DownFilledArrow /> : <DownArrow />}
							</div>
						</DataGridCell>
					);
				})}
				{showActions && (
					<DataGridCell
						gridColumn={(columns.length + 1).toString()}
						cellType='columnheader'
						className={styles.headerCell}
					/>
				)}
			</DataGridRow>
		</DataGrid>
	);
}

export function DataTableBody({
	data,
	optimizations,
	setActiveSqlQuery,
	sortState
}: DataTableBodyProps) {
	const [expandedRows, setExpandedRows] = useState<boolean[]>([]);
	const [contextMenuProps, setContextMenuProps] = useState<
		Omit<ContextMenuProps, 'onClose'>
	>({open: false, anchor: {x: 0, y: 0}, options: []});

	const sortedRows = useMemo(() => {
		if (!sortState) {
			return data.rows;
		}

		return sortRows(data.rows, sortState);
	}, [data.rows, sortState]);

	const showActions = data.columns.includes('layer_idx');
	const gridTemplateColumns = (
		showActions ? [...data.columns, 'actions'] : data.columns
	)
		.map((_, __, cols) => `${100.0 / cols.length}%`)
		.join(' ');
	const totalColumns = showActions
		? data.columns.length + 1
		: data.columns.length;

	const layerRowDetailDataRecord = useMemo(
		() => getLayerRowDetailDataRecord(optimizations),
		[optimizations]
	);

	const handleContextMenuOptionClick = useCallback(
		(col: string, val: any) => {
			const value = typeof val === 'string' ? `'${val}'` : val;
			setActiveSqlQuery(`Select * Where ${col}=${value}`);
		},
		[setActiveSqlQuery]
	);

	return (
		<>
			<DataGrid
				className={styles.bodyGrid}
				gridTemplateColumns={gridTemplateColumns}
			>
				{sortedRows.map((row, rowIndex) => (
					<DataGridRow
						// eslint-disable-next-line react/no-array-index-key
						key={`row-${rowIndex}`}
						rowType='default'
						dataTest={`layer-row-${rowIndex}`}
					>
						{data.columns.map((col, i: number) => {
							const value =
								row[col as keyof FilterdLayerData['rows'][number]];
							const isNumeric =
								col !== 'layer_idx' && typeof value === 'number';

							return (
								<DataGridCell
									key={col}
									gridColumn={(i + 1).toString()}
									className={`${styles.cell} ${
										isNumeric ? styles.numericCell : ''
									}`}
									onContextMenu={(
										e: React.MouseEvent<HTMLElement>
									) => {
										e.preventDefault();
										setContextMenuProps({
											open: true,
											anchor: {x: e.pageX, y: e.pageY},
											options: [
												{
													id: '1',
													label: `Filter by "${value}" in ${col}`,
													onClick() {
														handleContextMenuOptionClick(
															col as keyof FilterdLayerData['rows'][number],
															value
														);
													}
												}
											]
										});
									}}
								>
									{isNumeric
										? formatToFixedOrFirstSignificant(value)
										: (value?.toString() ?? '')}
								</DataGridCell>
							);
						})}
						{showActions && (
							<DataGridCell gridColumn={totalColumns.toString()}>
								<div className={styles.actionsCell}>
									{layerRowDetailDataRecord[row.layer_idx!] && (
										<Button
											appearance='icon'
											dataTest={`row-expand-button-${row.layer_idx}`}
											className={`${styles.expandButton} ${
												expandedRows[row.layer_idx!]
													? styles.expanded
													: ''
											}`}
											onClick={() => {
												const newExpandedRows = [...expandedRows];
												newExpandedRows[row.layer_idx!] =
													!newExpandedRows[row.layer_idx!];
												setExpandedRows(newExpandedRows);
											}}
										>
											<DownArrow />
										</Button>
									)}
								</div>
							</DataGridCell>
						)}
						{row.layer_idx !== undefined &&
							layerRowDetailDataRecord[row.layer_idx] &&
							expandedRows[row.layer_idx] && (
								<LayerRowDetail
									columns={totalColumns}
									data={layerRowDetailDataRecord[row.layer_idx]}
								/>
							)}
					</DataGridRow>
				))}
			</DataGrid>
			<ContextMenu
				{...contextMenuProps}
				onClose={() => {
					setContextMenuProps({
						...contextMenuProps,
						open: false
					});
				}}
			/>
		</>
	);
}

const sortFunctions: Record<string, (a: any, b: any) => number> = {
	string: (a: string, b: string) =>
		a.toString().localeCompare(b.toString()),
	number: (a: number, b: number) => a - b,
	boolean: (a: boolean, b: boolean) => Number(a) - Number(b)
};

function sortRows(
	rows: Array<FilterdLayerData['rows'][number]>,
	sortState: SortState
) {
	if (rows.length === 0) {
		return rows;
	}

	const column = sortState.sortedColumn;
	// Profiling reports can contain null values (e.g. for layers that failed analysis)
	const dataType = typeof rows.find(row => row[column] !== null)?.[
		column
	];
	const sortFunction = sortFunctions[dataType];

	if (!sortFunction) {
		console.warn(
			`No sort function for data type: ${dataType}. Returning unsorted rows.`
		);

		return rows;
	}

	return [...rows].sort((a, b) => {
		const aValue = a[column];
		const bValue = b[column];

		// Keep missing values at the end regardless of the sort direction
		if (aValue === null || aValue === undefined) {
			return bValue === null || bValue === undefined ? 0 : 1;
		}

		if (bValue === null || bValue === undefined) {
			return -1;
		}

		return sortState.direction === 'asc'
			? sortFunction(aValue, bValue)
			: sortFunction(bValue, aValue);
	});
}

function getLayerRowDetailDataRecord(
	optimizations: CfsAiProfilingOptimizationOpportunities | undefined
) {
	const record: Record<number, LayerRowDetailData> = {};

	if (!optimizations) return record;

	optimizations.layerwise_opportunities.forEach(opportunity => {
		record[opportunity.layer_index] = {
			...record[opportunity.layer_index],
			layerOpportunities: [
				...(record[opportunity.layer_index]?.layerOpportunities ??
					[]),
				opportunity
			]
		};
	});

	optimizations.macs_opportunities.forEach(opportunity => {
		record[opportunity.layer_index] = {
			...record[opportunity.layer_index],
			macsOpportunities: [
				...(record[opportunity.layer_index]?.macsOpportunities ?? []),
				opportunity
			]
		};
	});

	return record;
}
