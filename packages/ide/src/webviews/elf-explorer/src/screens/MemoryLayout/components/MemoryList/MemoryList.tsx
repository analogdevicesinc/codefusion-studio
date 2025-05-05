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
import React, {memo} from 'react';
import {VSCodeDataGrid} from '@vscode/webview-ui-toolkit/react';
import SectionNameWithCircle from '../../../../components/SectionNameWithCircle/SectionNameWithCircle';

import styles from './MemoryList.module.scss';
import {getColumns} from '../../../../utils/table-utils';
import {
	transformBtoKB,
	convertDecimalToHex
} from '../../../../utils/number';
import {calculateSegmentEndAddress} from '../../../../utils/visual-utils';

import {
	type TSegment,
	type TSection
} from '../../../../common/types/memory-layout';
import type {TLocaleContext} from '../../../../common/types/context';
import MemoryListItem from '../MemoryListItem/MemoryListItem';

type TMemoryListProps = {
	readonly data: TSection[];
	readonly i10n: TLocaleContext | undefined;
};

function MemoryList({data, i10n}: TMemoryListProps) {
	const columns: string[] = getColumns(data);

	return (
		<>
			<div className={styles.header}>About this section</div>
			<VSCodeDataGrid
				aria-label='Memory List'
				className={styles.table}
			>
				{data.map((row, index) => (
					<React.Fragment key={`${row.id}`}>
						{columns.includes('name') && (
							<MemoryListItem
								section={row}
								index={index}
								title='Section Name'
								i10n={i10n}
							>
								{row.name}
							</MemoryListItem>
						)}

						{columns.includes('type') && (
							<MemoryListItem
								section={row}
								index={index}
								title='Section Type'
								i10n={i10n}
							>
								{row.type}
							</MemoryListItem>
						)}
						{columns.includes('address') && (
							<MemoryListItem
								section={row}
								index={index}
								title='Starting Address'
								i10n={i10n}
							>
								{row.address}
							</MemoryListItem>
						)}
						{columns.includes('address') && (
							<MemoryListItem
								section={row}
								index={index}
								title='Ending Address'
								i10n={i10n}
							>
								{convertDecimalToHex(
									calculateSegmentEndAddress(
										data[0] as unknown as TSegment
									)
								)}
							</MemoryListItem>
						)}
						{columns.includes('size') && (
							<MemoryListItem
								section={row}
								index={index}
								title='Size'
								i10n={i10n}
							>
								{transformBtoKB(row.size)}
							</MemoryListItem>
						)}
						{columns.includes('bucket') && (
							<MemoryListItem
								section={row}
								index={index}
								title='Is part of'
								i10n={i10n}
							>
								{row.name && (
									<SectionNameWithCircle
										value={row?.bucket?.toLowerCase()}
										bucket={row.bucket}
										align='right'
									/>
								)}
							</MemoryListItem>
						)}
						{columns.includes('flags') && (
							<MemoryListItem
								section={row}
								index={index}
								title='Flags'
								i10n={i10n}
							>
								{row.flags}
							</MemoryListItem>
						)}
					</React.Fragment>
				))}
			</VSCodeDataGrid>
		</>
	);
}

export default memo(MemoryList);
