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
import {
	VSCodeDataGrid,
	VSCodeDataGridRow,
	VSCodeDataGridCell
} from '@vscode/webview-ui-toolkit/react';
import type {
	TSavedTableOptions,
	TSection
} from '../../../../common/types/memory-layout';
import {capitalizeWord} from '../../../../utils/string';
import {getColumns} from '../../../../utils/table-utils';
import {
	countElementsByType,
	formatSize
} from '../../../../utils/stats-utils';
import ElfTableHeaderCell from '../../../../components/ElfTableHeaderCell/ElfTableHeaderCell';
import ContextMenuPanel from '../../../../components/ContextMenu/Panel/ContextMenuPanel';
import HeaderWithTooltip from '../../../../components/HeaderWithTooltip/HeaderWithTooltip';
import SectionNameWithCircle from '../../../../components/SectionNameWithCircle/SectionNameWithCircle';

import {useLocaleContext} from '@common/contexts/LocaleContext';
import sortData from '../../../../utils/sorting-utils';
import type {TLocaleContext} from '../../../../common/types/context';
import type {TContextMenuOption} from '../../../../common/types/generic';

import styles from './SectionsTable.module.scss';
import {convertDecimalToHex} from '../../../../utils/number';

const MENU_OPTIONS: TContextMenuOption[] = [
	{
		id: 0,
		label: '',
		show: true
	}
];

type TSectionsTableProps = {
	readonly sections: TSection[];
	readonly savedOptions: TSavedTableOptions;
	readonly onUpdateOptions: (newOptions: TSavedTableOptions) => void;
};

export default function SectionsTable({
	sections,
	savedOptions,
	onUpdateOptions
}: TSectionsTableProps) {
	const [sortBy, setSortBy] = useState<Record<string, any>>({
		id: 'asc'
	});
	const columns: string[] = getColumns(sections);
	const i10n: TLocaleContext | undefined =
		useLocaleContext()?.stats?.sections;
	const [isMenuVisible, setIsMenuVisible] = useState(false);
	const [contextMenuPosition, setContextMenuPosition] = useState<{
		x: number;
		y: number;
	}>({x: 0, y: 0});

	const onSortColumn = useCallback((field: string) => {
		setSortBy((prev: any) => ({
			[field]: prev?.[field] === 'asc' ? 'desc' : 'asc'
		}));
	}, []);

	const parsedSections = sections.map(section => ({
		id: section.id,
		bucket: section.bucket,
		name: section.name,
		size: section.size,
		functions: countElementsByType(section.symbols, 'FUNC'),
		variables: countElementsByType(section.symbols, 'OBJECT')
	}));

	const sortedSections = useMemo(
		() => sortData(parsedSections, sortBy),
		[parsedSections, sortBy]
	);

	const handleContextMenu = (
		event: React.MouseEvent<HTMLElement>
	) => {
		event.preventDefault();
		setContextMenuPosition({x: event.clientX, y: event.clientY});
		setIsMenuVisible(true);

		MENU_OPTIONS[0].label =
			savedOptions?.stats?.sections === 'dec'
				? 'Show column as hexadecimal'
				: 'Show column as decimal';
	};

	const handleOptionClick = () => {
		closeContextMenu();

		const currentOption = savedOptions?.stats?.sections;

		if (!currentOption) return;

		const clonedSavedOptions = JSON.parse(
			JSON.stringify(savedOptions)
		);
		clonedSavedOptions.stats.sections =
			currentOption === 'dec' ? 'hex' : 'dec';

		onUpdateOptions(clonedSavedOptions as TSavedTableOptions);
	};

	const closeContextMenu = () => {
		setIsMenuVisible(false);
	};

	const displaySizeContent = (size: number) => {
		if (savedOptions?.stats?.sections === 'hex')
			return convertDecimalToHex(size);

		return formatSize(Number(size));
	};

	return (
		<div className={styles.container}>
			<div className={styles.title}>
				<HeaderWithTooltip title={i10n?.title} i10n={i10n} />
			</div>

			<VSCodeDataGrid
				aria-label='Sections Table'
				className={`table-styles ${styles.topTable}`}
				grid-template-columns='70px 1fr 90px 100px 95px'
			>
				<VSCodeDataGridRow row-type='header'>
					<VSCodeDataGridCell
						cell-type='columnheader'
						grid-column={1}
					>
						<ElfTableHeaderCell
							dir={sortBy.id}
							column='id'
							label={capitalizeWord('num')}
							onSort={onSortColumn}
						/>
					</VSCodeDataGridCell>
					{columns.includes('type') && (
						<VSCodeDataGridCell
							cell-type='columnheader'
							grid-column={2}
						>
							<ElfTableHeaderCell
								dir={sortBy.name}
								column='name'
								label={capitalizeWord('name')}
								onSort={onSortColumn}
							/>
						</VSCodeDataGridCell>
					)}
					{columns.includes('size') && (
						<VSCodeDataGridCell
							cell-type='columnheader'
							grid-column={3}
							className={styles['right-align']}
						>
							<ElfTableHeaderCell
								dir={sortBy.size}
								column='size'
								label={capitalizeWord('size')}
								onSort={onSortColumn}
							/>
						</VSCodeDataGridCell>
					)}

					<VSCodeDataGridCell
						cell-type='columnheader'
						grid-column={4}
						className={styles['right-align']}
					>
						<ElfTableHeaderCell
							dir={sortBy.functions}
							column='functions'
							label={capitalizeWord('functions')}
							onSort={onSortColumn}
						/>
					</VSCodeDataGridCell>
					<VSCodeDataGridCell
						cell-type='columnheader'
						grid-column={5}
						className={styles['right-align']}
					>
						<ElfTableHeaderCell
							dir={sortBy.variables}
							column='variables'
							label={capitalizeWord('variables')}
							onSort={onSortColumn}
						/>
					</VSCodeDataGridCell>
				</VSCodeDataGridRow>
				{sortedSections.map(row => (
					<VSCodeDataGridRow key={row.id}>
						<VSCodeDataGridCell grid-column={1}>
							{row.id}
						</VSCodeDataGridCell>
						{columns.includes('name') && (
							<VSCodeDataGridCell
								grid-column={2}
								className={styles.cellEllipsis}
							>
								<SectionNameWithCircle
									value={row.name}
									bucket={row.bucket}
								/>
							</VSCodeDataGridCell>
						)}
						{columns.includes('size') && (
							<VSCodeDataGridCell
								grid-column={3}
								className={styles['right-align']}
								onContextMenu={event => {
									handleContextMenu(event);
								}}
							>
								{displaySizeContent(row.size as number)}
							</VSCodeDataGridCell>
						)}
						<VSCodeDataGridCell
							grid-column={4}
							className={styles['right-align']}
						>
							{row.functions}
						</VSCodeDataGridCell>
						<VSCodeDataGridCell
							grid-column={5}
							className={styles['right-align']}
						>
							{row.variables}
						</VSCodeDataGridCell>
					</VSCodeDataGridRow>
				))}
			</VSCodeDataGrid>
			<ContextMenuPanel
				isVisible={isMenuVisible}
				x={contextMenuPosition.x}
				y={contextMenuPosition.y}
				options={MENU_OPTIONS}
				handleOptionClick={handleOptionClick}
				closeMenu={closeContextMenu}
			/>
		</div>
	);
}
