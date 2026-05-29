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
import {COLUMNS} from '../../../../../common/types/memory-layout';
import {formatSize} from '../../../../../utils/stats-utils';
import {convertDecimalToHex} from '../../../../../utils/number';

function MemoryTableSizeCell({
	columnIndex,
	rowIndex,
	row,
	column,
	savedOptions,
	layer,
	handleContextMenu
}: TMemoryTableCellProps) {
	const cellAttributes = useCellAttributes(
		columnIndex,
		rowIndex,
		row,
		column,
		handleContextMenu
	);

	const isDec =
		savedOptions?.memory?.[layer]?.[COLUMNS.SIZE] === 'dec';

	const value = isDec
		? formatSize(row[column] as number)
		: convertDecimalToHex(Number(row[column]));

	cellAttributes.title = value;

	if (isDec) {
		cellAttributes.className = styles['right-align'];
	}

	return <DataGridCell {...cellAttributes}>{value}</DataGridCell>;
}

export default memo(MemoryTableSizeCell);
