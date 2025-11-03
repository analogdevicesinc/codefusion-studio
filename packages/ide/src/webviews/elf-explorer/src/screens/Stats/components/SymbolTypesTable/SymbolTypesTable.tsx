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
import {memo} from 'react';
import styles from './SymbolTypesTable.module.scss';
import {getColumns} from '../../../../utils/table-utils';
import {DataGrid, DataGridCell, DataGridRow} from 'cfs-react-library';

type TSymbolsSizeTableProps = {
	readonly data: Array<Record<string, any>>;
};

function SymbolTypeTable({data}: TSymbolsSizeTableProps) {
	const columns: string[] = getColumns(data);

	return (
		<DataGrid
			ariaLabel='Top Symbols Table'
			dataTest='stats:symbol-types-table'
			className={`${styles.table} ${styles.topSymbols}`}
		>
			{data.map(row => (
				<DataGridRow key={row.id}>
					{columns.map((column, index) => (
						<DataGridCell
							key={`${row.id}-${column}`}
							gridColumn={String(index + 1)}
							className={`${index === 0 ? styles.first : ''} ${index === columns.length - 1 ? styles.last : ''}`}
						>
							{row[column]}
						</DataGridCell>
					))}
				</DataGridRow>
			))}
		</DataGrid>
	);
}

export default memo(SymbolTypeTable);
