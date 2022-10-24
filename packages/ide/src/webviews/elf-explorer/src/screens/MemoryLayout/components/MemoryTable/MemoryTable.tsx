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
/* eslint-disable @typescript-eslint/no-unsafe-enum-comparison */
import {memo, useCallback, useMemo, useState} from 'react';
import {
	VSCodeDataGrid,
	VSCodeDataGridRow,
	VSCodeDataGridCell
} from '@vscode/webview-ui-toolkit/react';
import {
	camelCaseToSpaces,
	capitalizeWord
} from '../../../../utils/string';
import styles from './MemoryTable.module.scss';

import type {
	TSegment,
	TSection,
	TSavedTableOptions
} from '../../../../common/types/memory-layout';
import {updateSavedOptionsForTableFormat} from '../../../../common/api';

import type {TSymbol} from '../../../../common/types/symbols';
import type {TContextMenuOption} from '../../../../common/types/generic';
import ElfTableHeaderCell from '../../../../components/ElfTableHeaderCell/ElfTableHeaderCell';
import sortData from '../../../../utils/sorting-utils';
import {formatSize} from '../../../../utils/stats-utils';
import {
	getColumnSizes,
	getColumns,
	getOrder
} from '../../../../utils/table-utils';

import {COLUMNS} from '../../../../common/types/memory-layout';
import ContextMenuPanel from '../../../../components/ContextMenu/Panel/ContextMenuPanel';
import {convertDecimalToHex} from '../../../../utils/number';
import {GO_TO_SOURCE_CODE} from '../../../../common/constants/statistics';
import {
	checkPath,
	goToSourceCode
} from '../../../../utils/extension-utils';
import {
	extractPositionFromPath,
	formatPath
} from '../../../../utils/symbols-utils';

const MENU_OPTIONS: TContextMenuOption[] = [
	{
		id: 0,
		label: GO_TO_SOURCE_CODE,
		show: false
	},
	{
		id: 1,
		label: '',
		show: false
	}
];

type TMemoryTableProps = {
	readonly data: TSegment[] | TSection[] | TSymbol[];
	readonly layer: number;
	readonly savedOptions: any;
	readonly onClickHandler: (
		data: TSegment | TSection | TSymbol
	) => void;
	readonly onHover: (
		data: TSymbol,
		source: 'MemoryTable' | 'MemoryVisual'
	) => void;
	readonly onMouseLeave: () => void;
	readonly onChangeTableFormat: (updatedOptions: any) => void;
	readonly hoveredItem: TSegment | TSection | TSymbol | undefined;
	readonly hoverSource: 'MemoryTable' | 'MemoryVisual' | undefined;
};

