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

import type {Gasket} from '@common/types/soc';
import type {DFGStream} from 'cfs-plugins-api';
import {validateDFGErrors} from './dfg-validations';
import type {GasketState} from './gasket.reducer';
import {getGasketDictionary} from '../../../utils/dfg';

// Types for better type safety
type StreamsByGasket = Record<string, DFGStream[]>;

type StreamComputationResult = {
	updatedStreams: DFGStream[];
	inputStreamMap: StreamsByGasket;
	outputStreamMap: StreamsByGasket;
};

type MovedStream = {
	fromIndex: number;
	toIndex: number;
};

/**
 * Returns a tuple of booleans indicating if the gasket has a fixed input and output buffer size
 */
export function isGasketIOBufferSizeFixed(gasket: Gasket): {
	hasFixedInputStream: boolean;
	hasFixedOutputStream: boolean;
} {
	return {
		hasFixedInputStream:
			gasket.MinInputStreamBufferSize === undefined,
		hasFixedOutputStream:
			gasket.MinOutputStreamBufferSize === undefined
	};
}

/**
 * Main entry point for recomputing stream properties
 */
export function recomputeStreams(state: GasketState): void {
	// Run the computation
	const result = computeStreamProperties(state.Streams);

	// Update the State
	state.Streams = result.updatedStreams;
	state.GasketInputStreamMap = result.inputStreamMap;
	state.GasketOutputStreamMap = result.outputStreamMap;

	// Validate the DFG for errors
	const errors = validateDFGErrors(
		result.updatedStreams,
		state.GasketBufferSizes
	);

	// Update the state with the errors
	state.GasketErrors = errors.gasketErrors;
	state.StreamErrors = errors.streamErrors;
}

export function computeStreamProperties(
	streams: DFGStream[]
): StreamComputationResult {
	const updatedStreams = streams.map(stream => ({
		...stream,
		Source: {...stream.Source},
		Destinations: stream.Destinations.map(destination => ({
			...destination
		}))
	}));

	const {movedInputStreams} = updateStreamIndices(updatedStreams);

	// Group and sort streams by gasket
	// Per Input and Output streams
	const {inputStreamsPerGasket, outputStreamsPerGasket} =
		groupAndSortStreamsByGasket(updatedStreams);

	updateInputStreamProperties(inputStreamsPerGasket);
	updateOutputStreamProperties(outputStreamsPerGasket);

	fixTiedStreamIndices(movedInputStreams, outputStreamsPerGasket);

	return {
		updatedStreams,
		inputStreamMap: inputStreamsPerGasket,
		outputStreamMap: outputStreamsPerGasket
	};
}

/**
 * Groups streams by gasket and sorts them by buffer size (descending)
 */
export function groupAndSortStreamsByGasket(streams: DFGStream[]): {
	inputStreamsPerGasket: StreamsByGasket;
	outputStreamsPerGasket: StreamsByGasket;
} {
	const inputStreamsPerGasket = groupStreamsByDestination(streams);
	const outputStreamsPerGasket = groupStreamsBySource(streams);

	// Sort by buffer size (descending) for optimal memory allocation
	sortStreamsByBufferSize(inputStreamsPerGasket, 'input');
	sortStreamsByBufferSize(outputStreamsPerGasket, 'output');

	return {inputStreamsPerGasket, outputStreamsPerGasket};
}

/**
 * Groups streams by their destination gasket
 * A stream with multiple destinations will be included in multiple gasket groups
 */
function groupStreamsByDestination(
	streams: DFGStream[]
): StreamsByGasket {
	return streams.reduce<StreamsByGasket>((acc, stream) => {
		// Handle multiple destinations - add stream to each destination gasket's group
		for (const destination of stream.Destinations) {
			const gasketName = destination.Gasket;
			acc[gasketName] = acc[gasketName] || [];
			acc[gasketName].push(stream);
		}

		return acc;
	}, {});
}

/**
 * Groups streams by their source gasket
 */
function groupStreamsBySource(streams: DFGStream[]): StreamsByGasket {
	return streams.reduce<StreamsByGasket>((acc, stream) => {
		const gasketName = stream.Source.Gasket;
		acc[gasketName] = acc[gasketName] || [];
		acc[gasketName].push(stream);

		return acc;
	}, {});
}

/**
 * Sorts streams within each gasket by buffer size (descending)
 */
