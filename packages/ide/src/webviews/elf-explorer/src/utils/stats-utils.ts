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
import type {TSection} from '../common/types/memory-layout';
import type {TSymbol} from '../common/types/symbols';

enum EntityType {
	FUNC = 'FUNC',
	OBJECT = 'OBJECT'
}

function groupAndCountByBind(symbols: TSymbol[], type: EntityType) {
	const counts = symbols.reduce((acc, symbol) => {
		if (symbol?.type === type) {
			const bindType = symbol?.bind?.toLowerCase();

			if (!acc[bindType]) {
				acc[bindType] = 0;
			}

			acc[bindType]++;
		}

		return acc;
	}, {});

	const result = [
		{
			text: `Global ${
				type === EntityType.FUNC ? ' Functions' : 'Variables'
			} `,
			value: counts.global || 0
		},
		{
			text: `Local ${
				type === EntityType.FUNC ? 'Functions' : 'Variables'
			} `,
			value: counts.local || 0
		}
	];

	if (type === EntityType.FUNC) {
		result.push({
			text: 'Weak Functions',
			value: counts.weak || 0
		});
	}

	return result;
}

function groupAndCountByBindAndSection(
	symbols: TSymbol[],
	type: EntityType,
	bucket: string
) {
	const counts = symbols.reduce((acc, symbol) => {
		if (symbol?.type === type && symbol?.bucket === bucket) {
			const bindType = symbol?.bind?.toLowerCase();

			if (!acc[bindType]) {
				acc[bindType] = 0;
			}

			acc[bindType]++;
		}

		return acc;
	}, {});

	const result = [
		{
			text: `Global ${
				type === EntityType.FUNC ? ' Functions' : 'Variables'
			} `,
			value: counts.global || 0
		},
		{
			text: `Local ${
				type === EntityType.FUNC ? 'Functions' : 'Variables'
			} `,
			value: counts.local || 0
		}
	];

	if (type === EntityType.FUNC) {
		result.push({
			text: 'Weak Functions',
			value: counts.weak || 0
		});
	}

	return result;
}

export function filterSymbols(
	symbols: TSymbol[],
	selectedFilter: string,
	setFuncs: React.Dispatch<React.SetStateAction<TSymbol[]>>,
	setVars: React.Dispatch<React.SetStateAction<TSymbol[]>>
) {
	switch (selectedFilter) {
		case 'All':
			setFuncs(groupAndCountByBind(symbols, EntityType.FUNC));
			setVars(groupAndCountByBind(symbols, EntityType.OBJECT));
			break;
		case 'Text':
			setFuncs(
				groupAndCountByBindAndSection(
					symbols,
					EntityType.FUNC,
					'Text'
				)
			);
			setVars(
				groupAndCountByBindAndSection(
					symbols,
					EntityType.OBJECT,
					'Text'
				)
			);
			break;
		case 'Data':
			setFuncs(
				groupAndCountByBindAndSection(
					symbols,
					EntityType.FUNC,
					'Data'
				)
			);
			setVars(
				groupAndCountByBindAndSection(
					symbols,
					EntityType.OBJECT,
					'Data'
				)
			);
			break;
		case 'Bss':
			setFuncs(
				groupAndCountByBindAndSection(symbols, EntityType.FUNC, 'Bss')
			);
			setVars(
				groupAndCountByBindAndSection(
					symbols,
					EntityType.OBJECT,
					'Bss'
				)
			);
			break;
		default:
			break;
	}
}

export function filterTopSymbols(
	symbols: TSymbol[],
	selectedFilter: string,
	setFilter: React.Dispatch<React.SetStateAction<TSymbol[]>>
) {
	let filteredSymbols: TSymbol[];

	switch (selectedFilter?.toLowerCase()) {
		case 'all':
			filteredSymbols = [...symbols]
				.sort((a, b) => b.size - a.size)
				.slice(0, 10);
			break;
		case 'text':
		case 'data':
		case 'bss':
			filteredSymbols = symbols
				.filter(
					symbol =>
						symbol?.bucket?.toLowerCase() ===
						selectedFilter?.toLowerCase()
				)
				.sort((a, b) => b.size - a.size)
				.slice(0, 10);
			break;
		default:
			filteredSymbols = [];
			break;
	}

	setFilter(filteredSymbols);
}

export function countElementsByType(
	arr: any[],
	type: string
): number {
	return arr.reduce((count, element) => {
		if (element.type === type) {
			count++;
		}

		return count;
	}, 0);
}

export function formatSize(size: number) {
	// Convert the size to a string
	let sizeStr = size.toString();

	// Check if the size is greater than 3 digits
	if (sizeStr.length > 3) {
		// Insert the dot before the last three characters
		sizeStr = sizeStr.slice(0, -3) + ',' + sizeStr.slice(-3);
	}

	return sizeStr;
}

export const extractAllSymbols = (sections: TSection[]): TSymbol[] =>
	sections.reduce(
		(acc: TSymbol[], section: TSection) =>
			acc.concat(section.symbols),
		[]
	);

export function convertArray(inputArray: string[]): string[] {
	// Process the array while keeping the first element unchanged
	return inputArray.map((sentence, index) => {
		if (index === 0 || index === 4) return sentence; // Do not format the first and fifth elements

		if (typeof sentence !== 'string') return ''; // Check if sentence is a string

		return sentence
			.split(' ')
			.map(word =>
				word === word.toUpperCase() && word.length > 1
					? word
					: word?.toLowerCase()
			)
			.join(' ');
	});
}
