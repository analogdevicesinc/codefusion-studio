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

import {memo} from 'react';
import useCellAttributes from './use-cell-attributes';
import {DataGridCell} from 'cfs-react-library';
import {type TMemoryTableCellProps} from '../../../common/memory-table-cell-props-type';
import styles from '../MemoryTable.module.scss';

function MemoryTableTypeCell({
	columnIndex,
	rowIndex,
	row,
	column,
	handleContextMenu
}: TMemoryTableCellProps) {
	const cellAttributes = useCellAttributes(
		columnIndex,
		rowIndex,
		row,
		column,
		handleContextMenu
	);

	const value = row[column];

	cellAttributes.className = styles['cell-ellipsis'];

	return <DataGridCell {...cellAttributes}>{value}</DataGridCell>;
}

export default memo(MemoryTableTypeCell);
