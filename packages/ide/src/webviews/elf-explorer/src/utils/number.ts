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
/**
 * Receive a hexadecimal number and convert it to decimal
 * @param hex string
 * @returns
 */
export const convertHexToDecimal = (hex: string): number =>
	parseInt(hex, 16) || 0;

export const convertDecimalToHex = (decimal: number): string =>
	`0x${decimal.toString(16).toUpperCase().padStart(8, '0')}`;

// Used for Chart representation
export const transformBtoKB = (
	size: number,
	total?: boolean
): string =>
	size > 1024
		? `${(size / 1024).toFixed(2)} KB${total ? ' total' : ''}`
		: `${size} B`;

export const convertBytesToKbOrMb = (value: number) => {
	if (value > 1024 * 1024) {
		return `${(value / (1024 * 1024)).toFixed(2)} MB`;
	} 

	if (value > 1024) {
		return `${(value / 1024).toFixed(2)} KB`;
	}

	return `${value} B`;
};
