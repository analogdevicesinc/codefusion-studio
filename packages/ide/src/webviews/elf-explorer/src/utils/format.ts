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
import type {TSymbol} from '../common/types/symbols';
import type {
	TSection,
	TSectionResponse,
	TSegmentResponse,
	TSymbolResponse
} from './../common/types/memory-layout';

// Parse segments to UI needs
export const formatSegments = (segments: TSegmentResponse[]): any[] =>
	[...segments].map((segment: TSegmentResponse) => ({
		...segment,
		align: Number(segment.align),
		size: Number(segment.size),
		address: segment.address,
		sections: formatSections(segment.sections)
	}));

// Parse sections to UI needs
export const formatSections = (
	sections: TSectionResponse[],
	hasBucket?: boolean
): TSection[] =>
	[...sections].map((section: TSectionResponse) => ({
		...section,
		address: section.address,
		size: Number(section.size),
		symbols: hasBucket
			? formatSymbolsWithBucket(section.symbols, section.bucket)
			: formatSymbols(section.symbols)
	}));

export const formatSymbols = (
	symbols: TSymbolResponse[]
): TSymbol[] =>
	[...symbols].map((symbol: TSymbolResponse) => {
		const formattedSymbol: TSymbol = {...symbol};

		// Convert size and address from string to number
		if (symbol.size) {
			formattedSymbol.size = Number(symbol.size);
		}

		if (symbol.address) {
			formattedSymbol.address = symbol.address;
		}

		return formattedSymbol;
	});

export const formatSymbolsWithBucket = (
	symbols: TSymbolResponse[],
	bucket: string
): TSymbol[] =>
	[...symbols].map((symbol: TSymbolResponse) => ({
		...symbol,
		size: Number(symbol.size),
		bucket
	}));
