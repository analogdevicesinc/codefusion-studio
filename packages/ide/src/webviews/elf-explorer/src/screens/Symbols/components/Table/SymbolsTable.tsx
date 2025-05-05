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
import {useState, useCallback, memo, useEffect, useRef} from 'react';

import ElfTableHeaderCell from '../../../../components/ElfTableHeaderCell/ElfTableHeaderCell';
import ContextMenuPanel from '../../../../components/ContextMenu/Panel/ContextMenuPanel';
import HelpOptionModal from '../../../../components/HelpOptionModal/HelpOptionModal';
import SectionNameWithCircle from '../../../../components/SectionNameWithCircle/SectionNameWithCircle';
import NameCellTooltip from './NameCellTooltip';
import sortData from '../../../../utils/sorting-utils';

import {
	extractPositionFromPath,
	formatPath,
	displayColumnAndValue,
	setRightAlign,
	setRelative,
	setRightAlignForHeader,
	displayValue,
	splitStringByFirstSpace,
	setFlagsForStack
} from '../../../../utils/symbols-utils';
import type {TSymbol} from '../../../../common/types/symbols';
import type {TSavedTableOptions} from '../../../../common/types/memory-layout';
import type {TLocaleContext} from '../../../../common/types/context';

import {CONTEXT_MENU_SYMOLS_OPTIONS as MENU_OPTIONS} from '../../../../common/constants/symbols';
import {useLocaleContext} from '@common/contexts/LocaleContext';
import {
	computeSymbolSizes,
	getColumns
} from '../../../../utils/table-utils';
import {
	goToSourceCode,
	checkPath
} from '../../../../utils/extension-utils';
import {capitalizeWord} from '@common/utils/string';

import {SYMBOL_COLUMNS} from '../../../../common/types/symbols';
import type {TContextMenuOption} from '../../../../common/types/generic';

import styles from './SymbolsTable.module.scss';
import {DataGrid, DataGridCell, DataGridRow} from 'cfs-react-library';

const HELP_OPTION_COLUMNS = [
	SYMBOL_COLUMNS.TYPE,
	SYMBOL_COLUMNS.LOCALSTACK,
	SYMBOL_COLUMNS.BIND,
	SYMBOL_COLUMNS.VISIBILITY,
	SYMBOL_COLUMNS.PATH
];

type TSymbolsTableProps = {
	readonly data: TSymbol[];
	readonly savedOptions: TSavedTableOptions;
	readonly onUpdateOptions: (newOptions: TSavedTableOptions) => void;
	readonly emitValToFilter: (column: string, value: string) => void;
};

