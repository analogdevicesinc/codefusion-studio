/**
 *
 * Copyright (c) 2024 - 2025 Analog Devices, Inc.
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

import type {
	MemoryBlock,
	MemoryType
} from '../../../common/types/soc';
import {
	type PartitionCore,
	type Partition
} from '../state/slices/partitions/partitions.reducer';
import {ByteUnitMap, type ByteUnit} from '../types/memory';
import {BYTE_UNITS} from '../constants/memory';
import {getSocCoreList} from './soc-cores';
import {SocCoreMemory} from 'cfs-plugins-api';

const coreMemoryDictionary: Record<string, MemoryBlock> = {};
const coreMemoryAliasDictionary: Record<string, MemoryAlias[]> = {};

const coreMemoryBlocks: MemoryBlock[] = [];
export type SocMemoryTypeList = MemoryType[];

let socMemoryTypes: MemoryType[] = [];

/**
 * Initializes the SoC memory types.
 * Should be called once at app startup.
 */
export function initializeSocMemoryTypes(
	memoryTypes: MemoryType[] | undefined
) {
	socMemoryTypes = memoryTypes ?? [];
}

export function getCoreMemoryDictionary(): Record<
	string,
	MemoryBlock
> {
	if (Object.keys(coreMemoryDictionary).length === 0) {
		const socCores = getSocCoreList();

		socCores.forEach(core => {
			core.Memory.forEach(memoryBlock => {
				// We don't return memory references
				if ('AliasBaseAddress' in memoryBlock) return;

				if (!(memoryBlock.Name in coreMemoryDictionary)) {
					coreMemoryDictionary[memoryBlock.Name] =
						memoryBlock as SocCoreMemory;
				}
			});
		});
	}

	return coreMemoryDictionary;
}

// For Cypress Tests.
// Should be called in tests to ensure clean state.
export function resetCoreMemoryDictionary() {
	// Clear the dictionary by removing all keys
	for (const key in coreMemoryDictionary) {
		if (
			Object.prototype.hasOwnProperty.call(coreMemoryDictionary, key)
		) {
			// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
			delete coreMemoryDictionary[key];
		}
	}
}

export type MemoryAlias = {
	Name: string;
	CoreId: string;
	AliasType: string;
	AliasBaseAddress: string;
};

export function getCoreMemoryAliasDictionary(): Record<
	string,
	MemoryAlias[]
> {
	if (Object.keys(coreMemoryAliasDictionary).length === 0) {
		const socCores = getSocCoreList();

		socCores.forEach(core => {
			core.Memory.forEach(memoryBlock => {
				if (!('AliasBaseAddress' in memoryBlock)) return;
				const {Name} = memoryBlock;

				if (!coreMemoryAliasDictionary[Name]) {
					coreMemoryAliasDictionary[Name] = [];
				}

				coreMemoryAliasDictionary[Name].push({
					Name: memoryBlock.Name,
					AliasBaseAddress: memoryBlock.AliasBaseAddress ?? '',
					AliasType: memoryBlock.AliasType ?? '',
					CoreId: core.Id
				});
			});
		});
	}

	return coreMemoryAliasDictionary;
}

/**
 * Returns memory aliases for given block name.
 * Uses getCoreMemoryAliasDictionary to retrieve memory aliases.
 * Filters by coreIds.
 *
 * @param memoryName - Memory block name.
 * @param coreIds - List of core IDs to filter by.
 * @returns Filtered list of MemoryAlias[].
 */

export function getCoreMemoryAliases(
	memoryName: string,
	coreIds: string[]
): MemoryAlias[] {
	const aliases = getCoreMemoryAliasDictionary()[memoryName] ?? [];

	if (!coreIds?.length) return [];

	return aliases.filter(alias => coreIds.includes(alias.CoreId));
}

export function getAddressOffset(
	baseAddress: string,
	address: string
) {
	return parseInt(address, 16) - parseInt(baseAddress, 16);
}

export function offsetAddress(address: string, offset: number) {
	return (parseInt(address, 16) + offset).toString(16);
}

