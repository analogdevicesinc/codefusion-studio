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
// Components
import React, {memo, useState} from 'react';
import {
	VSCodeDataGrid,
	VSCodeDataGridRow,
	VSCodeDataGridCell,
	VSCodeButton
} from '@vscode/webview-ui-toolkit/react';
import SectionNameWithCircle from '../../../../components/SectionNameWithCircle/SectionNameWithCircle';

import styles from './MemoryList.module.scss';
import {getColumns} from '../../../../utils/table-utils';
import {
	transformBtoKB,
	convertDecimalToHex
} from '../../../../utils/number';
import Tooltip from '../../../../components/Tooltip/Tooltip';
import Info from '@common/icons/Info';
import {calculateSegmentEndAddress} from '../../../../utils/visual-utils';

import {
	type TSegment,
	type TSection
} from '../../../../common/types/memory-layout';
import type {TLocaleContext} from '../../../../common/types/context';

type TMemoryListProps = {
	readonly data: TSection[];
	readonly i10n: TLocaleContext | undefined;
};

function MemoryList({data, i10n}: TMemoryListProps) {
	const columns: string[] = getColumns(data);
	const [isHovered, setIsHovered] = useState<boolean>(false);

	return (
		<>
			<div className={styles.header}>About this section</div>
			<VSCodeDataGrid
				aria-label='Memory List'
				className='table-styles'
			>
				{data.map((row, index) => (
					<React.Fragment key={`${row.id}`}>
						{columns.includes('name') && (
							<VSCodeDataGridRow key={`name-${row.id}`}>
								<VSCodeDataGridCell grid-column={index + 1}>
									Section Name
								</VSCodeDataGridCell>
								<VSCodeDataGridCell grid-column={index + 2}>
									{row.name && (
										<SectionNameWithCircle
											value={row.name}
											bucket={row.bucket}
											align='right'
										/>
									)}
								</VSCodeDataGridCell>
							</VSCodeDataGridRow>
						)}
						{columns.includes('type') && (
							<VSCodeDataGridRow key={`type-${row.id}`}>
								<VSCodeDataGridCell grid-column={index + 1}>
									Section Type
								</VSCodeDataGridCell>
								<VSCodeDataGridCell
									grid-column={index + 2}
									className={styles.last}
								>
									{row.type}
								</VSCodeDataGridCell>
							</VSCodeDataGridRow>
						)}
						{columns.includes('address') && (
							<VSCodeDataGridRow key={`addressStart-${row.id}`}>
								<VSCodeDataGridCell grid-column={index + 1}>
									Starting Address
								</VSCodeDataGridCell>
								<VSCodeDataGridCell
									grid-column={index + 2}
									className={styles.last}
								>
									{row.address}
								</VSCodeDataGridCell>
							</VSCodeDataGridRow>
						)}
						{columns.includes('address') && (
							<VSCodeDataGridRow key={`addressEnd-${row.id}`}>
								<VSCodeDataGridCell grid-column={index + 1}>
									Ending Address
								</VSCodeDataGridCell>
								<VSCodeDataGridCell
									grid-column={index + 2}
									className={styles.last}
								>
									{convertDecimalToHex(
										calculateSegmentEndAddress(
											data[0] as unknown as TSegment
										)
									)}
								</VSCodeDataGridCell>
							</VSCodeDataGridRow>
						)}
						{columns.includes('size') && (
							<VSCodeDataGridRow key={`size-${row.id}`}>
								<VSCodeDataGridCell grid-column={index + 1}>
									Size
								</VSCodeDataGridCell>
								<VSCodeDataGridCell
									grid-column={index + 2}
									className={styles.last}
								>
									{transformBtoKB(row.size)}
								</VSCodeDataGridCell>
							</VSCodeDataGridRow>
						)}
						{columns.includes('bucket') && (
							<VSCodeDataGridRow key={`bucket-${row.id}`}>
								<VSCodeDataGridCell grid-column={index + 1}>
									Is part of
								</VSCodeDataGridCell>
								<VSCodeDataGridCell
									grid-column={index + 2}
									className={styles.last}
								>
									{row?.bucket?.toLowerCase()}
								</VSCodeDataGridCell>
							</VSCodeDataGridRow>
						)}
						{columns.includes('flags') && (
							<VSCodeDataGridRow
								key={`flags-${row.id}`}
								onMouseEnter={() => {
									setIsHovered(true);
								}}
								onMouseLeave={() => {
									setIsHovered(false);
								}}
							>
								<VSCodeDataGridCell grid-column={index + 1}>
									<div className={styles['tooltip-container']}>
										<span>Flags</span>

										{isHovered && i10n?.title && (
											<Tooltip
												content={{
													title: i10n?.title || ''
												}}
											>
												<VSCodeButton
													appearance='icon'
													className={styles['icon-button']}
												>
													<Info />
												</VSCodeButton>
											</Tooltip>
										)}
									</div>
								</VSCodeDataGridCell>
								<VSCodeDataGridCell
									grid-column={index + 2}
									className={styles.last}
								>
									<div className={styles['min-container']}>
										{row.flags}
									</div>
								</VSCodeDataGridCell>
							</VSCodeDataGridRow>
						)}
					</React.Fragment>
				))}
			</VSCodeDataGrid>
		</>
	);
}

export default memo(MemoryList);
