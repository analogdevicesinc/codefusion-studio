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

import type {DFG} from 'cfs-plugins-api';
import type {Soc} from '../../../../../common/types/soc';
import {
	type GasketState,
	initializeGasketErrors,
	initializeGasketProperties
} from './gasket.reducer';
import {groupAndSortStreamsByGasket} from './stream-properties-calculator';

// A default, empty state for the gasket reducer
export const gasketsInitialState: GasketState = {
	GasketOptions: [],
	Streams: [],
	GasketInputStreamMap: {},
	GasketOutputStreamMap: {},
	editingStream: undefined,
	selectedGaskets: [],
	selectedStreams: [],
	hoveredStream: undefined,
	GasketBufferSizes: {},
	GasketErrors: {},
	StreamErrors: {},
	dfgUI: {
		streamView: 'Gasket'
	}
};

/**
 * Initializes the gasket state with the given soc and (optionally) the persisted dfg config.
 *
 * @param soc - The soc to initialize the gasket state with.
 * @param persistedDfgConfig - The persisted dfg config to initialize the gasket state with.
 * @returns The initialized gasket state.
 */
export function initializeGasketState(
	soc: Soc,
	persistedDfgConfig: DFG | undefined
) {
	const initialGasketUIProps = initializeGasketProperties(
		soc.Gaskets ?? []
	);
	const initialGasketErrors = initializeGasketErrors(
		persistedDfgConfig?.Streams ?? [],
		initialGasketUIProps
	);

	const {inputStreamsPerGasket, outputStreamsPerGasket} =
		groupAndSortStreamsByGasket(persistedDfgConfig?.Streams ?? []);

	const gasketsReducerInitialState: GasketState = {
		GasketOptions: [
			...gasketsInitialState.GasketOptions,
			...(persistedDfgConfig?.Gaskets ?? [])
		],
		Streams: [
			...gasketsInitialState.Streams,
			...(persistedDfgConfig?.Streams ?? [])
		],
		selectedGaskets: [],
		selectedStreams: [],
		GasketBufferSizes: initialGasketUIProps,
		GasketErrors: initialGasketErrors.gasketErrors,
		StreamErrors: initialGasketErrors.streamErrors,
		GasketInputStreamMap: inputStreamsPerGasket,
		GasketOutputStreamMap: outputStreamsPerGasket,
		dfgUI: {
			streamView: 'Gasket'
		}
	};

	return gasketsReducerInitialState;
}