function SymbolsTable({
	data,
	savedOptions,
	onUpdateOptions,
	emitValToFilter
}: TSymbolsTableProps) {
	const itemsPerPage = 100;
	const i10n: TLocaleContext | undefined =
		useLocaleContext()?.symbols?.helpModal;
	const [clonedData, setClonedData] = useState<TSymbol[]>(
		JSON.parse(JSON.stringify(data)) as TSymbol[]
	);
	// Symbols that are displayed
	const [symbols, setSymbols] = useState(data.slice(0, itemsPerPage));
	const [nextIndex, setNextIndex] = useState(itemsPerPage);
	const [sortBy, setSortBy] = useState<Record<string, any>>({
		id: 'asc'
	});

	const [contextMenuVisible, setContextMenuVisible] = useState(false);
	const [contextMenuPosition, setContextMenuPosition] = useState<{
		x: number;
		y: number;
	}>({x: 0, y: 0});
	const [helpOptionModal, setHelpOptionModal] = useState<{
		isVisible: boolean;
		item: string;
	}>({
		isVisible: false,
		item: ''
	});
	const [path, setPath] = useState('');
	const [menuOptions, setMenuOptions] = useState(MENU_OPTIONS);
	const [clickedCol, setClickedCol] = useState<string>('');
	// eslint-disable-next-line @typescript-eslint/ban-types
	const observer = useRef<IntersectionObserver | null>(null);
	const lastItemRef = useRef<any>(null);

	const columns: Array<`${SYMBOL_COLUMNS}` | string> =
		getColumns(data);

	const headerColumns = columns.filter(
		column =>
			column !== (SYMBOL_COLUMNS.RECURSIVE as typeof column) &&
			column !== (SYMBOL_COLUMNS.BUCKET as typeof column) &&
			column !== `${SYMBOL_COLUMNS.DEMANGLED}` &&
			column !== `${SYMBOL_COLUMNS.STACKDEPTH}`
	);

	const onSortColumn = useCallback(
		(field: string) => {
			const newSortBy = {
				[field]: sortBy?.[field] === 'asc' ? 'desc' : 'asc'
			};
			setSortBy(() => newSortBy);

			const sortedData = sortData(clonedData, newSortBy);
			setClonedData(() => [...sortedData]);

			const newItems = sortedData.slice(0, nextIndex);
			setSymbols(() => [...newItems]);
		},
		[clonedData, nextIndex, sortBy]
	);

	const loadMoreSymbols = useCallback(() => {
		const newItems = clonedData.slice(
			nextIndex,
			nextIndex + itemsPerPage
		);
		setSymbols(prevItems => [...prevItems, ...newItems]);
		setNextIndex(nextIndex + itemsPerPage);
	}, [clonedData, nextIndex]);

	useEffect(() => {
		if (symbols.length === data.length) return;

		if (observer.current) observer.current.disconnect();

		observer.current = new IntersectionObserver(entries => {
			if (entries[0].isIntersecting) {
				loadMoreSymbols();
			}
		});

		if (lastItemRef.current)
			// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
			observer.current.observe(lastItemRef.current);
	}, [data, lastItemRef, loadMoreSymbols, symbols]);

	const goToSourceCodeCallback = useCallback(
		async (path: string, position: number[]) => {
			await goToSourceCode(path, position);
		},
		[]
	);

	const checkPathCallback = useCallback(async (path: string) => {
		const isPath = await checkPath(path);

		setMenuOptions((prevOptions: TContextMenuOption[]) => {
			const newOptions = [...prevOptions];

			if (!isPath) {
				newOptions[1].show = false;
			}

			return newOptions;
		});
	}, []);

	const handleOptionClick = (elem: HTMLElement) => {
		// Option 1
		const filterBy = elem?.innerText?.includes('Filter by ');
		// Option 3
		const showModal = elem?.innerText?.includes('Help - ');
		// Option 2
		const goToSource = elem?.innerText?.includes('source code');
		// Option 4
		const formatValue = elem?.innerText?.includes('Show column as');

		setContextMenuVisible(false);

		if (filterBy) {
			let [column, value] = splitStringByFirstSpace(
				elem?.innerText?.substring(10)
			);

			value =
				column === (SYMBOL_COLUMNS.PATH as typeof column) && path
					? path
					: value?.trim()?.slice(1, -1);

			emitValToFilter(column, value);
		}

		if (showModal) {
			setHelpOptionModal(prev => ({
				...prev,
				isVisible: true,
				item: elem?.innerText.split(' - ')[1] || ''
			}));
		}

		if (goToSource) {
			const pos = extractPositionFromPath(path);
			void goToSourceCodeCallback(formatPath(path), pos as number[]);
		}

		if (formatValue) {
			const clonedSavedOptions = JSON.parse(
				JSON.stringify(savedOptions)
			);
			clonedSavedOptions.symbols[clickedCol] =
				clonedSavedOptions?.symbols?.[clickedCol] === 'dec'
					? 'hex'
					: 'dec';

			onUpdateOptions(clonedSavedOptions as TSavedTableOptions);
		}
	};

	const handleContextMenu = (
		e: React.MouseEvent<HTMLElement>,
		filteredLabel: string,
		row: TSymbol
	) => {
		e.preventDefault();

		const [column] = splitStringByFirstSpace(
			filteredLabel
		) as Array<`${SYMBOL_COLUMNS}`>;

		setClickedCol(column);

		if (row.path) {
			MENU_OPTIONS[1].show = true;
			setPath(row.path as string);
			void checkPathCallback(formatPath(row.path as string));
		} else {
			// Hide option if the symbol has no value for path
			MENU_OPTIONS[1].show = false;
		}

		setMenuOptions(prevOptions => {
			const newOptions = [...prevOptions];
			newOptions[0].label = `Filter by ${displayColumnAndValue(
				filteredLabel,
				savedOptions
			)} `;

			if (
				column === (SYMBOL_COLUMNS.PATH as typeof column) &&
				!row.path
			) {
				newOptions[0].show = false;
			} else {
				newOptions[0].show = true;
			}

			// Hide "Help" option
			newOptions[2].show = false;
			// Hide "Show column as" option
			newOptions[3].show = false;

			HELP_OPTION_COLUMNS.forEach(columnName => {
				if (columnName === (column as SYMBOL_COLUMNS)) {
					newOptions[2].show = true;
					newOptions[2].label = `Help - ${capitalizeWord(column)}`;
				}
			});

			if (
				column === SYMBOL_COLUMNS.ADDRESS ||
				column === SYMBOL_COLUMNS.SIZE ||
				column === SYMBOL_COLUMNS.LOCALSTACK ||
				column === SYMBOL_COLUMNS.STACK
			) {
				newOptions[3].show = true;
				newOptions[3].label =
					savedOptions.symbols[column] === 'hex'
						? 'Show column as decimal'
						: 'Show column as hexadecimal';
			}

			return newOptions;
		});

		setContextMenuPosition({x: e.clientX, y: e.clientY});
		setContextMenuVisible(true);
	};

	const closeContextMenu = () => {
		setContextMenuVisible(false);
	};

	return (
		<>
			<div
				className={styles['symbol-table-container']}
				id='symbols-table-container'
			>
				<DataGrid
					className={styles.table}
					ariaLabel='Symbols'
					gridTemplateColumns={computeSymbolSizes(
						headerColumns as Array<`${SYMBOL_COLUMNS}`>
					)}
				>
					<DataGridRow
						rowType='sticky-header'
						className={styles['sticky-grid-header']}
					>
						{headerColumns.map((column: string) => (
							<DataGridCell
								key={column}
								cellType='columnheader'
								gridColumn={String(headerColumns.indexOf(column) + 1)}
								className={setRelative(
									column as SYMBOL_COLUMNS,
									styles as Record<string, string>
								)}
							>
								<ElfTableHeaderCell
									dir={sortBy[column]}
									column={column}
									label={column}
									alignRight={setRightAlignForHeader(
										column as SYMBOL_COLUMNS
									)}
									onSort={onSortColumn}
								/>
							</DataGridCell>
						))}
					</DataGridRow>

					{symbols.map(row => (
						<DataGridRow ref={lastItemRef} key={row.id}>
							{headerColumns.map((column, index) => (
								<DataGridCell
									key={`${row.id}-${column}`}
									title={displayValue(
										column as SYMBOL_COLUMNS,
										row,
										savedOptions
									)}
									gridColumn={String(index + 1)}
									className={`${setRightAlign(
										column as SYMBOL_COLUMNS,
										styles as Record<string, string>
									)} ${styles.makeItElipsis}`}
									onContextMenu={(
										e: React.MouseEvent<HTMLElement>
									) => {
										handleContextMenu(
											e,
											`${column} '${row[column]}'`,
											row
										);
									}}
								>
									{(column as SYMBOL_COLUMNS) ===
										SYMBOL_COLUMNS.NAME && (
										<NameCellTooltip
											id={row.id}
											value={row[column]}
											demangled={row?.demangled}
										/>
									)}
									{(column as SYMBOL_COLUMNS) ===
										SYMBOL_COLUMNS.SECTION && (
										<SectionNameWithCircle
											value={row.section}
											bucket={row.bucket}
										/>
									)}
									{(column as SYMBOL_COLUMNS) ===
										SYMBOL_COLUMNS.STACK && (
										<span>{setFlagsForStack(row)}</span>
									)}
									{displayValue(
										column as SYMBOL_COLUMNS,
										row,
										savedOptions
									)}
								</DataGridCell>
							))}
						</DataGridRow>
					))}
				</DataGrid>
				<DataGridRow className={styles['sticky-grid-footer']}>
					<strong>{`${data.length} Symbols`}</strong>
				</DataGridRow>
			</div>
			<ContextMenuPanel
				isVisible={contextMenuVisible}
				x={contextMenuPosition.x}
				y={contextMenuPosition.y}
				options={menuOptions}
				handleOptionClick={handleOptionClick}
				closeMenu={closeContextMenu}
			/>
			{helpOptionModal.isVisible && (
				<HelpOptionModal
					state={helpOptionModal}
					i10n={i10n}
					onModalClose={() => {
						setHelpOptionModal(prev => ({
							...prev,
							isVisible: false,
							item: ''
						}));
					}}
				/>
			)}
		</>
	);
}

export default memo(SymbolsTable);
