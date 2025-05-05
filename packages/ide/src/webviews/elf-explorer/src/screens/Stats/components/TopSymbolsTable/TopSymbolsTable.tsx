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
import {useCallback, useMemo, useState} from 'react';
import type {TSymbol} from '../../../../common/types/symbols';
import type {TSavedTableOptions} from '../../../../common/types/memory-layout';
import styles from './TopSymbolsTable.module.scss';
import {getColumns} from '../../../../utils/table-utils';
import {capitalizeWord} from '@common/utils/string';
import {formatSize} from '../../../../utils/stats-utils';
import ContextMenuPanel from '../../../../components/ContextMenu/Panel/ContextMenuPanel';
import SectionNameWithCircle from '../../../../components/SectionNameWithCircle/SectionNameWithCircle';

import {
	CONTEXT_MENU_STATISTICS_OPTIONS as MENU_OPTIONS,
	GO_TO_SOURCE_CODE
} from '../../../../common/constants/statistics';
import ElfTableHeaderCell from '../../../../components/ElfTableHeaderCell/ElfTableHeaderCell';
import sortData from '../../../../utils/sorting-utils';
import {convertDecimalToHex} from '../../../../utils/number';

import {
	extractPositionFromPath,
	formatPath
} from '../../../../utils/symbols-utils';
import {
	checkPath,
	goToSourceCode
} from '../../../../utils/extension-utils';
import {DataGrid, DataGridCell, DataGridRow} from 'cfs-react-library';

type TopSymbolsTableProps = {
	readonly data: TSymbol[];
	readonly savedOptions: TSavedTableOptions;
	readonly onUpdateOptions: (newOption: TSavedTableOptions) => void;
};