export function getCoreMemoryBlocks(): MemoryBlock[] {
	if (coreMemoryBlocks.length === 0) {
		// Attempt to populate the pin dictionary from localStorage (for testing purposes)
		const localStorageBlocks = localStorage.getItem('MemoryBlocks');

		if (localStorageBlocks) {
			(JSON.parse(localStorageBlocks) as MemoryBlock[]).forEach(
				block => {
					coreMemoryBlocks.push(block);
				}
			);
		} else {
			const dict = getCoreMemoryDictionary();

			Object.values(dict)
				.sort((a, b) =>
					parseInt(a.AddressStart, 16) > parseInt(b.AddressStart, 16)
						? 1
						: -1
				)
				.forEach(block => {
					coreMemoryBlocks.push(block);
				});
		}
	}

	return coreMemoryBlocks;
}

export function getMemoryTypes(): string[] {
	return Array.from(
		new Set(getCoreMemoryBlocks().map(block => block.Type))
	);
}

export const getPartitionBlockNames = (
	memoryBlocks: MemoryBlock[],
	address: number,
	size: number
): string[] => {
	const endingAddress = getEndAddress(address, size);

	return memoryBlocks
		.filter(block =>
			isOverlappingPartition(endingAddress, address, block)
		)
		.map(block => block.Name);
};

export const getBaseblockFromAddress = (
	memoryBlocks: MemoryBlock[],
	address: number
): MemoryBlock | undefined =>
	memoryBlocks.find(
		block =>
			address >= parseInt(block.AddressStart, 16) &&
			address <= parseInt(block.AddressEnd, 16)
	);

export const convertMemoryBetweenUnits = (
	size: number,
	fromUnit: ByteUnit,
	toUnit: ByteUnit
): number => (size * ByteUnitMap[fromUnit]) / ByteUnitMap[toUnit];

const displayFloatOrInt = (value: number): string => {
	if (Number.isInteger(value)) {
		return value.toString();
	}

	return value.toFixed(2);
};

export const formatTotalAndAvailableMemory = (
	total: number,
	available: number,
	returnWholeNumber = false
): string => {
	const totalKb = total / 1024;
	const availableKb = available / 1024;

	if (total >= 1024 && totalKb < 1024) {
		if (returnWholeNumber) {
			return `${Math.round(availableKb)}/${Math.round(totalKb)} KB`;
		}

		return `${displayFloatOrInt(availableKb)}/${displayFloatOrInt(totalKb)} KB`;
	}

	const totalMb = totalKb / 1024;
	const availableMb = availableKb / 1024;

	if (totalMb < 1024) {
		if (returnWholeNumber) {
			return `${Math.round(availableMb)}/${Math.round(totalMb)} MB`;
		}

		return `${displayFloatOrInt(availableMb)}/${displayFloatOrInt(totalMb)} MB`;
	}

	const totalGb = totalMb / 1024;
	const availableGb = availableMb / 1024;

	if (totalGb < 1024) {
		if (returnWholeNumber) {
			return `${Math.round(availableGb)}/${Math.round(totalGb)} GB`;
		}

		return `${displayFloatOrInt(availableGb)}/${displayFloatOrInt(totalGb)} GB`;
	}

	return `${displayFloatOrInt(available)}/${displayFloatOrInt(total)} B`;
};

export const getPartitionMemoryInBlock = (
	partitionEndAddress: number,
	partitionStartAddress: number,
	memoryBlock: MemoryBlock
): number =>
	Math.min(
		partitionEndAddress,
		parseInt(memoryBlock.AddressEnd, 16)
	) -
	Math.max(
		partitionStartAddress,
		parseInt(memoryBlock.AddressStart, 16)
	) +
	1;

export const getTotalBlockMemory = (
	memoryBlock: MemoryBlock
): number =>
	parseInt(memoryBlock.AddressEnd, 16) +
	1 -
	parseInt(memoryBlock.AddressStart, 16);

export const getEndAddress = (
	startAddress: number,
	size: number
): number => startAddress + size - 1;