function sortStreamsByBufferSize(
	streamsPerGasket: StreamsByGasket,
	streamType: 'input' | 'output'
): void {
	for (const gasketName in streamsPerGasket) {
		if (
			Object.prototype.hasOwnProperty.call(
				streamsPerGasket,
				gasketName
			)
		) {
			const streams = streamsPerGasket[gasketName];

			if (streams.length > 1) {
				streams.sort((a, b) => {
					const bufferSizeA =
						streamType === 'input'
							? (a.Destinations.find(
									dest => dest.Gasket === gasketName
								)?.BufferSize ?? 0)
							: (a.Source.BufferSize ?? 0);
					const bufferSizeB =
						streamType === 'input'
							? (b.Destinations.find(
									dest => dest.Gasket === gasketName
								)?.BufferSize ?? 0)
							: (b.Source.BufferSize ?? 0);

					return bufferSizeB - bufferSizeA;
				});
			}
		}
	}
}

/**
 * Computes source endpoints and stream indices for output streams
 */
function updateInputStreamProperties(
	inputStreamsPerGasket: StreamsByGasket
) {
	Object.entries(inputStreamsPerGasket).forEach(
		([gasket, streams]) => {
			streams.forEach((stream, i) => {
				const destination = stream.Destinations.find(
					dest => dest.Gasket === gasket
				);

				if (destination) {
					destination.BufferAddress = streams
						.slice(0, i)
						.reduce(
							(acc, s) =>
								acc +
								(s.Destinations.find(d => d.Gasket === gasket)
									?.BufferSize ?? 0),
							0
						);
				}
			});
		}
	);
}

/**
 * Updates the BufferAddress and StreamId
 */
function updateOutputStreamProperties(
	outputStreamsPerGasket: StreamsByGasket
) {
	const gasketMap = getGasketDictionary();
	Object.entries(outputStreamsPerGasket).forEach(
		([gasket, streams]) => {
			streams.forEach((stream, i) => {
				stream.Source.BufferAddress = streams
					.slice(0, i)
					.reduce((acc, s) => acc + (s.Source.BufferSize ?? 0), 0);

				// Don't calculate StreamId for tied streams as they are precalculated based on the tied input streams
				if (!gasketMap[gasket].InputAndOutputBuffersTied) {
					stream.StreamId =
						gasketMap[gasket].OutputStreams[
							stream.Source.Index
						].Index;
				}
			});
		}
	);
}

/**
 * Sets the source and destination indices based on the order of creation
 * and with that the order they should appear in the UI
 *
 * instead of going through all streams
 */
function updateStreamIndices(streams: DFGStream[]): {
	movedOutputStreams: Record<string, MovedStream>;
	movedInputStreams: Record<string, MovedStream>;
} {
	const sourceIndexMap: Record<string, number> = {};
	const destinationIndexMap: Record<string, number> = {};
	const gasketMap = getGasketDictionary();

	const movedOutputStreams: Record<string, MovedStream> = {};
	const movedInputStreams: Record<string, MovedStream> = {};

	streams.forEach(stream => {
		const sourceGasket = stream.Source.Gasket;

		if (!gasketMap[stream.Source.Gasket]?.InputAndOutputBuffersTied) {
			if (!sourceIndexMap[sourceGasket]) {
				sourceIndexMap[sourceGasket] = 0;
			}

			const newIndex = sourceIndexMap[sourceGasket]++;

			if (newIndex !== stream.Source.Index) {
				movedOutputStreams[sourceGasket] = {
					fromIndex: stream.Source.Index,
					toIndex: newIndex
				};
			}

			stream.Source.Index = newIndex;
		}

		stream.Destinations.forEach(destination => {
			const destinationGasket = destination.Gasket;

			if (!destinationIndexMap[destinationGasket]) {
				destinationIndexMap[destinationGasket] = 0;
			}

			const newIndex = destinationIndexMap[destinationGasket]++;

			if (newIndex !== destination.Index) {
				movedInputStreams[destinationGasket] = {
					fromIndex: destination.Index,
					toIndex: newIndex
				};
			}

			destination.Index = newIndex;
		});
	});

	return {movedInputStreams, movedOutputStreams};
}

function fixTiedStreamIndices(
	movedInputStreams: Record<string, MovedStream>,
	outputStreamsPerGasket: StreamsByGasket
) {
	const gasketMap = getGasketDictionary();

	Object.entries(movedInputStreams).forEach(
		([gasketName, {fromIndex, toIndex}]) => {
			if (gasketMap[gasketName]?.InputAndOutputBuffersTied) {
				outputStreamsPerGasket[gasketName]?.forEach(stream => {
					if (stream.Source.Index === fromIndex) {
						stream.Source.Index = toIndex;
						stream.StreamId =
							gasketMap[gasketName].OutputStreams[toIndex].Index;
					}
				});
			}
		}
	);
}
