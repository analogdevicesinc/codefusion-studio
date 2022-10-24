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
import {
	VSCodeDataGrid,
	VSCodeDataGridRow,
	VSCodeDataGridCell
} from '@vscode/webview-ui-toolkit/react';
import styles from './SymbolTypesTable.module.scss';
import {getColumns} from '../../../../utils/table-utils';

type TSymbolsSizeTableProps = {
	readonly data: Array<Record<string, any>>;
};

function SymbolTypeTable({data}: TSymbolsSizeTableProps) {
	const columns: string[] = getColumns(data);

	return (
		<VSCodeDataGrid
			aria-label='Top Symbols Table'
			className={`table-styles ${styles.topSymbols}`}
		>
			{data.map(row => (
				<VSCodeDataGridRow key={row.id}>
					{columns.map((column, index) => (
						<VSCodeDataGridCell
							key={`${row.id}-${column}`}
							grid-column={index + 1}
							className={`${index === 0 ? styles.first : ''} ${index === columns.length - 1 ? styles.last : ''}`}
						>
							{row[column]}
						</VSCodeDataGridCell>
					))}
				</VSCodeDataGridRow>
			))}
		</VSCodeDataGrid>
	);
}

export default memo(SymbolTypeTable);