export const areRangesOverlapping = (
	firstRangeStartAddress: number,
	firstRangeEndAddress: number,
	secondRangeStartAddress: number,
	secondRangeEndAddress: number
): boolean =>
	Math.min(firstRangeEndAddress, secondRangeEndAddress) >=
	Math.max(firstRangeStartAddress, secondRangeStartAddress);

export const isOverlappingPartition = (
	endAddress: number,
	startAddress: number,
	memoryBlock: MemoryBlock
): boolean =>
	areRangesOverlapping(
		startAddress,
		endAddress,
		parseInt(memoryBlock.AddressStart, 16),
		parseInt(memoryBlock.AddressEnd, 16)
	);

export const getPartitionsInBlock = (
	partitions: Partition[],
	memoryBlock: MemoryBlock
) =>
	partitions
		.filter(partition =>
			partition.blockNames.includes(memoryBlock.Name)
		)
		.sort(
			(a, b) =>
				parseInt(a.startAddress, 16) - parseInt(b.startAddress, 16)
		);

export const getTotalPartitionMemorySize = (
	partitionData: Partition[]
) => {
	const totalMemorySize = partitionData.reduce(
		(acc, obj) => (obj.size ? acc + obj.size : acc),
		0
	);

	return totalMemorySize;
};

export const calculatePartitionOffset = (
	partition: Partition,
	startingAddress: number,
	endingAddress: number
) => {
	const addressDiff = endingAddress - startingAddress;
	const partitionStartAddress = parseInt(partition.startAddress, 16);

	if (
		partitionStartAddress === undefined ||
		partitionStartAddress <= startingAddress
	) {
		return 0;
	}

	const offset =
		((partitionStartAddress - startingAddress) / addressDiff) * 100;

	return offset;
};

export const calculateBlockWidth = (
	block: MemoryBlock,
	memoryBlocks: MemoryBlock[]
): number => {
	const totalBlocksMemory = memoryBlocks.reduce(
		(acc, block) => acc + getTotalBlockMemory(block),
		0
	);

	const blockMemory = getTotalBlockMemory(block);

	const percentage = (blockMemory / totalBlocksMemory) * 100;

	return percentage;
};

export const calulatePartitionWidth = (
	partition: Partition,
	memoryBlock: MemoryBlock
): number => {
	if (
		partition.startAddress === undefined ||
		partition.size === undefined
	)
		return 0;

	const partitionStartAddress = parseInt(partition.startAddress, 16);

	const endAddress = getEndAddress(
		partitionStartAddress,
		partition.size
	);

	const blockSize = getTotalBlockMemory(memoryBlock);

	const memoryInBlock = getPartitionMemoryInBlock(
		endAddress,
		partitionStartAddress,
		memoryBlock
	);

	return (memoryInBlock / blockSize) * 100;
};

export const calculateMultiBlockPartitionWidth = (
	partition: Partition,
	startingAddress: string,
	endingAddress: string
): number => {
	const blocksStartingAddress = parseInt(startingAddress, 16);
	const blocksEndingAddress = parseInt(endingAddress, 16);

	const totalBlockRange = blocksEndingAddress - blocksStartingAddress;

	if (
		partition.size === undefined ||
		partition.startAddress === undefined
	)
		return 0;

	const partitionStartAddress = parseInt(partition.startAddress, 16);
	const partitionEndAddress = getEndAddress(
		partitionStartAddress,
		partition.size
	);

	if (partitionEndAddress >= blocksEndingAddress) {
		return 100;
	}

	return (partition.size / totalBlockRange) * 100;
};

export const convertDecimalToHex = (
	decimal: number | undefined
): string =>
	`0x${decimal?.toString(16).toUpperCase().padStart(8, '0')}`;

export const convertBytesToKbOrMb = (
	value: number,
	returnWholeKb = false
) => {
	if (value >= 1024 * 1024) {
		return `${(value / (1024 * 1024)).toFixed(2)} MB`;
	}

	if (value >= 1024) {
		if (returnWholeKb) {
			return `${Math.round(value / 1024)} KB`;
		}

		return `${(value / 1024).toFixed(2)} KB`;
	}

	return `${value} B`;
};

