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
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import type {
	TSymbol,
	TColumn,
	TSortByStateVal
} from '../common/types/symbols';

import {SYMBOL_COLUMNS} from '../common/types/symbols';

const compareNumeric = (
	a: number,
	b: number,
	order: TSortByStateVal
) => (order === 'asc' ? a - b : b - a);

const compareString = (
	a: string,
	b: string,
	order: TSortByStateVal
) =>
	order === 'asc'
		? a?.localeCompare(b, 'en-US', { sensitivity: 'base' })
		: b?.localeCompare(a, 'en-US', { sensitivity: 'base' });

const setValue = (value: any) =>
	value ? value : typeof value === 'string' ? '0' : 0;

const sortData = (data: TSymbol[], sortBy: any) => {
	const keys = Object.keys(sortBy) as TColumn[];
	const key = keys.find(k => sortBy[k]); // Assumes only one sort field is active at a time

	if (!key) return data;

	return [...data].sort((a, b) => {
		const valA = setValue(a[key]);
		const valB = setValue(b[key]);
		const order = sortBy[key]!;

		// Define a mapping to determine the sorting method based on the key and type
		const sortMethod =
			key === SYMBOL_COLUMNS.ADDRESS
				? () =>
					compareNumeric(
						parseInt(valA as string, 16),
						parseInt(valB as string, 16),
						order
					)
				: typeof valA === 'number' && typeof valB === 'number'
					? () => compareNumeric(valA, valB, order)
					: () =>
						compareString(valA as string, valB as string, order);

		// Execute the selected sorting method
		return sortMethod();
	});
};

export default sortData;
