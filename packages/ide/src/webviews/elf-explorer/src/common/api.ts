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
import {request} from '@common/api';

// Types
import type {
	TSavedTableOptions,
	TSectionResponse,
	TSegmentResponse,
	TSymbolResponse
} from './types/memory-layout';
import type {TMetadata} from './types/metadata';
import type {TSavedQuery} from './types/symbols';

/* --- API functions for ELF File Explorer --- */

// Get all symbols based on query
export async function getSymbols(query: string) {
	return request('elf-get-symbols', {query}) as Promise<
		TSymbolResponse[]
	>;
}

export async function getMemoryUsage() {
	return request('elf-get-memory-usage') as Promise<
		TSegmentResponse[]
	>;
}

export async function getElfMetadata() {
	return request('elf-get-metadata') as Promise<TMetadata>;
}

export async function getSections() {
	return request('elf-get-sections') as Promise<TSectionResponse[]>;
}

export async function getQueries() {
	return request('elf-get-queries') as Promise<TSavedQuery[]>;
}

export async function updateQueries(queriesList: any) {
	return request('elf-update-queries', {queriesList}) as Promise<
		TSavedQuery[]
	>;
}

export async function loadElfFile(command: string) {
	return request('elf-load-file', {command}) as Promise<void>;
}

export async function getSourceCode(
	path: string,
	position: number[]
) {
	return request('elf-get-source', {
		path,
		position
	}) as Promise<void>;
}

export async function getPath(path: string) {
	return request('elf-get-path', {
		path
	}) as Promise<boolean>;
}

export async function getSavedOptionsForTableFormat() {
	return request(
		'elf-get-saved-options'
	) as Promise<TSavedTableOptions>;
}

export async function updateSavedOptionsForTableFormat(
	options: TSavedTableOptions
) {
	return request('elf-update-saved-options', {
		options
	}) as Promise<TSavedTableOptions>;
}

export function showErrorMessage(err: string) {
	request('elf-show-error-message', {
		err
	})
		.then()
		.catch(err => {
			console.error(err);
			throw new Error(String(err));
		});
}

export function showInformationMessage(info: string) {
	request('elf-show-info-message', {
		info
	})
		.then()
		.catch(err => {
			console.error(err);
			throw new Error(String(err));
		});
}
