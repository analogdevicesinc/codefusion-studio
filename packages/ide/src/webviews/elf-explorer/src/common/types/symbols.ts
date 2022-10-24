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
export type TSymbol = Record<string, any>;

export enum SYMBOL_COLUMNS {
	NUM = 'num',
	NAME = 'name',
	TYPE = 'type',
	ADDRESS = 'address',
	SECTION = 'section',
	SIZE = 'size',
	LOCALSTACK = 'localstack',
	STACK = 'stack',
	BIND = 'bind',
	VISIBILITY = 'visibility',
	PATH = 'path',
	BUCKET = 'bucket',
	RECURSIVE = 'recursive'
}

export enum RECURSION_TYPES {
	REACHES_RECURSION = 'R',
	GRAPH_LOOP = 'GL',
	SELF_RECURSIVE = 'SR'
}

export type TColumn =
	| 'num'
	| 'name'
	| 'type'
	| 'address'
	| 'section'
	| 'size'
	| 'localstack'
	| 'stack'
	| 'bind'
	| 'visibility'
	| 'path';

export type TNewColumn = string;

export type TSortByStateVal = 'asc' | 'desc' | undefined;

export type TSortByState = {
	num?: TSortByStateVal;
	name?: TSortByStateVal;
	type?: TSortByStateVal;
	value?: TSortByStateVal;
	section?: TSortByStateVal;
	size?: TSortByStateVal;
	stack?: TSortByStateVal;
	bind?: TSortByStateVal;
	visibility?: TSortByStateVal;
	source?: TSortByStateVal;
};

export const columns: string[] = [
	'num',
	'name',
	'type',
	'value',
	'section',
	'size',
	'localstack',
	'stack',
	'bind',
	'visibility',
	'source'
];

export type TSavedQuery = {
	id: number;
	name: string;
	value: string;
};
