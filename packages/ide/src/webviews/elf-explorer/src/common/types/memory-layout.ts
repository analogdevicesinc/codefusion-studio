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
import type {TSymbol} from './symbols';

export enum SegmentCategory {
	MAIN = 'MAIN',
	OVERLAPPING = 'OVERLAPPING',
	UNUSED = 'UNUSED'
}

export enum COLUMNS {
	ID = 'id',
	TYPE = 'type',
	ADDRESS = 'address',
	SIZE = 'size',
	FLAGS = 'flags',
	ALIGN = 'align',
	NAME = 'name',
	BIND = 'bind',
	VISIBILITY = 'visibility'
}

export type TSegment = {
	id: number;
	type: string;
	label: string;
	address: string;
	computedStartAddr: number;
	computedEndAddr: number;
	size: number;
	flags: number | string;
	showAsReadOnly: boolean;
	align: number;
	sections: TSection[];
	sizePercentage: number;
	offset: number;
	category:
		| SegmentCategory.MAIN
		| SegmentCategory.OVERLAPPING
		| SegmentCategory.UNUSED;
};

export type TSegmentResponse = {
	id: number;
	type: string;
	label: string;
	address: string;
	size: string;
	flags: string;
	showAsReadOnly: boolean;
	align: string;
	sections: TSectionResponse[];
};

export type TSection = {
	id: number;
	routeId: number;
	type: string;
	label: string;
	address: string;
	size: number;
	symbols: TSymbol[];
	flags?: string;
	showAsReadOnly: boolean;
	bucket: string;
	name?: string;
	sizePercentage?: number;
	endAddressDecimal?: number;
	offset?: number;
	color?: string;
};

export type TSectionResponse = {
	id: number;
	routeId: number; // This id is only used in Memory Layout for the navigation between layers (segments -> sections -> symbols)
	address: string;
	flags: string;
	showAsReadOnly: boolean;
	bucket: string;
	name: string;
	size: string;
	type: string;
	label: string;
	symbols: TSymbolResponse[];
};

export type TSymbolResponse = {
	bind: string;
	id: number;
	routeId?: number; // This id is only used in Memory Layout for the navigation between layers (segments -> sections -> symbols)
	name: string;
	num: number;
	section: string;
	size: string; // Decimal
	bucket: string;
	localstack: number;
	stack: number;
	type: string;
	address: string; // Hexa
	visibility: string;
};

export type TSegmentUnusedSpace = {
	index: number;
	address: string;
	computedStartAddr: number;
	computedEndAddr: number;
	size: number;
};

export type TSavedTableOptions = {
	memory: {
		1: {
			address: TFormat;
			size: TFormat;
		};
		2: {
			address: TFormat;
			size: TFormat;
		};
		3: {
			address: TFormat;
			size: TFormat;
		};
	};
	stats: {
		sections: TFormat;
		largestSym: TFormat;
	};
	symbols: {
		address: TFormat;
		size: TFormat;
		localstack: TFormat;
		stack: TFormat;
	};
};

export type TFormat = 'dec' | 'hex';
