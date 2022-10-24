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

	const allKeys = Object.keys(data[0]);
	const idIndex = allKeys.indexOf('id');

	// There are cases when "id" is not returned
	if (idIndex !== -1) {
		allKeys.splice(idIndex, 1);
	}

	return allKeys;
};

export const getColumnSizes = (layer: number) => {
	switch (layer) {
		case 1:
			return '11% 26% 18% 16% 14% 15%';
		case 2:
			return '11% 23% 18% 16% 14% 18%';
		case 3:
			return '8% 40% 14% 12% 12% 14%';
		default:
			return '1fr';
	}
};

export const computeSymbolSizes = (
	columns: Array<`${SYMBOL_COLUMNS}`>
): string => {
	let totalWidth = 100;
	const nameWidth = 20;
	const numWidth = 5;
	const addressWidth = 10;
	const columnWidths: any = {};

	const filteredColumns = columns.filter(
		item =>
			item !== SYMBOL_COLUMNS.BUCKET &&
			item !== SYMBOL_COLUMNS.RECURSIVE
	);

	if (filteredColumns.includes(SYMBOL_COLUMNS.NAME)) {
		columnWidths.name = nameWidth;
		totalWidth -= nameWidth;
	}

	if (filteredColumns.includes(SYMBOL_COLUMNS.NUM)) {
		columnWidths.num = numWidth;
		totalWidth -= numWidth;
	}

	if (filteredColumns.includes(SYMBOL_COLUMNS.ADDRESS)) {
		columnWidths.address = addressWidth;
		totalWidth -= addressWidth;
	}

	const columnsWithoutName = filteredColumns.filter(
		item =>
			item !== SYMBOL_COLUMNS.NAME &&
			item !== SYMBOL_COLUMNS.NUM &&
			item !== SYMBOL_COLUMNS.ADDRESS
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
		'num',
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
