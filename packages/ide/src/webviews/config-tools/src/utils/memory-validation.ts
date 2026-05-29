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

import {type MemoryBlock} from '../../../common/types/soc';
import {type Partition} from '../state/slices/partitions/partitions.reducer';
import {type PartitionFormErrors} from '../types/memory';
import {
	areRangesOverlapping,
	getBaseblockFromAddress,
	getBlockMinAlignment,
	getEndAddress
} from './memory';
import {getMemoryAccessOverrideForProject} from './memory-access';
import {getSocCoreList} from './soc-cores';

/**
 * Validates the address of a partition to be created.
 * Checking the following conditions:
 * - Address is required
 * - Address is within the range of the memory type's blocks
 * - Address is aligned to the block minimum alignment
 * - Address is accessible by all of the cores
 * - Address does not overlap with another partition
 *
 * @param activePartition partition being validated
 * @param partitions Currently existing partitions
 * @param blocksForType The blocks that are available for the memory type
 * @returns A string with the error message, or an empty string if the address is valid
 */
export const validateAddress = (
	activePartition: Partition,
	partitions: Partition[],
	blocksForType: MemoryBlock[]
): string => {
	const {startAddress, blockNames, projects} = activePartition;
	const address = parseInt(startAddress, 16);

	if (!blocksForType.length) {
		return 'No valid memory blocks for this type';
	}

	if (
		Number.isNaN(address) ||
		address === undefined ||
		address === null
	) {
		return 'Address is required';
	}

	if (blockNames) {
		const firstBlock = blocksForType.find(
			block => block.Name === blockNames[0]
		);

		if (
			firstBlock?.MinimumAlignment &&
			address % firstBlock.MinimumAlignment !== 0
		) {
			return `Address must be aligned to the block minimum alignment of ${getBlockMinAlignment(firstBlock)}`;
		}
	}

	const baseBlock = getBaseblockFromAddress(blocksForType, address);

	// Check that the address is in a block the cores have access to
	if (
		baseBlock &&
		projects.length &&
		!projects.every(project =>
			getSocCoreList()
				.find(core => core.Id === project.coreId)
				?.Memory.some(block => block.Name === baseBlock.Name)
		)
	) {
		return 'Core does not have access to this memory block';
	}

	// When the blocks are loaded from the SoC, we sort them by start address and can assume they are contiguous
	const memoryTypeStartAddress = parseInt(
		blocksForType[0].AddressStart,
		16
	);
	const memoryTypeEndAddress = parseInt(
		blocksForType[blocksForType.length - 1].AddressEnd,
		16
	);

	if (
		address < memoryTypeStartAddress ||
		address > memoryTypeEndAddress
	) {
		return 'Address is out of range for memory type';
	}

	if (
		partitions.some(p => {
			const {size} = p;
			const startAddress = parseInt(p.startAddress, 16);

			const endAddress = getEndAddress(startAddress, size);

			return areRangesOverlapping(
				startAddress,
				endAddress,
				address,
				address
			);
		})
	) {
		return 'Address overlaps with another partition';
	}

	return '';
};

/**
 * Validates the size of a partition to be created.
 * Checking the following conditions:
 * - Size is required
 * - Size is within the range of the memory type's blocks
 * - Size does not cause partition to overlap with another partition
 * - Core permissions match memory block permissions for each block the partition extends into
 *
 * @param activePartition partition being validated
 * @param partitions Currently existing partitions
 * @param blocksForType The blocks that are available for the memory type
 * @returns A string with the error message, or an empty string if the size is valid
 */
