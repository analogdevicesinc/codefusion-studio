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
import type {Gasket} from '@common/types/soc';
import {createSlice, type PayloadAction} from '@reduxjs/toolkit';
import {
	type GasketError,
	type StreamComputationErrors,
	type StreamError,
	validateDFGErrors
} from './dfg-validations';
import {
	isGasketIOBufferSizeFixed,
	recomputeStreams
} from './stream-properties-calculator';
import {gasketsInitialState} from './gasket.initializer';
import type {DFGStream, GasketConfig} from 'cfs-types';
import type {ViewType} from '../../../screens/dfg/view-dropdown/view-dropdown';
import {getGasketDictionary} from '../../../utils/dfg';

export type DFGStreamUI = DFGStream & {Uuid: string};

export type GasketBufferSizeProps = {
	InputBufferSizeChoices: number[];
	OutputBufferSizeChoices: number[];
	hasFixedInputStream: boolean;
	hasFixedOutputStream: boolean;
};

export type GasketState = {
	GasketOptions: GasketConfig[];
	Streams: DFGStreamUI[];
	editingStream?: DFGStreamUI;
	editingGasket?: GasketConfig;
	filteredSources?: string[];
	filteredDestinations?: string[];
	filteredGroups?: string[];
	searchQuery?: string;
	selectedGaskets: string[];
	selectedStreams: DFGStreamUI[];
	hoveredStream?: DFGStreamUI;
	// A map from gasket name to buffer size properties
	GasketBufferSizes: Record<string, GasketBufferSizeProps>;
	GasketInputStreamMap: Record<string, DFGStreamUI[]>;
	GasketOutputStreamMap: Record<string, DFGStreamUI[]>;

	// Error states
	GasketErrors: Record<string, GasketError[]>;
	StreamErrors: Record<string, StreamError[]>;

	// UI state for the DFG
	dfgUI: {
		streamView: ViewType;
	};
};

const gasketsSlice = createSlice({
	name: 'Gaskets',
	initialState: gasketsInitialState,
	reducers: {
		addNewStream(state, {payload}: PayloadAction<DFGStreamUI>) {
			const streamsFromGasket = state.Streams.filter(
				s => s.Source.Gasket === payload.Source.Gasket
			);

			const gasket = getGasketDictionary()[payload.Source.Gasket];

			const generatedId = gasket.InputAndOutputBuffersTied
				? payload.StreamId
				: (getGasketDictionary()[payload.Source.Gasket]
						?.OutputStreams[streamsFromGasket.length]?.Index ?? -1);

			if (generatedId === -1) {
				throw new Error(
					`No available stream source index found in Gasket: ${payload.Source.Gasket}`
				);
			}

			state.Streams = [
				...state.Streams,
				{...payload, StreamId: generatedId, Uuid: crypto.randomUUID()}
			];

			recomputeStreams(state, true);
		},
		removeStream(state, {payload}: PayloadAction<{Uuid: string}>) {
			const {Uuid} = payload;
			state.Streams = state.Streams.filter(
				stream => stream.Uuid !== Uuid
			);

			recomputeStreams(state);

			/* NOTE: We also need to remove the seleceted group name if not present anymore */
			const uniqueGroupNames = state.Streams.map(s => s.Group).filter(
				(value, index, self) => value && self.indexOf(value) === index
			);

			if (state.filteredGroups) {
				const updatedFilteredGroups = state.filteredGroups.filter(
					groupName => uniqueGroupNames.includes(groupName)
				);
				state.filteredGroups = updatedFilteredGroups;
			}
		},

		updateStream(
			state,
			{
				payload
			}: PayloadAction<{
				updatedStream: DFGStreamUI;
			}>
		) {
			const {updatedStream} = payload;
			state.Streams = state.Streams.map(stream =>
				stream.Uuid === updatedStream.Uuid ? updatedStream : stream
			);

			if (updatedStream.Uuid === state.editingStream?.Uuid) {
				state.editingStream = updatedStream;
			}

			recomputeStreams(state);
		},
		setEditingStream(
			state,
			{payload}: PayloadAction<Partial<DFGStreamUI> | undefined>
		) {
			const sourceSizeChoices =
				state.GasketBufferSizes[payload?.Source?.Gasket ?? '']
					?.OutputBufferSizeChoices ?? [];

			/* TO DO: implement this for multiple destinations
				const destinationSizeChoices =
					state.GasketBufferSizes[
						payload?.Destinations?.[0]?.Gasket ?? ''
					]?.InputBufferSizeChoices ?? []; */

			const defaultSourceOptions = {
				Gasket: payload?.Source?.Gasket ?? '',
				Index: payload?.Source?.Index ?? 0,
				BufferAddress: payload?.Source?.BufferAddress ?? 0,
				Config: payload?.Source?.Config ?? {},
				BufferSize:
					sourceSizeChoices.length === 1
						? sourceSizeChoices[0]
						: (payload?.Source?.BufferSize ?? 0)
			};
			const emptyDestinationOptions = {
				Gasket: '',
				Index: 0,
				BufferAddress: 0,
				Config: {},
				BufferSize: 0
			};

			const destinations = (payload?.Destinations ?? [])?.map(d => ({
				...emptyDestinationOptions,
				...d
			}));

			const stream = {
				StreamId: payload?.StreamId ?? -1,
				Source: defaultSourceOptions,
				Destinations: destinations,
				Group: payload?.Group ?? '',
				Description: payload?.Description ?? '',
				Uuid: payload?.Uuid ?? crypto.randomUUID()
			};

			state.editingStream = payload ? stream : undefined;
			state.editingGasket = undefined;
		},
		updateGasketOptions(
			state,
			{payload}: PayloadAction<GasketConfig>
		) {
			const gasketExists = Boolean(
				state.GasketOptions.find(
					gasket => gasket.Name === payload.Name
				)
			);

			if (gasketExists) {
				state.GasketOptions = state.GasketOptions.map(gasket =>
					gasket.Name === payload.Name ? payload : gasket
				);
			} else {
				state.GasketOptions = [...state.GasketOptions, payload];
			}
		},
		setEditingGasket(
			state,
			{payload}: PayloadAction<GasketConfig | undefined>
		) {
			state.editingStream = undefined;
			state.editingGasket = payload;
		},
		setSelectedGaskets(state, {payload}: PayloadAction<string[]>) {
			state.selectedGaskets = [...new Set(payload)];
		},
		setSelectedStreams(
			state,
			{payload}: PayloadAction<DFGStreamUI[]>
		) {
			state.selectedStreams = payload;
		},
		setHoveredStream(
			state,
			{payload}: PayloadAction<DFGStreamUI | undefined>
		) {
			state.hoveredStream = payload;
		},
		setStreamView(state, {payload}: PayloadAction<ViewType>) {
			state.dfgUI.streamView = payload;
		},
		setFilteredSources(state, {payload}: PayloadAction<string[]>) {
			state.filteredSources = payload;
		},
		setFilteredDestinations(
			state,
			{payload}: PayloadAction<string[]>
		) {
			state.filteredDestinations = payload;
		},
		setFilteredGroups(state, {payload}: PayloadAction<string[]>) {
			state.filteredGroups = payload;
		},
		setSearchQuery(state, {payload}: PayloadAction<string>) {
			state.searchQuery = payload;
		}
	}
});

