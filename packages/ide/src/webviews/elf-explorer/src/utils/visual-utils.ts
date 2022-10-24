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
import type {
	TSegment,
	TSegmentUnusedSpace
} from '../common/types/memory-layout';
import {SegmentCategory} from '../common/types/memory-layout';
import {convertDecimalToHex, convertHexToDecimal} from './number';

const FACTOR_UNUSED_SEGMENT = 0.035;
const SEGM_FLAG_READ_ONLY = 'R';

export const MIN_SIZE_PERCENTAGE = FACTOR_UNUSED_SEGMENT * 100;

// It's for sizePercetange, height of the segment
export const calculateSegmentPercentage = (
	segmentSize: number,
	totalMemory: number
) => parseFloat(((segmentSize / totalMemory) * 100).toFixed(2));

export const calculateSegmentEndAddress = (
	segment: TSegment
): number => convertHexToDecimal(segment.address) + segment.size;

/**
 *
 * @param segments
 * @returns the segment which has the largest end address
 */
export const getLargestSegment = (segments: TSegment[]): TSegment => {
	const largestSegment = segments.reduce((maxSegment, segment) => {
		const currentAddress =
			convertHexToDecimal(segment.address) + segment.size;
		const maxAddress =
			convertHexToDecimal(maxSegment.address) + maxSegment.size;

		return currentAddress > maxAddress ? segment : maxSegment;
	});

	return largestSegment;
};

export const getBiggestId = (segments: TSegment[]) =>
	Math.max(...segments.map(segment => segment.id));

/**
 * @param smallestAddress - smallest virtual address of segments
 * @param segmentAddress - segment's virtual address
 * @param range
 * @returns offset of segment relative to entire memory, in percentage
 */
export const getOffsetForSegment = (
	smallestAddress: number,
	segmentAddress: number,
	range: number
): number =>
	parseFloat(
		(((segmentAddress - smallestAddress) / range) * 100).toFixed(2)
	);

export const isSmallSegment = (
	segments: TSegment[]
): TSegment | undefined =>
	segments.find(seg => seg.sizePercentage <= MIN_SIZE_PERCENTAGE);

export const removeItemsWithoutSize = (
	segments: TSegment[]
): TSegment[] => {
	const newArr: TSegment[] = [];

	[...segments].forEach((segm: TSegment) => {
		if (segm.size !== 0) newArr.push(segm);
	});

	return newArr;
};

/**
 * If the flags === 'R' then is READ ONLY, otherwise is executable (RE, RW, RWE, E)
 * @param segment
 * @returns
 */
export const isSegmReadOnly = (segment: TSegment): boolean =>
	segment.flags.toString().toUpperCase() === SEGM_FLAG_READ_ONLY;

const sortSegmentsByStartAddress = (segments: TSegment[]) => {
	segments.sort(
		(a, b) =>
			convertHexToDecimal(a.address) - convertHexToDecimal(b.address)
	);
};

export const getNextSegment = (
	segments: TSegment[],
	id: number
): TSegment | undefined => {
	const index = segments.findIndex(item => item.id === id);

	if (index !== -1 && index < segments.length - 1)
		return segments[index + 1];

	return undefined;
};

export const calculateSegments = (segments: TSegment[]) => {
	let matrix: TSegment[][] = [[]];

	sortSegmentsByStartAddress(segments);

	// Since it's sorted by virtual address, first is the smallest
	let smallestAddress = segments[0].address;
	const largestSegment = getLargestSegment(segments);
	const largestAddress =
		convertHexToDecimal(largestSegment.address) + largestSegment.size;
	let totalMemory =
		largestAddress - convertHexToDecimal(smallestAddress);

	// The purpose of calling this here is to have the "category" key in every segment object
	placeSegmentsInCorrectStack(segments, matrix, largestSegment);
	matrix = [[]];

	// This method will change the "segments" array
	// The unused space between segments will be replaced with a new segment
	const {cumulativeGap, size} =
		computeSegmentsWithoutUnusedSpace(segments);

	// Then if a segment of category unused was added on the first position
	// then smallestAddress and totalMemory needs to be updated
	if (size) {
		smallestAddress = (
			convertHexToDecimal(smallestAddress) - size
		).toString(16);
		totalMemory += size;
	}

	// Sort them again after new segments were added
	sortSegmentsByStartAddress(segments);

	// Update total memory
	totalMemory -= cumulativeGap;

	// Compute `size` and `offset`
	calculateSizeAndOffset(segments, smallestAddress, totalMemory);

	// Place segments in the right stack
	placeSegmentsInCorrectStack(segments, matrix, largestSegment);

	if (isSmallSegment(matrix[0])) {
		// This will change de offset for small segments (segment.sizePercentage <= MIN_SIZE_PERCENTAGE)
		// and adjust the other segment's offset and sizePercentage values
		matrix[0] = increaseSizePercentageForSmallSegments(matrix[0]);
	}

	return matrix;
};