export const validateSize = (
	activePartition: Partition,
	partitions: Partition[],
	blocksForType: MemoryBlock[]
): string => {
	const {size, projects, blockNames} = activePartition;
	const startAddress = parseInt(activePartition.startAddress, 16);

	if (Number.isNaN(size) || size <= 0) {
		return 'Size must be greater than 0';
	}

	const newPartitionEndAddress = getEndAddress(startAddress, size);

	if (activePartition.type && blocksForType.length) {
		const memoryTypeEndAddress = parseInt(
			blocksForType[blocksForType.length - 1].AddressEnd,
			16
		);

		if (newPartitionEndAddress > memoryTypeEndAddress) {
			return 'Size exceeds memory block range';
		}
	}

	if (blocksForType.length) {
		const contiguousMemoryBlocks =
			createContiguousMemoryBlocks(blocksForType);
		const validAgainstContiguousMemoryBlocks =
			isPartitionValidAgainstContiguousMemoryBlocks(
				contiguousMemoryBlocks,
				startAddress,
				activePartition.size
			);

		if (!validAgainstContiguousMemoryBlocks) {
			return 'Size exceeds contiguous memory block range';
		}
	}

	if (
		partitions.some(existingPartition => {
			if (
				!existingPartition.startAddress ||
				!existingPartition.size
			) {
				return false;
			}

			const existingStartAddress = parseInt(
				existingPartition.startAddress,
				16
			);

			const existingEndAddress = getEndAddress(
				existingStartAddress,
				existingPartition.size
			);

			return areRangesOverlapping(
				existingStartAddress,
				existingEndAddress,
				startAddress,
				newPartitionEndAddress
			);
		})
	) {
		return 'Size extends into existing partition';
	}

	if (blockNames) {
		const lastBlock = blocksForType.find(
			block => block.Name === blockNames[blockNames.length - 1]
		);

		if (
			lastBlock?.MinimumAlignment &&
			size % lastBlock.MinimumAlignment !== 0
		) {
			return `Size must be aligned to the block minimum alignment of ${getBlockMinAlignment(lastBlock)}`;
		}
	}

	let returnVal = '';

	projects.forEach(project => {
		const socCore = getSocCoreList().find(
			core => core.Id === project.coreId
		);
		const accessOverride = getMemoryAccessOverrideForProject(
			project.projectId,
			activePartition.type
		);

		// Every block included in the partition must be accessible by the core
		if (
			blockNames.length &&
			!blockNames.every(blockName =>
				Boolean(
					socCore?.Memory.find(block => block.Name === blockName)
				)
			)
		) {
			returnVal = `Core ${socCore?.Name} does not have access to all memory blocks.`;
		}

		// The core will have different permissions for each block it accesses
		// We need to check that the partition permissions match the block permissions
		// NOTE we don't check access overrides here,
		// if they are defined we assume the permissions are handled correctly elsewhere.
		if (returnVal === '' && accessOverride === undefined) {
			const socCoreMemoryInPartition = socCore?.Memory.filter(block =>
				blockNames.includes(block.Name)
			);
			socCoreMemoryInPartition?.forEach(block => {
				if (
					!project.access
						.split('/')
						.every(level => block.Access.includes(level))
				) {
					returnVal =
						'Core permissions do not match memory block permissions';
				}
			});
		}
	});

	return returnVal;
};

type SuperMemoryBlock = {
	start: bigint;
	end: bigint;
};

/**
 * Merges memory blocks into contiguous segments (super-blocks).
 * @param blocks List of blocks of the same type (i.e. RAM only)
 * @returns A list of super-blocks with start and end addresses.
 */
const createContiguousMemoryBlocks = (
	blocks: MemoryBlock[]
): SuperMemoryBlock[] => {
	if (!blocks || blocks.length === 0) return [];

	// Sort it by AddressStart
	const sorted = [...blocks].sort((a, b) =>
		BigInt(a.AddressStart) < BigInt(b.AddressStart) ? -1 : 1
	);

	const superBlocks: SuperMemoryBlock[] = [];
	let current: SuperMemoryBlock = {
		start: BigInt(sorted[0].AddressStart),
		end: BigInt(sorted[0].AddressEnd)
	};

	for (let i = 1; i < sorted.length; i++) {
		const nextStart = BigInt(sorted[i].AddressStart);
		const nextEnd = BigInt(sorted[i].AddressEnd);

		// If the next memory block is right after current (no gap)
		if (nextStart === current.end + 1n) {
			// Update end of super-block if it spreads
			if (nextEnd > current.end) {
				current.end = nextEnd;
			}
		} else {
			// There is a gap, close the super-block and open a new one
			superBlocks.push(current);
			current = {start: nextStart, end: nextEnd};
		}
	}

	superBlocks.push(current);

	return superBlocks;
};