export const gasketsReducer = gasketsSlice.reducer;
export const {
	addNewStream,
	removeStream,
	updateStream,
	setEditingStream,
	updateGasketOptions,
	setEditingGasket,
	setSelectedGaskets,
	setSelectedStreams,
	setHoveredStream,
	setStreamView,
	setFilteredSources,
	setFilteredDestinations,
	setFilteredGroups,
	setSearchQuery
} = gasketsSlice.actions;

/**
 * Initialize the UI props for the gaskets.
 * Requires the gaskets to be loaded, not part of the redux reducers because this only needs to be done once.
 * @param gaskets
 * @returns
 */
export function initializeGasketProperties(
	gaskets: Gasket[]
): Record<string, GasketBufferSizeProps> {
	const gasketUIProps: Record<string, GasketBufferSizeProps> = {};

	const createPowerOfTwoChoices = (min: number, max: number) => {
		const choices: number[] = [];

		for (let i = min; i <= max; i *= 2) {
			choices.push(i);
		}

		return choices;
	};

	for (const gasket of gaskets) {
		gasketUIProps[gasket.Name] = {
			InputBufferSizeChoices: [],
			OutputBufferSizeChoices: [],
			hasFixedInputStream: false,
			hasFixedOutputStream: false
		};

		const {hasFixedInputStream, hasFixedOutputStream} =
			isGasketIOBufferSizeFixed(gasket);

		if (hasFixedInputStream) {
			gasketUIProps[gasket.Name].InputBufferSizeChoices =
				gasket.InputStreams.map(i => i.BufferSize!)
					.reduce((acc: number[], size) => {
						if (acc.includes(size)) {
							return acc;
						}

						return [...acc, size];
					}, [])
					.sort((a, b) => a - b);
		} else {
			gasketUIProps[gasket.Name].InputBufferSizeChoices =
				createPowerOfTwoChoices(
					gasket.MinInputStreamBufferSize!,
					gasket.InputBufferSize
				);
		}

		if (hasFixedOutputStream) {
			gasketUIProps[gasket.Name].OutputBufferSizeChoices =
				gasket.OutputStreams.map(o => o.BufferSize!)
					.reduce((acc: number[], size) => {
						if (acc.includes(size)) {
							return acc;
						}

						return [...acc, size];
					}, [])
					.sort((a, b) => a - b);
		} else {
			gasketUIProps[gasket.Name].OutputBufferSizeChoices =
				createPowerOfTwoChoices(
					gasket.MinOutputStreamBufferSize!,
					gasket.OutputBufferSize
				);
		}
	}

	return gasketUIProps;
}

export function initializeGasketErrors(
	streams: DFGStreamUI[],
	gasketUIProps: Record<string, GasketBufferSizeProps>
): StreamComputationErrors {
	return validateDFGErrors(streams, gasketUIProps);
}

/**
 * Extends streams in the list with UI related fields
 * @param streams
 * @returns Returns extended stream list
 */
export function extendUIStreams(streams: DFGStream[]): DFGStreamUI[] {
	return streams.map(stream => ({
		...stream,
		Uuid: crypto.randomUUID()
	}));
}
