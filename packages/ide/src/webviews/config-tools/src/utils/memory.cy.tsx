/**
 *
 * Copyright (c) 2025 Analog Devices, Inc.
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

import {
	convertDecimalToHex,
	convertMemoryBetweenUnits,
	formatHexPrefix,
	formatTotalAndAvailableMemory,
	getBlockMinAlignment
} from './memory';

describe('Memory utility functions', () => {
	describe('convertMemoryBetweenUnits', () => {
		it('should convert bytes to KB', () => {
			const bytes = 1024;
			const kb = convertMemoryBetweenUnits(bytes, 'bytes', 'KB');
			expect(kb).to.equal(1);
		});

		it('should convert KB to bytes', () => {
			const kb = 1;
			const bytes = convertMemoryBetweenUnits(kb, 'KB', 'bytes');
			expect(bytes).to.equal(1024);
		});

		it('should convert MB to bytes', () => {
			const mb = 1;
			const bytes = convertMemoryBetweenUnits(mb, 'MB', 'bytes');
			const expectedBytes = mb * 1024 * 1024;
			expect(bytes).to.equal(expectedBytes);
		});
	});

	describe('formatTotalAndAvailableMemory', () => {
		it('should format total and available memory correctly with a decimal', () => {
			const totalMemory = 1024 * 1024; // 1 MB
			const availableMemory = 512 * 1024; // 0.5 MB
			const formattedMemory = formatTotalAndAvailableMemory(
				totalMemory,
				availableMemory
			);
			expect(formattedMemory).to.equal('0.50/1 MB');
		});

		it('should format total and available memory correctly as a whole number', () => {
			const totalMemory = 1024 * 1024; // 1 MB
			const availableMemory = 512 * 1024; // 0.5 MB
			const formattedMemory = formatTotalAndAvailableMemory(
				totalMemory,
				availableMemory,
				true
			);
			expect(formattedMemory).to.equal('1/1 MB');
		});
	});

	describe('formatHexPrefix', () => {
		it('should format a number to hex with prefix', () => {
			const hex = formatHexPrefix('0x2000ffff');
			expect(hex).to.equal('0x2000FFFF');
		});
	});

	describe('convertDecimalToHex', () => {
		it('should convert a decimal number to hex', () => {
			const hex = convertDecimalToHex(10);
			expect(hex).to.equal('0x0000000A');
		});
	});

	describe('getBlockMinAlignment', () => {
		it('should return KB when the min alignment is divisible by 1024', () => {
			const memoryBlock = {
				Name: 'sysram0',
				Description: 'System RAM Block 0',
				AddressStart: '0x20000000',
				AddressEnd: '0x2001ffff',
				Width: 8,
				Access: 'R/W',
				Type: 'RAM',
				Location: 'Internal',
				MinimumAlignment: 1024
			};

			const memoryType = getBlockMinAlignment(memoryBlock);

			expect(memoryType).to.equal('1 KB');
		});

		it('should return Bytes when the min alignment is not divisible by 1024', () => {
			const memoryBlock = {
				Name: 'sysram0',
				Description: 'System RAM Block 0',
				AddressStart: '0x20000000',
				AddressEnd: '0x2001ffff',
				Width: 8,
				Access: 'R/W',
				Type: 'RAM',
				Location: 'Internal',
				MinimumAlignment: 500
			};

			const memoryType = getBlockMinAlignment(memoryBlock);

			expect(memoryType).to.equal('500 Bytes');
		});
	});
});
