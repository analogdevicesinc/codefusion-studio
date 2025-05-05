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
import {type Partition} from '../state/slices/partitions/partitions.reducer';
import {getSocMemoryTypes} from './api';
import {ByteUnitMap, type ByteUnit} from '../types/memory';
import {getSocCoreList} from './soc-cores';

const coreMemoryDictionary: Record<string, MemoryBlock> = {};

const coreMemoryBlocks: MemoryBlock[] = [];
export type SocMemoryTypeList = MemoryType[];

let socMemoryTypes: MemoryType[] = [];

if (import.meta.env.MODE === 'development') {
	socMemoryTypes = (window as any).__DEV_SOC__?.MemoryTypes ?? [];
} else {
	socMemoryTypes = (await getSocMemoryTypes()) ?? [];
}

export function getCoreMemoryDictionary(): Record<
	string,
	MemoryBlock
> {
	if (Object.keys(coreMemoryDictionary).length === 0) {
		const socCores = getSocCoreList();

		socCores.forEach(core => {
			core.Memory.forEach(memoryBlock => {
				if (!(memoryBlock.Name in coreMemoryDictionary)) {
					coreMemoryDictionary[memoryBlock.Name] = memoryBlock;
				}
			});
		});
	}

	return coreMemoryDictionary;
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
	if (socMemoryTypes.length === 0) {
		const localStorageMemoryTypes =
			localStorage.getItem('MemoryTypes');

		if (localStorageMemoryTypes) {
			socMemoryTypes = JSON.parse(localStorageMemoryTypes);
		}
	}

	return socMemoryTypes;
}

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
