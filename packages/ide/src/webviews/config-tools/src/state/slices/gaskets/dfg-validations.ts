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

import type {DFGStream} from 'cfs-plugins-api';
import type {GasketBufferSizeProps} from './gasket.reducer';
import {getGasketModel} from '../../../utils/dfg';

export type StreamErrorType =
	| 'BUFFER_SIZE_NOT_IN_RANGE'
	| 'UNKNOWN_GASKET';

export type GasketErrorType = 'OOM_INPUT' | 'OOM_OUTPUT';

export type StreamError = {
	// The error message
	message: string;

	errorType: StreamErrorType;

	// The direction of the error (Input side, or output side)
	direction: 'input' | 'output';
};

export type GasketError = {
	// The error message
	message: string;
	errorType: GasketErrorType;
};

export type StreamComputationErrors = {
	// A map from stream ID to error message
	streamErrors: Record<string, StreamError[]>;
	// A map from gasket name to error message
	gasketErrors: Record<string, GasketError[]>;
};

function addErrorToStream(
	errors: Record<string, StreamError[]>,
	key: string,
	error: StreamError
) {
	errors[key] = errors[key] || [];
	errors[key].push(error);
}

function addErrorToGasket(
	errors: Record<string, GasketError[]>,
	key: string,
	error: GasketError
) {
	errors[key] = errors[key] || [];
	errors[key].push(error);
}

/**
 * Validates the entire DFG for errors
 * @param streams: The streams to validate the DFG errors for
 * @param gaskets: The gaskets to validate the DFG errors for
 * @returns An object containing the stream and gasket errors
 */
export function validateDFGErrors(
	streams: DFGStream[],
	gasketProps: Record<string, GasketBufferSizeProps>
): StreamComputationErrors {
	const gaskets = getGasketModel();
	const streamErrors: Record<string, StreamError[]> = {};
	const gasketErrors: Record<string, GasketError[]> = {};

	// First, we make sure all gaskets have input that are within the Gasket's capacity
	for (const gasket of gaskets) {
		// Calculate input size by summing all destinations that target this gasket
		const inputSize = streams.reduce((acc, stream) => {
			const destinationsForGasket = stream.Destinations.filter(
				dest => dest.Gasket === gasket.Name
			);

			return (
				acc +
				destinationsForGasket.reduce(
					(destAcc, dest) => destAcc + (dest.BufferSize ?? 0),
					0
				)
			);
		}, 0);

		const outputStreams = streams.filter(
			stream => stream.Source.Gasket === gasket.Name
		);
		const outputSize = outputStreams.reduce(
			(acc, stream) => acc + (stream.Source.BufferSize ?? 0),
			0
		);

		if (inputSize > gasket.InputBufferSize) {
			addErrorToGasket(gasketErrors, gasket.Name, {
				message: `Gasket ${gasket.Name} uses ${inputSize} bytes of input buffer space, which is greater than the gasket's capacity of ${gasket.InputBufferSize} bytes`,
				errorType: 'OOM_INPUT'
			});
		}

		if (outputSize > gasket.OutputBufferSize) {
			addErrorToGasket(gasketErrors, gasket.Name, {
				message: `Gasket ${gasket.Name} uses ${outputSize} bytes of output buffer space, which is greater than the gasket's capacity of ${gasket.OutputBufferSize} bytes`,
				errorType: 'OOM_OUTPUT'
			});
		}
	}

	// Now for individual streams, we make sure that buffer sizes are valid and within the gasket's capacity
	for (const stream of streams) {
		const srcBufferSize = stream.Source.BufferSize;

		const srcGasket = gaskets.find(
			gasket => gasket.Name === stream.Source.Gasket
		);

		if (!srcGasket) {
			// Add an error to the stream
			addErrorToStream(streamErrors, stream.StreamId.toString(), {
				message: `Stream ${stream.StreamId} has an unknown source gasket ${stream.Source.Gasket}`,
				errorType: 'UNKNOWN_GASKET',
				direction: 'output'
			});
			continue;
		}

		// Validate source buffer size
		const srcGasketProps = gasketProps[srcGasket.Name];

		if (
			!srcGasketProps.OutputBufferSizeChoices.includes(srcBufferSize)
		) {
			addErrorToStream(streamErrors, stream.StreamId.toString(), {
				message: `Stream ${stream.StreamId} has an invalid output buffer size of ${srcBufferSize} bytes at the ${srcGasket.Name} Gasket`,
				errorType: 'BUFFER_SIZE_NOT_IN_RANGE',
				direction: 'output'
			});
		}

		// Validate each destination
		for (const destination of stream.Destinations) {
			const dstBufferSize = destination.BufferSize;
			const dstGasket = gaskets.find(
				gasket => gasket.Name === destination.Gasket
			);

			if (!dstGasket) {
				addErrorToStream(streamErrors, stream.StreamId.toString(), {
					message: `Stream ${stream.StreamId} has an unknown destination gasket ${destination.Gasket}`,
					errorType: 'UNKNOWN_GASKET',
					direction: 'input'
				});
				continue;
			}

			// Make sure the buffer size is within the gasket's capacity
			const dstGasketProps = gasketProps[dstGasket.Name];

			if (
				!dstGasketProps.InputBufferSizeChoices.includes(dstBufferSize)
			) {
				addErrorToStream(streamErrors, stream.StreamId.toString(), {
					message: `Stream ${stream.StreamId} has an invalid input buffer size of ${dstBufferSize} bytes at the ${dstGasket.Name} Gasket`,
					errorType: 'BUFFER_SIZE_NOT_IN_RANGE',
					direction: 'input'
				});
			}
		}
	}

	return {streamErrors, gasketErrors};
}
