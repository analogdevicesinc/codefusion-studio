/**
 *
 * Copyright (c) 2026 Analog Devices, Inc.
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

export const PUBLIC_KEY_FORMAT_OPTIONS = [
	{
		label: 'Hash',
		value: 'hash',
		dataTest: 'key-format-hash'
	},
	{
		label: 'Full',
		value: 'full',
		dataTest: 'key-format-full'
	}
];

export const HEADER_SIZE_UNIT_OPTIONS = [
	{value: 'bytes', label: 'Bytes'},
	{value: 'KB', label: 'KB'}
];

export const SLOT_SIZE_UNIT_OPTIONS = [
	{value: 'KB', label: 'KB'},
	{value: 'MB', label: 'MB'}
];

export const SWAP_ALIGNMENT_OPTIONS = [
	{value: '1', label: '1 byte'},
	{value: '2', label: '2 bytes'},
	{value: '4', label: '4 bytes'},
	{value: '8', label: '8 bytes'},
	{value: '16', label: '16 bytes'},
	{value: '32', label: '32 bytes'}
];

export const DEFAULT_SWAP_ALIGNMENT = '4';

export const DEFAULT_HEADER_SIZE_BYTES = 32;

export const DEFAULT_SLOT_SIZE_KB = 4;
export const DEFAULT_SLOT_SIZE_UNIT = 'KB' as const;

export const MAX_NAME_LENGTH = 50;
export const MAX_TEXT_ARGUMENTS_LENGTH = 255;

/**
 * Strips characters that are not alphanumeric, spaces, hyphens, or underscores.
 */
export function sanitizeName(value: string): string {
	return value.replace(/[^a-zA-Z0-9 _-]/g, '');
}
