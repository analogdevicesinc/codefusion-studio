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

import {type COLUMNS} from '../../../common/types/memory-layout';
import {type TSymbol} from '../../../common/types/symbols';

export type TMemoryTableCellProps = {
	columnIndex: number;
	rowIndex: number;
	row: TSymbol;
	column: COLUMNS;
	savedOptions: Record<string, any>;
	layer: number;
	key?: string;
	handleContextMenu: (
		event: React.MouseEvent<HTMLElement>,
		column: COLUMNS,
		rowIndex: number
	) => void;
};