export default function TopSymbolsTable({
	data,
	savedOptions,
	onUpdateOptions
}: TopSymbolsTableProps) {
	const columns: string[] = getColumns(data);
	const [contextMenuVisible, setContextMenuVisible] = useState(false);
	const [contextMenuPosition, setContextMenuPosition] = useState<{
		x: number;
		y: number;
	}>({x: 0, y: 0});
	const [clickedCol, setClickedCol] = useState<string>('');
	const [clickedSymbol, setClickedSymbol] = useState<
		TSymbol | undefined
	>(undefined);
	const [highlightedRow, setHighlightedRow] = useState<
		number | undefined
	>(undefined);
	const [sortBy, setSortBy] = useState<Record<string, any>>({
		size: 'desc'
	});

	const sortedData = useMemo(
		() => sortData(data, sortBy),
		[data, sortBy]
	);

	const handleOptionClick = (elem: HTMLElement) => {
		setContextMenuVisible(false);
		// Option 2
		const isOptionFormat =
			elem?.innerText?.includes('Show column as');
		const isOptionGoToSourceCode =
			elem?.innerText?.includes(GO_TO_SOURCE_CODE);
		const currentOption = savedOptions?.stats?.largestSym;

		if (isOptionFormat && currentOption && clickedCol === 'size') {
			const clonedSavedOptions = JSON.parse(
				JSON.stringify(savedOptions)
			);
			clonedSavedOptions.stats.largestSym =
				currentOption === 'dec' ? 'hex' : 'dec';

			onUpdateOptions(clonedSavedOptions as TSavedTableOptions);
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

	const handleContextMenu = (
		e: React.MouseEvent<HTMLElement>,
		rowIndex: number,
		column: 'name' | 'section' | 'size'
	) => {
		e.preventDefault();
		setContextMenuPosition({x: e.clientX, y: e.clientY});

		setHighlightedRow(rowIndex);
		setClickedCol(column);

		const clonedSymbol: TSymbol = JSON.parse(
			JSON.stringify(sortedData[rowIndex])
		);

		if (column === 'name' || column === 'section')
			MENU_OPTIONS.splice(1, 1);

		if (column === 'size') {
			setContextMenuVisible(true);
			MENU_OPTIONS[1] = {
				id: 1,
				label:
					savedOptions.stats.largestSym === 'dec'
						? 'Show column as hexadecimal'
						: 'Show column as decimal',
				show: true
			};

			return;
		}

		if (clonedSymbol.path) {
			void checkPathCallback(
				formatPath(clonedSymbol.path as string),
				clonedSymbol
			);
		} else {
			// Hide option if the symbol has no value for path
			MENU_OPTIONS[0].show = false;
			setContextMenuVisible(false);
		}
	};

	const checkPathCallback = useCallback(
		async (path: string, symbol: TSymbol) => {
			const isPath = await checkPath(path);

			if (isPath) {
				MENU_OPTIONS[0].show = true;
				setContextMenuVisible(true);
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
		setContextMenuVisible(false);
		setHighlightedRow(undefined);
	};

	const onSortColumn = useCallback((field: string) => {
		setSortBy((prev: any) => ({
			[field]: prev?.[field] === 'asc' ? 'desc' : 'asc'
		}));
	}, []);

	const displaySizeContent = (size: number) => {
		if (savedOptions.stats.largestSym === 'hex')
			return convertDecimalToHex(size);

		return formatSize(size);
	};

	return (
		<>
			<DataGrid
				ariaLabel='Top Symbols Table'
				className={`${styles.table} ${styles.topTable}`}
				gridTemplateColumns='9fr 1fr 1fr 80px 2fr'
			>
				<DataGridRow rowType='header'>
					{columns.includes('name') && (
						<DataGridCell cellType='columnheader' gridColumn='1 / 3'>
							<ElfTableHeaderCell
								dir={sortBy.name}
								column='name'
								label={capitalizeWord('name')}
								onSort={onSortColumn}
							/>
						</DataGridCell>
					)}
					{columns.includes('section') && (
						<DataGridCell cellType='columnheader' gridColumn='3 / 5'>
							<ElfTableHeaderCell
								dir={sortBy.section}
								column='section'
								label={capitalizeWord('section')}
								onSort={onSortColumn}
							/>
						</DataGridCell>
					)}
					{columns.includes('size') && (
						<DataGridCell
							cellType='columnheader'
							gridColumn='5 / 7'
							className={styles['right-align']}
						>
							<ElfTableHeaderCell
								dir={sortBy.size}
								column='size'
								label={capitalizeWord('size')}
								onSort={onSortColumn}
							/>
						</DataGridCell>
					)}
				</DataGridRow>
				{sortedData.map((row, index) => (
					<DataGridRow
						key={row.id}
						className={
							highlightedRow === index ? styles.highlightedRow : ''
						}
					>
						{columns.includes('name') && (
							<DataGridCell
								gridColumn='1 / 3'
								onContextMenu={(e: React.MouseEvent<HTMLElement>) => {
									handleContextMenu(e, index, 'name');
								}}
							>
								<div className={styles.ellipsis}>{row.name}</div>
							</DataGridCell>
						)}
						{columns.includes('section') && (
							<DataGridCell
								gridColumn='3 / 5'
								className={styles.cancelHighlight}
								onContextMenu={(e: React.MouseEvent<HTMLElement>) => {
									handleContextMenu(e, index, 'section');
								}}
							>
								<SectionNameWithCircle
									value={row.section}
									bucket={row.bucket}
								/>
							</DataGridCell>
						)}
						{columns.includes('size') && (
							<DataGridCell
								gridColumn='5 / 7'
								className={styles['right-align']}
								onContextMenu={(e: React.MouseEvent<HTMLElement>) => {
									handleContextMenu(e, index, 'size');
								}}
							>
								{displaySizeContent(row.size as number)}
							</DataGridCell>
						)}
					</DataGridRow>
				))}
			</DataGrid>
			<ContextMenuPanel
				isVisible={contextMenuVisible}
				x={contextMenuPosition.x}
				y={contextMenuPosition.y}
				options={MENU_OPTIONS}
				handleOptionClick={handleOptionClick}
				closeMenu={closeContextMenu}
			/>
		</>
	);
}