function MemoryTable({
	data,
	layer,
	savedOptions,
	onClickHandler,
	onHover,
	onMouseLeave,
	onChangeTableFormat,
	hoveredItem,
	hoverSource
}: TMemoryTableProps) {
	const [sortBy, setSortBy] = useState<Record<string, any>>({
		id: 'asc'
	});

	const columns: string[] = getColumns(data);
	const filteredOutColumns = getOrder(layer);

	const [isMenuVisible, setIsMenuVisible] = useState(false);
	const [contextMenuPosition, setContextMenuPosition] = useState<{
		x: number;
		y: number;
	}>({x: 0, y: 0});
	const [menuOptions, setMenuOptions] = useState(MENU_OPTIONS);
	const [clickedCol, setClickedCol] = useState<string>('');
	const [clickedSymbol, setClickedSymbol] = useState<
		TSymbol | undefined
	>(undefined);

	const updateSavedOptions = (newOptions: TSavedTableOptions) => {
		updateSavedOptionsForTableFormat(newOptions)
			.then((response: TSavedTableOptions) => {
				onChangeTableFormat(response);
			})
			.catch((err: string) => {
				console.error(err);
				throw new Error(err);
			});
	};

	const onSortColumn = useCallback((field: string) => {
		setSortBy((prev: any) => ({
			[field]: prev?.[field] === 'asc' ? 'desc' : 'asc'
		}));
	}, []);

	const sortedData = useMemo(
		() => sortData(data, sortBy),
		[data, sortBy]
	);

	const handleContextMenu = (
		event: React.MouseEvent<HTMLElement>,
		column: string,
		index: number
	) => {
		MENU_OPTIONS[0].show = false;
		MENU_OPTIONS[1].show = false;
		event.preventDefault();
		setContextMenuPosition({
			x: event.clientX,
			y: event.clientY
		});
		setClickedCol(column);

		if (layer === 3) {
			const clonedSymbol: TSymbol = JSON.parse(
				JSON.stringify(sortedData[index])
			);

			if (clonedSymbol.path) {
				void checkPathCallback(
					formatPath(clonedSymbol.path as string),
					clonedSymbol
				);
			}
		}

		if (column === COLUMNS.ADDRESS || column === COLUMNS.SIZE) {
			MENU_OPTIONS[1].show = true;
			MENU_OPTIONS[1].label =
				savedOptions?.memory?.[layer]?.[column] === 'dec'
					? 'Show column as hexadecimal'
					: 'Show column as decimal';

			setIsMenuVisible(true);
			setMenuOptions(MENU_OPTIONS);
		}
	};

	const handleOptionClick = (elem: HTMLElement) => {
		closeContextMenu();

		const isOptionFormat =
			elem?.innerText?.includes('Show column as');
		const isOptionGoToSourceCode =
			elem?.innerText?.includes(GO_TO_SOURCE_CODE);
		const currentOption = savedOptions?.memory?.[layer]?.[clickedCol];

		if (isOptionFormat && currentOption) {
			const clonedSavedOptions = JSON.parse(
				JSON.stringify(savedOptions)
			);

			clonedSavedOptions.memory[layer][clickedCol] =
				currentOption === 'dec' ? 'hex' : 'dec';

			updateSavedOptions(clonedSavedOptions as TSavedTableOptions);
		}

		if (isOptionGoToSourceCode) {
			const pos = extractPositionFromPath(
				(clickedSymbol?.path as string) || ''
			);
			void goToSourceCodeCallback(
				formatPath((clickedSymbol?.path as string) || ''),
				pos as number[]
			);
		}
	};

	const checkPathCallback = useCallback(
		async (path: string, symbol: TSymbol) => {
			const isPath = await checkPath(path);

			if (isPath) {
				MENU_OPTIONS[0].show = true;
				setIsMenuVisible(true);
				setClickedSymbol(symbol);
			} else {
				MENU_OPTIONS[0].show = false;
			}
		},
		[]
	);

	const goToSourceCodeCallback = useCallback(
		async (path: string, position: number[]) => {
			await goToSourceCode(path, position);
		},
		[]
	);

	const closeContextMenu = () => {
		setIsMenuVisible(false);
	};

	const displayContent = (
		column: keyof TSegment | keyof TSection | keyof TSymbol,
		row: Record<string, any> // TSegment | TSection | TSymbol
	) => {
		if (column === COLUMNS.TYPE)
			return <span className={styles.ellipsis}>{row[column]}</span>;

		if (column === COLUMNS.ADDRESS) {
			if (
				savedOptions?.memory?.[layer]?.[COLUMNS.ADDRESS] === 'hex'
			) {
				return row[column];
			}

			return parseInt(row[column] as string, 16);
		}

		if (column === COLUMNS.SIZE) {
			if (savedOptions?.memory?.[layer]?.[COLUMNS.SIZE] === 'dec') {
				return formatSize(row[column] as number);
			}

			return convertDecimalToHex(Number(row[column]));
		}

		return row[column];
	};

	const setRightAlignToDecColumns = (column: string) => {
		if (
			column === COLUMNS.SIZE &&
			savedOptions.memory[layer][column] === 'dec'
		)
			return styles['right-align'];

		if (
			column === COLUMNS.ADDRESS &&
			savedOptions.memory[layer][column] === 'dec'
		)
			return styles['right-align'];
		if (column === COLUMNS.ALIGN) return styles['right-align'];

		return '';
	};

	const setRightAlignToDecValues = (column: string) => {
		if (
			column === COLUMNS.SIZE &&
			savedOptions.memory[layer][column] === 'dec'
		)
			return styles['right-align'];

		if (
			column === COLUMNS.ADDRESS &&
			savedOptions.memory[layer][column] === 'dec'
		)
			return `${styles['right-align']} ${styles['cell-ellipsis']}`;

		if (column === COLUMNS.ALIGN) return styles['right-align'];
		if (column === COLUMNS.TYPE) return styles['cell-ellipsis'];
		if (column === COLUMNS.VISIBILITY) return styles['cell-ellipsis'];
		if (column === COLUMNS.NAME) return styles['cell-ellipsis'];

		return '';
	};

	return (
		<>
			<div className={styles['footer-container']}>
				<VSCodeDataGrid
					aria-label='Memory Table'
					className={`table-styles ${styles['min-height']} ${styles['highligh-table']}`}
					grid-template-columns={getColumnSizes(layer)}
				>
					<VSCodeDataGridRow row-type='header'>
						{filteredOutColumns.map((column: string, index) => (
							<VSCodeDataGridCell
								key={column}
								cell-type='columnheader'
								grid-column={index + 1}
								className={setRightAlignToDecColumns(column)}
							>
								<ElfTableHeaderCell
									dir={sortBy[column]}
									column={column}
									label={capitalizeWord(
										camelCaseToSpaces(
											layer === 2 && column === 'id' ? 'num' : column
										)
									)}
									onSort={onSortColumn}
								/>
							</VSCodeDataGridCell>
						))}
					</VSCodeDataGridRow>
					{sortedData.map((row, rowIndex) => {
						// Check if any column in the row is an object
						const hasNextLayer = columns.some(
							column => typeof row[column] === 'object'
						);

						return (
							<VSCodeDataGridRow
								key={row.id}
								className={`${
									hasNextLayer
										? styles.enabledRow
										: styles.disabledRow
								} ${
									row.id === hoveredItem?.id &&
									hoverSource === 'MemoryVisual'
										? styles.highlight
										: ''
								}`}
								onClick={() => {
									if (hasNextLayer) {
										onClickHandler(
											row as TSegment | TSection | TSymbol
										);
									}
								}}
								onMouseEnter={() => {
									onHover(row, 'MemoryTable');
								}}
								onMouseLeave={onMouseLeave}
							>
								{filteredOutColumns.map((column, index: number) => (
									<VSCodeDataGridCell
										key={`${row.id}-${column}`}
										title={displayContent(column, row)}
										grid-column={index + 1}
										className={setRightAlignToDecValues(column)}
										onContextMenu={event => {
											handleContextMenu(event, column, rowIndex);
										}}
									>
										{displayContent(column, row)}
									</VSCodeDataGridCell>
								))}
							</VSCodeDataGridRow>
						);
					})}
				</VSCodeDataGrid>
				<VSCodeDataGridRow className={styles['sticky-grid-footer']}>
					<>
						<strong>{sortedData.length}</strong>
						{layer === 1
							? ' Segments'
							: layer === 2
								? ' Sections'
								: ' Symbols'}
					</>
				</VSCodeDataGridRow>
			</div>

			<ContextMenuPanel
				isVisible={isMenuVisible}
				x={contextMenuPosition.x}
				y={contextMenuPosition.y}
				options={menuOptions}
				handleOptionClick={handleOptionClick}
				closeMenu={closeContextMenu}
			/>
		</>
	);
}

export default memo(MemoryTable);