/**
 * Check if there is a super-block which fulfills start/end positions of new partition
 * @param superBlocks Available super-blocks
 * @param start Start addess of new partition
 * @param size Size of new partition
 * @returns Returns true if it is possible to fit new partition into super-block
 */
const isPartitionValidAgainstContiguousMemoryBlocks = (
	superBlocks: SuperMemoryBlock[],
	start: number,
	size: number
): boolean => {
	if (!Number.isInteger(start) || !Number.isInteger(size)) {
		return false;
	}

	const nStart = BigInt(start);
	const nEnd = nStart + BigInt(size) - 1n;

	return superBlocks.some(sb => nStart >= sb.start && nEnd <= sb.end);
};

export const validatePartitionForm = (
	activePartition: Partition,
	partitions: Partition[],
	blocksForType: MemoryBlock[]
) => {
	const errors: PartitionFormErrors = {
		displayName: '',
		type: '',
		cores: '',
		blocks: '',
		startAddress: '',
		size: ''
	};
	let valid = true;
	const nameRegex = /^[_a-zA-Z][_a-zA-Z0-9]*$/;

	if (!activePartition.type) {
		errors.type = 'Type is required';
		valid = false;
	}

	if (activePartition.type && !blocksForType.length) {
		errors.type = 'No valid memory blocks for this type';
		valid = false;
	}

	if (
		!activePartition.displayName ||
		activePartition.displayName.trim() === ''
	) {
		errors.displayName = 'Partition name is required';
		valid = false;
	}

	if (
		activePartition.displayName &&
		/\d/.test(activePartition.displayName[0])
	) {
		errors.displayName =
			'First character must be a letter or underscore';
		valid = false;
	} else if (
		activePartition.displayName &&
		!nameRegex.test(activePartition.displayName)
	) {
		errors.displayName =
			'Only alphanumeric and underscore characters are allowed';
		valid = false;
	}

	if (
		partitions.some(
			p =>
				p.displayName.toLocaleUpperCase().trim() ===
				activePartition.displayName.toLocaleUpperCase().trim()
		)
	) {
		errors.displayName =
			'Partition name must be unique (case-insensitive)';
		valid = false;
	}

	if (!activePartition.projects.length) {
		errors.cores = 'Cores are required';
		valid = false;
	}

	if (
		activePartition.projects.length &&
		activePartition.projects.every(core => !core.owner)
	) {
		errors.cores = 'One core must be an owner';
		valid = false;
	}

	if (activePartition.projects.length && activePartition.type) {
		// Check that each core has access to a block for this type
		const socCores = getSocCoreList();
		const blocksForTypeWithAccess = blocksForType.filter(block =>
			activePartition.projects.every(core =>
				socCores
					.find(c => c.Id === core.coreId)
					?.Memory.some(memory => memory.Name === block.Name)
			)
		);

		if (!blocksForTypeWithAccess.length) {
			errors.blocks = 'No valid memory blocks for the selected cores';
			valid = false;
		}
	}

	const addressError = validateAddress(
		activePartition,
		partitions,
		blocksForType
	);
	errors.startAddress = addressError;
	valid = valid && !addressError;
	const sizeError = validateSize(
		activePartition,
		partitions,
		blocksForType
	);
	errors.size = sizeError;
	valid = valid && !sizeError;

	return {valid, errors};
};