const placeSegmentsInCorrectStack = (
	segments: TSegment[],
	matrix: TSegment[][],
	largestSegment: TSegment
): void => {
	segments.forEach((segm: TSegment) => {
		// Take the start address of the largest segment
		const largestStartAddress = convertHexToDecimal(
			largestSegment.address
		);
		const largestEndAddress =
			convertHexToDecimal(largestSegment.address) +
			largestSegment.size;
		// Always assume there is room in main stack (index === 0)
		placeSegmentInCorrectStack(
			segm,
			0,
			matrix,
			largestStartAddress,
			largestEndAddress
		);
	});
};

const placeSegmentInCorrectStack = (
	segm: TSegment,
	index: number,
	matrix: TSegment[][],
	largestStartAddress: number,
	largestEndAddress: number
	// eslint-disable-next-line max-params
) => {
	// Smallest End Address of reference in stack
	const SEA = matrix[index]?.[matrix[index].length - 1]
		? calculateSegmentEndAddress(
				matrix[index]?.[matrix[index].length - 1]
			)
		: undefined;
	// Largest Start Address of reference in stack
	let LSA = index === 0 ? largestStartAddress : largestEndAddress;

	// It means that it's the last segment in memory and should be placed in main stack
	// in the main stack should always be placed segments with smallest address and largest address
	if (LSA === convertHexToDecimal(segm.address))
		LSA = largestEndAddress;

	if (
		SEA &&
		(convertHexToDecimal(segm.address) < SEA ||
			calculateSegmentEndAddress(segm) > LSA)
	) {
		// It overlapps
		segm.category =
			segm.category === SegmentCategory.UNUSED
				? segm.category
				: SegmentCategory.OVERLAPPING;

		placeSegmentInCorrectStack(
			segm,
			index + 1,
			matrix,
			largestStartAddress,
			largestEndAddress
		);
	} else {
		// It does not overlap
		// if segm should be on a new stack, then init with empty array
		if (!matrix[index]) {
			matrix[index] = [];
		}

		segm.category =
			segm.category === SegmentCategory.OVERLAPPING ||
			segm.category === SegmentCategory.UNUSED
				? segm.category
				: SegmentCategory.MAIN;

		matrix[index].push(segm);

		return matrix;
	}
};

/**
 * This method will change `segments` array; it will add new keys and new elements
 * @param segments - list of segments;
 * @returns - The `cumulativeGap` which is total space removed between segments
 */
const computeSegmentsWithoutUnusedSpace = (segments: TSegment[]) => {
	let usedMemSize = 0;
	// If a segment of category unused was added on first position
	let isFirstSegmAdded = false;
	segments.forEach(segm => {
		usedMemSize += segm.size;
	});

	const sizeForUnusedSpace = parseFloat(
		(usedMemSize * FACTOR_UNUSED_SEGMENT).toFixed(2)
	);

	let cumulativeGap = 0;
	let endAddrLastMainSegm = 0;
	const unusedSpaceSegments: TSegmentUnusedSpace[] = [];
	segments.forEach(
		(segm: TSegment, index: number, arr: TSegment[]) => {
			const prevSegm = arr[index - 1];

			if (!prevSegm) {
				// If it's first segm
				// Before first segment, if neccessary, add an unused space segment
				isFirstSegmAdded = addUnusedSegment(
					segments,
					unusedSpaceSegments,
					sizeForUnusedSpace
				);

				segm.computedStartAddr = convertHexToDecimal(segm.address);
				segm.computedEndAddr =
					convertHexToDecimal(segm.address) + segm.size;
				endAddrLastMainSegm =
					convertHexToDecimal(segm.address) + segm.size;

				return;
			}

			let prevEndAddress =
				convertHexToDecimal(prevSegm.address) + prevSegm.size;

			// If prev segm is overlapping and has its end address is smaller then the last main segment end address
			if (
				prevSegm.category === SegmentCategory.OVERLAPPING &&
				prevEndAddress < endAddrLastMainSegm
			) {
				// Then the previous segm is entirely within the last main segment
				// and we need to use the end address of the previous main segment for comparison
				prevEndAddress = endAddrLastMainSegm;
			}

			const currentStartAddress = convertHexToDecimal(segm.address);
			const gapBetweenSegments = currentStartAddress - prevEndAddress;

			if (gapBetweenSegments > sizeForUnusedSpace) {
				// If the gap is bigger than "FACTOR_UNUSED_SEGMENT" then this gap will need to shrink by moving the current segment down to close the gap
				// and also insert an unused space segment
				unusedSpaceSegments.push({
					index,
					address: convertDecimalToHex(prevEndAddress),
					computedStartAddr: prevEndAddress - cumulativeGap,
					computedEndAddr:
						prevEndAddress + sizeForUnusedSpace - cumulativeGap,
					size: sizeForUnusedSpace
				});

				const diff = gapBetweenSegments - sizeForUnusedSpace;
				cumulativeGap += diff;
			}

			segm.computedStartAddr =
				convertHexToDecimal(segm.address) - cumulativeGap;
			segm.computedEndAddr =
				convertHexToDecimal(segm.address) + segm.size - cumulativeGap;

			if (segm.category === SegmentCategory.MAIN) {
				// Keep the end address of last main segment found for reference
				endAddrLastMainSegm =
					convertHexToDecimal(segm.address) + segm.size;
			}
		}
	);

	// Add new segments to the `segments` list
	unusedSpaceSegments.forEach(item => {
		segments.splice(item.index, 0, {
			id: getBiggestId(segments) + item.index + 1,
			type: '0',
			label: 'UNUSED SEGMENT',
			address: item.address,
			computedStartAddr: item.computedStartAddr,
			computedEndAddr: item.computedEndAddr,
			size: item.size,
			flags: '',
			align: 0,
			sections: [],
			sizePercentage: 0,
			offset: 0,
			category: SegmentCategory.UNUSED
		});
	});

	return {
		cumulativeGap,
		size: isFirstSegmAdded ? sizeForUnusedSpace : null
	};
};

