/**
 *
 * Copyright (c) 2025-2026 Analog Devices, Inc.
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

import {validateAddress} from './memory-validation';
import {type Partition} from '../state/slices/partitions/partitions.reducer';

const L2_SRAM_BLOCK = {
	Name: 'L2_SRAM',
	Description: '',
	AddressStart: '0x20000000',
	AddressEnd: '0x201FFFFF',
	Width: 8,
	Access: 'R/W',
	Type: 'RAM',
	Location: 'Internal'
};

const L2_SRAM_SIZE =
	parseInt(L2_SRAM_BLOCK.AddressEnd, 16) -
	parseInt(L2_SRAM_BLOCK.AddressStart, 16) +
	1;

const createPartition = (
	overrides: Partial<Partition> = {}
): Partition => ({
	displayName: 'TestPartition',
	type: 'RAM',
	baseBlock: L2_SRAM_BLOCK,
	blockNames: ['L2_SRAM'],
	startAddress: '20000000',
	size: 0,
	displayUnit: undefined,
	projects: [],
	...overrides
});

describe('validateAddress', () => {
	describe('block fully occupied', () => {
		it('should return an overlap error when the block is fully occupied', () => {
			const existingPartition = createPartition({
				displayName: 'Filler',
				blockNames: ['L2_SRAM'],
				startAddress: '20000000',
				size: L2_SRAM_SIZE
			});

			const activePartition = createPartition({
				displayName: 'New',
				startAddress: '20000000',
				size: 1024
			});

			const result = validateAddress(
				activePartition,
				[existingPartition],
				[L2_SRAM_BLOCK]
			);

			expect(result).to.equal(
				'Address overlaps with another partition'
			);
		});

		it('should not return an error when the block has available space', () => {
			const halfSize = L2_SRAM_SIZE / 2;

			const existingPartition = createPartition({
				displayName: 'Partial',
				blockNames: ['L2_SRAM'],
				startAddress: '20000000',
				size: halfSize
			});

			// ActivePartition address is after the existing partition
			const activePartition = createPartition({
				displayName: 'New',
				startAddress: '20100000',
				size: 1024
			});

			const result = validateAddress(
				activePartition,
				[existingPartition],
				[L2_SRAM_BLOCK]
			);

			expect(result).to.equal('');
		});

		it('should not return an error when there are no existing partitions', () => {
			const activePartition = createPartition({
				displayName: 'New',
				startAddress: '20000000',
				size: 1024
			});

			const result = validateAddress(
				activePartition,
				[],
				[L2_SRAM_BLOCK]
			);

			expect(result).to.equal('');
		});
	});
});
