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
import type {TSavedTableOptions} from '../common/types/memory-layout';
import {
	SYMBOL_COLUMNS,
	type TSymbol,
	RECURSION_TYPES
} from '../common/types/symbols';
import {convertDecimalToHex, convertHexToDecimal} from './number';
import {formatSize} from './stats-utils';

export function extractPositionFromPath(
	path: string
): [number, number] | undefined {
	// Use a regular expression to match the position pattern
	const regex = /:(\d+)(?::(\d+))?$/;
	// eslint-disable-next-line @typescript-eslint/prefer-regexp-exec
	const match = path.match(regex);

	if (match) {
		// Extract line and column from the matched pattern
		const line = parseInt(match[1], 10);
		const column = match[2] ? parseInt(match[2], 10) : 1;

		// Return the line and column as an array
		return [line, column];
	}
}

export function formatPath(path: string) {
	// Use a regular expression to match the path and remove the position at the end
	return path.replace(/:\d+(?::\d+)?$/, '');
}

export function extractFilename(path: string): string {
	if (typeof path !== 'string') {
		throw new Error('Invalid path: path must be a string');
	}

	const parts = path.split('/');
	const fileName = parts.pop();

	if (fileName) {
		// Should return the name of the file containing only with the line number
		// the strucutre is "/fileName.c:line:col" where line is mandatory and col is optional
		const isLineAndColumn = fileName?.split(':')?.length === 3;
		const formattedFileName = isLineAndColumn
			? fileName?.slice(0, fileName?.lastIndexOf(':'))
			: fileName;

		return formattedFileName;
	}

	return '';
}

// Remove the row and col information from symbol path
export const formatSymbolPathForQuery = (path: string): string => {
	const formattedPath = path.slice(0, path.lastIndexOf(':'));

	return `${formattedPath.slice(
		0,
		formattedPath.lastIndexOf(':')
	)}%'`;
};

export const splitStringByFirstSpace = (text: string): string[] => {
	const index = text.indexOf(' ');

	return [text.slice(0, index), text.slice(index + 1)];
};

export const displayColumnAndValue = (
	filteredLabel: string,
	savedOptions: TSavedTableOptions
) => {
	const [column, rawValue] = splitStringByFirstSpace(filteredLabel);
	let result = filteredLabel;

	// Remove quotes marks
	let value = rawValue.trim().slice(1, -1);

	if ((column as SYMBOL_COLUMNS) === SYMBOL_COLUMNS.SIZE) {
		value =
			savedOptions?.symbols?.size === 'hex'
				? convertDecimalToHex(Number(value))
				: value;
		result = `${column} '${value}'`;
	}

	if ((column as SYMBOL_COLUMNS) === SYMBOL_COLUMNS.ADDRESS) {
		value =
			savedOptions?.symbols.address === 'dec'
				? convertHexToDecimal(value).toString()
				: value;
		result = `${column} '${value}'`;
	}

	if ((column as SYMBOL_COLUMNS) === SYMBOL_COLUMNS.LOCALSTACK) {
		value =
			savedOptions?.symbols.localstack === 'hex' && value !== 'null'
				? convertDecimalToHex(Number(value))
				: value;
		result = `${column} '${value}'`;
	}

	if ((column as SYMBOL_COLUMNS) === SYMBOL_COLUMNS.STACK) {
		value =
			savedOptions?.symbols.stack === 'hex' && value !== 'null'
				? convertDecimalToHex(Number(value))
				: value;
		result = `${column} '${value}'`;
	}

	if ((column as SYMBOL_COLUMNS) === SYMBOL_COLUMNS.PATH) {
		value = extractFilename(value);
		value = value.slice(0, value.lastIndexOf(':'));
		result = `${column} '${value}'`;
	}

	return result;
};

// eslint-disable-next-line complexity
export const displayValue = (
	column: SYMBOL_COLUMNS,
	row: TSymbol,
	savedOptions: TSavedTableOptions
) => {
	if (column === SYMBOL_COLUMNS.NAME) {
		return '';
	}

	if (
		column === SYMBOL_COLUMNS.SIZE &&
		savedOptions?.symbols[SYMBOL_COLUMNS.SIZE] === 'dec'
	) {
		return formatSize(row[column] as number);
	}

	if (
		column === SYMBOL_COLUMNS.SIZE &&
		savedOptions?.symbols[SYMBOL_COLUMNS.SIZE] === 'hex'
	) {
		return convertDecimalToHex(row[column] as number);
	}

	if (
		column === SYMBOL_COLUMNS.ADDRESS &&
		savedOptions?.symbols[SYMBOL_COLUMNS.ADDRESS] === 'dec'
	) {
		return convertHexToDecimal(row[column] as string);
	}

	if (column === SYMBOL_COLUMNS.SECTION) return '';

	if (
		column === SYMBOL_COLUMNS.LOCALSTACK &&
		savedOptions?.symbols[SYMBOL_COLUMNS.LOCALSTACK] === 'hex'
	) {
		if (row[column] || row[column] === 0)
			return convertDecimalToHex(row[column] as number);

		return row[column];
	}

	if (
		column === SYMBOL_COLUMNS.STACK &&
		savedOptions?.symbols[SYMBOL_COLUMNS.STACK] === 'hex'
	) {
		if (row[column] || row[column] === 0)
			return convertDecimalToHex(row[column] as number);

		return row[column];
	}

	const isStackOrLocalStack =
		column === SYMBOL_COLUMNS.LOCALSTACK ||
		column === SYMBOL_COLUMNS.STACK;

	if (isStackOrLocalStack && row[column] === null) {
		return '';
	}

	if (column === SYMBOL_COLUMNS.PATH)
		return extractFilename(row[column] as string);

	return row[column] === null ||
		row[column] === undefined ||
		typeof row[column] === 'boolean'
		? `${row[column]}`
		: row[column];
};

export const setRightAlign = (
	column: SYMBOL_COLUMNS,
	styles: Record<string, any>
) => {
	if (column === SYMBOL_COLUMNS.SIZE)
		return `${styles['right-align']}`;
	if (column === SYMBOL_COLUMNS.LOCALSTACK)
		return styles['right-align'];
	if (column === SYMBOL_COLUMNS.STACK) return styles['right-align'];

	return '';
};

export const setRelative = (
	column: SYMBOL_COLUMNS,
	styles: Record<string, any>
) => {
	if (column === SYMBOL_COLUMNS.SIZE) return styles.setRelative;
	if (column === SYMBOL_COLUMNS.LOCALSTACK) return styles.setRelative;
	if (column === SYMBOL_COLUMNS.STACK) return styles.setRelative;

	return '';
};

export const setRightAlignForHeader = (column: SYMBOL_COLUMNS) => {
	if (column === SYMBOL_COLUMNS.SIZE) return 'rightAlignForHeader';
	if (column === SYMBOL_COLUMNS.LOCALSTACK)
		return 'rightAlignForHeader';
	if (column === SYMBOL_COLUMNS.STACK) return 'rightAlignForHeader';

	return '';
};

export const setFlagsForStack = (row: TSymbol) => {
	let flag;

	switch (row.recursive) {
		case 1:
			flag = `${RECURSION_TYPES.REACHES_RECURSION} `;
			break;
		case 2:
			flag = `${RECURSION_TYPES.GRAPH_LOOP} `;
			break;
		case 3:
			flag = `${RECURSION_TYPES.SELF_RECURSIVE} `;
			break;
		default:
			flag = '';
	}

	return flag;
};