export const getOccupiedMemory = (
	partition: Partition,
	memoryBlock: MemoryBlock
): number => {
	if (
		partition.startAddress === undefined ||
		partition.size === undefined
	)
		return 0;

	const partitionStartAddress = parseInt(partition.startAddress, 16);
	const partitionEndAddress = getEndAddress(
		partitionStartAddress,
		partition.size
	);

	return getPartitionMemoryInBlock(
		partitionEndAddress,
		partitionStartAddress,
		memoryBlock
	);
};

export const getRemainingMemoryInBlock = (
	totalMemory: number,
	partitions: Partition[],
	memoryBlock: MemoryBlock
): number => {
	const totalPartitionMemory = partitions?.reduce(
		(acc, partition) =>
			acc + getOccupiedMemory(partition, memoryBlock),
		0
	);

	return totalMemory - totalPartitionMemory;
};

export const getBlocksInPartition = (
	memoryBlocks: MemoryBlock[],
	blockNames: string[]
) => memoryBlocks.filter(block => blockNames.includes(block.Name));

export function getSocMemoryTypeList(): SocMemoryTypeList {
	return socMemoryTypes;
}

/**
 * Filters partition if it is volatile type
 * @param partitionData partition []
 * @param memoryTypes
 * @returns volatile partitions
 */
export function getVolatileData(
	partitionData: Partition[],
	memoryTypes: MemoryType[]
) {
	return partitionData.filter(partition =>
		memoryTypes?.some(
			item => item.Name === partition.type && item.IsVolatile
		)
	);
}

/**
 * Filters partition if it is non-volatile type
 * @param partitionData partition []
 * @param memoryTypes
 * @returns non-volatile partitions
 */
export function getNonVolatileData(
	partitionData: Partition[],
	memoryTypes: MemoryType[]
) {
	return partitionData.filter(partition =>
		memoryTypes?.some(
			item => item.Name === partition.type && !item.IsVolatile
		)
	);
}

/**
 * Converts a hex string to uppercase without converting 0x
 * @param hex string to convert
 * @returns uppercase string with lowercase 0x
 */
export function formatHexPrefix(hex: string): string {
	return hex.substring(0, 2) + hex.slice(2).toUpperCase();
}

export function getBlockMinAlignment(
	memoryBlock: MemoryBlock
): string {
	if (!memoryBlock.MinimumAlignment) return '';

	if (memoryBlock.MinimumAlignment % 1024 === 0) {
		return `${memoryBlock.MinimumAlignment / 1024} KB`;
	}

	return `${memoryBlock.MinimumAlignment} Bytes`;
}

export function getAvailableMemory(
	block: MemoryBlock,
	partitions: Partition[]
) {
	const totalMemory = getTotalBlockMemory(block);
	const partitionsInBlock = getPartitionsInBlock(partitions, block);
	const remainingMemory = getRemainingMemoryInBlock(
		totalMemory,
		partitionsInBlock,
		block
	);

	return remainingMemory;
}

/**
 * Checks if a memory block if occupied by a partition .
 *
 * @param block - memory block.
 * @param sidebarParition - side bar parition
 * @param partitions - partitions
 * @returns false if block has available memory and true if it is fully ocuppied .
 */

export const isBlockOccupied = (
	block: MemoryBlock,
	sidebarPartition: Partition,
	partitions: Partition[]
): boolean => {
	let filteredParitions: Partition[] = [];

	if (sidebarPartition.size) {
		filteredParitions = partitions.filter(
			parition =>
				sidebarPartition.displayName !== parition.displayName
		);
	}

	const remainingMemory = getAvailableMemory(
		block,
		filteredParitions.length ? filteredParitions : partitions
	);

	return !remainingMemory;
};

/**
 * Checks if each core has access to the block .
 *
 * @param block - memory block.
 * @param cores - parition cores
 * @param memoryType
 * @returns false if core has access to the block and true if it doesn't .
 */

