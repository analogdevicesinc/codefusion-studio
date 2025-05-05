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
import {SYMBOL_COLUMNS, type TSymbol} from '../common/types/symbols';

export const BUCKET_ENUM = {
	TEXT: 'Text',
	BSS: 'Bss',
	DATA: 'Data'
};

export const getColumns = (
	data: TSymbol[]
): Array<`${SYMBOL_COLUMNS}` | string> => {
	if (!data.length) return [];

	return Object.keys(data[0]);
};

export const getColumnSizes = (layer: number) => {
	switch (layer) {
		case 1:
			return '8% 40% 15% 15% 12% 10%';
		case 2:
			return '8% 40% 15% 15% 8% 14%';
		case 3:
			return '8% 40% 15% 15% 12% 10%';
		default:
			return '1fr';
	}
};

// TO DO: refactor
export const computeSymbolSizes = (
	columns: Array<`${SYMBOL_COLUMNS}`>
): string => {
	let totalWidth = 100;

	const idWidth = 5;
	const nameWidth = 20;
	const typeWidth = 5;
	const addressWidth = 8;
	const sizeWidth = 8;
	const columnWidths: any = {};

	const filteredColumns = columns.filter(
		item =>
			item !== SYMBOL_COLUMNS.BUCKET &&
			item !== SYMBOL_COLUMNS.RECURSIVE
	);

	if (filteredColumns.includes(SYMBOL_COLUMNS.ID)) {
		columnWidths.id = idWidth;
		totalWidth -= idWidth;
	}

	if (filteredColumns.includes(SYMBOL_COLUMNS.NAME)) {
		columnWidths.name = nameWidth;
		totalWidth -= nameWidth;
	}

	if (filteredColumns.includes(SYMBOL_COLUMNS.SIZE)) {
		columnWidths.size = sizeWidth;
		totalWidth -= sizeWidth;
	}

	if (filteredColumns.includes(SYMBOL_COLUMNS.ADDRESS)) {
		columnWidths.address = addressWidth;
		totalWidth -= addressWidth;
	}

	if (filteredColumns.includes(SYMBOL_COLUMNS.TYPE)) {
		columnWidths.type = typeWidth;
		totalWidth -= typeWidth;
	}

	const columnsWithoutName = filteredColumns.filter(
		item =>
			item !== SYMBOL_COLUMNS.ID &&
			item !== SYMBOL_COLUMNS.NAME &&
			item !== SYMBOL_COLUMNS.TYPE &&
			item !== SYMBOL_COLUMNS.ADDRESS &&
			item !== SYMBOL_COLUMNS.SIZE
	);
	const remainingColumnWidth = totalWidth / columnsWithoutName.length;

	columnsWithoutName.forEach(col => {
		columnWidths[col] = remainingColumnWidth;
	});

	return filteredColumns
		.map(item => `${columnWidths[item]}%`)
		.join(' ');
};

export function getOrder(layer: number) {
	const orderLayer1 = [
		'id',
		'type',
		'address',
		'size',
		'flags',
		'align'
	];
	const orderLayer2 = [
		'id',
		'name',
		'address',
		'size',
		'flags',
		'type'
	];
	const orderLayer3 = [
		'id',
		'name',
		'address',
		'size',
		'bind',
		'visibility'
	];

	switch (layer) {
		case 1:
			return orderLayer1;
		case 2:
			return orderLayer2;
		case 3:
			return orderLayer3;
		default:
			return []; // Return an empty array for invalid layer values
	}
}