const calculateSizeAndOffset = (
	segments: TSegment[],
	smallestAddress: string,
	totalMemory: number
): void => {
	segments.forEach((segment: TSegment) => {
		segment.offset = getOffsetForSegment(
			convertHexToDecimal(smallestAddress),
			segment.computedStartAddr,
			totalMemory
		);

		segment.sizePercentage = calculateSegmentPercentage(
			segment.size,
			totalMemory
		);
	});
};

/**
 * Will look for all segments that have sizePercentage <= 5% and will change sizePercentage = 5%
 * the other segments will be adjusted properly to acomodate this new change
 * so, offset and sizePercentage will be also change for large segments
 * and offset for small segments
 * @param segments
 * @returns
 */
const increaseSizePercentageForSmallSegments = (
	segments: TSegment[]
): TSegment[] => {
	// Total space in percentage units
	const totalPercentage = 100;
	const smallSegments = segments.filter(
		seg => seg.sizePercentage <= MIN_SIZE_PERCENTAGE
	);
	const largeSegments = segments.filter(
		seg => seg.sizePercentage > MIN_SIZE_PERCENTAGE
	);

	// Adjust small segments to have the minimum percentage
	smallSegments.forEach(segm => {
		segm.sizePercentage = MIN_SIZE_PERCENTAGE;
	});

	// Calculate total size taken by small segments
	const totalSmallPercentage =
		smallSegments.length * MIN_SIZE_PERCENTAGE;
	// Calculate remaining percentage available for large segments
	const remainingPercentage = totalPercentage - totalSmallPercentage;
	// Calculate the new size percentage for large segments proportionally
	const totalLargeOriginalPercentage = largeSegments.reduce(
		(acc, seg) => acc + seg.sizePercentage,
		0
	);

	// Recompute sizePercentage for large segments
	largeSegments.forEach(seg => {
		seg.sizePercentage =
			(seg.sizePercentage / totalLargeOriginalPercentage) *
			remainingPercentage;
	});

	// Combine small and large segments back into a single array and sort it
	const adjustedSegments = [...smallSegments, ...largeSegments].sort(
		(a, b) =>
			convertHexToDecimal(a.address) - convertHexToDecimal(b.address)
	);

	const smallestAddress = segments[0].computedStartAddr;
	const largestSegment = getLargestSegment(segments);
	const largestAddress =
		largestSegment.computedStartAddr + largestSegment.size;

	const totalMemory = largestAddress - smallestAddress;

	// Recompute the offsets based on the actual memory addresses
	adjustedSegments.forEach((segm: TSegment, index: number) => {
		if (index === 0) {
			segm.offset = 0;
		} else {
			const prevSegm = adjustedSegments[index - 1];
			const prevEndAddress =
				prevSegm.computedStartAddr + prevSegm.size;
			const gap = segm.computedStartAddr - prevEndAddress;

			segm.offset =
				prevSegm.offset +
				prevSegm.sizePercentage +
				(gap / totalMemory) * totalPercentage;
		}
	});

	return segments;
};

const addUnusedSegment = (
	segments: TSegment[],
	unusedSegments: TSegmentUnusedSpace[],
	sizeForUnusedSpace: number
): boolean => {
	const firstSegmStartAddress = convertHexToDecimal(
		segments[0].address
	);

	if (firstSegmStartAddress > sizeForUnusedSpace) {
		unusedSegments.push({
			index: 0,
			address: convertDecimalToHex(0),
			computedStartAddr: firstSegmStartAddress - sizeForUnusedSpace,
			computedEndAddr: firstSegmStartAddress,
			size: sizeForUnusedSpace
		});

		return true;
	}

	return false;
};

export const getStylesForSegment = (
	segment: TSegment
): Record<string, unknown> => {
	const styles: Record<string, unknown> = {};

	styles.height = `${segment.sizePercentage}%`;
	styles.bottom = `${segment.offset}%`;

	if (
		segment.category === SegmentCategory.OVERLAPPING &&
		segment?.sizePercentage < 2
	)
		styles.height = '2%';

	return styles;
};