export const isBlockDisabled = (
	block: MemoryBlock,
	cores: PartitionCore[],
	memoryType: string
): boolean =>
	cores.reduce((acc, core) => {
		const socCore = getSocCoreList().find(c => c.Id === core.coreId);

		if (
			socCore?.Memory.find(
				memory =>
					'Type' in memory &&
					memory.Type === memoryType &&
					memory.Name === block.Name
			)
		) {
			return acc;
		}

		return true;
	}, false);

const parseHex = (hex: string) => parseInt(hex, 16);

/**
 * Returns a start address from available memory block.
 *
 * @param block - memory block.
 * @param partitions - partitions
 * @returns startAddress from the available memory block.
 */

export const getFirstAvailableAddressFromBlock = (
	block: MemoryBlock,
	partitions: Partition[]
): number => {
	const blockStart = parseHex(block.AddressStart);
	const blockEnd = parseHex(block.AddressEnd);

	const memoryPartitions = partitions
		.filter(p => p.baseBlock.Type === block.Type)
		.sort(
			(a, b) => parseHex(a.startAddress) - parseHex(b.startAddress)
		);

	// No partitions → free at block start
	if (memoryPartitions.length === 0) return blockStart;

	// Check if any partition overlaps this block’s start amd offset start
	const overflowPartition = memoryPartitions.find(p => {
		const start = parseHex(p.startAddress);
		const end = start + p.size;

		return (
			start < blockStart &&
			end > blockStart &&
			p.baseBlock.Type === block.Type
		);
	});

	if (overflowPartition) {
		const end =
			parseHex(overflowPartition.startAddress) +
			overflowPartition.size;

		return Math.min(end, blockEnd);
	}

	// No partitions in this block & NO overlaps → free at block start
	const partitionInBlock = memoryPartitions.filter(
		p => p.baseBlock.Name === block.Name
	);
	if (partitionInBlock.length === 0) return blockStart;

	// If first partition in this block doesn’t start at block start → free at block start
	const firstStart = parseHex(partitionInBlock[0].startAddress);
	if (firstStart !== blockStart) return blockStart;

	// Check for first gap between partitions
	let offset = blockStart;

	for (const p of partitionInBlock) {
		const start = parseHex(p.startAddress);
		const end = start + p.size;

		if (start <= offset) {
			offset = Math.max(offset, end);
		} else {
			// Gap found
			break;
		}
	}

	return offset;
};

export const getSizeStepValue = (
	minAlignment: number | undefined,
	unit: ByteUnit
): number => {
	if (minAlignment && minAlignment > ByteUnitMap[unit]) {
		return minAlignment / ByteUnitMap[unit];
	}

	return 1;
};

export const getTotalBlockMemoryByType = (
	memoryBlocks: MemoryBlock[]
): number => {
	const total = memoryBlocks.reduce(
		(acc, block) => (block ? acc + getTotalBlockMemory(block) : acc),
		0
	);

	return total;
};

/** This is a temporary fix.
 * Since convertBytesToKbOrMb is being used in several places.
 * This will be handled in the next story.
 */
export const formatBytesToKbOrMb = (
	value: number,
	returnWholeKb = false
) => {
	if (value >= 1024 * 1024) {
		return `${displayFloatOrInt(value / (1024 * 1024))} MB`;
	}

	if (value >= 1024) {
		if (returnWholeKb) {
			return `${Math.round(value / 1024)} KB`;
		}

		return `${displayFloatOrInt(value / 1024)} KB`;
	}

	return `${displayFloatOrInt(value)} B`;
};

export const getTotalPartitionForMemoryType = (
	partitions: Partition[],
	type: string
): number => {
	const total = partitions.reduce(
		(acc, partition) =>
			partition.type === type ? acc + partition.size : acc,
		0
	);

	return total;
};

export const mapDisplayUnit = (
	unit: unknown
): ByteUnit | undefined => {
	if (
		typeof unit === 'string' &&
		BYTE_UNITS.includes(unit as ByteUnit)
	) {
		return unit as ByteUnit;
	}

	return undefined;
};

export const getCleanDivisibleSizeUnit = (size: number): ByteUnit => {
	if (size % (1024 * 1024) === 0) {
		return 'MB';
	}

	if (size % 1024 === 0) {
		return 'KB';
	}

	return 'bytes';
};
