/**
 *
 * Copyright (c) 2026 Analog Devices, Inc.
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
	createAsyncThunk,
	createSlice,
	type PayloadAction
} from '@reduxjs/toolkit';
import {
	getMemoryAtSymbol,
	getMemoryData,
	getSessionList,
	getSymbolsAtSymbol,
	getSymbolsInRange,
	type MemoryDataWithSymbols
} from '../../../utils/api';
import {
	type DebugSessionInfo,
	type SymbolsDataResponse
} from '../../../types/debug';

type MemoryState = {
	sessions: DebugSessionInfo[];
	memoryBytes: {
		address?: number;
		data: number[];
		symbols?: SymbolsDataResponse[];
	};
	activeSessionId?: string;
	loading: boolean;
	error?: string;
	reachedEndOfMemory: boolean;
};

const memoryInitialState: MemoryState = {
	memoryBytes: {
		address: 0,
		data: [],
		symbols: []
	},
	sessions: [],
	activeSessionId: undefined,
	loading: false,
	error: undefined,
	reachedEndOfMemory: false
};

export const fetchSessions = createAsyncThunk(
	'memory/fetchSessions',
	async () => {
		const response = await getSessionList();

		return response;
	}
);

export const fetchMemoryData = createAsyncThunk(
	'memory/fetchMemoryData',
	async ({
		sessionId,
		address,
		length
	}: {
		sessionId: string;
		address: number;
		length: number;
	}) => {
		const [memoryResponse, symbolsResponse] = await Promise.all([
			getMemoryData(sessionId, length, address),
			getSymbolsInRange(sessionId, length, address).catch(err => {
				console.error(err);

				return [];
			})
		]);

		return {...memoryResponse, symbols: symbolsResponse};
	}
);

export const fetchMemoryAtSymbol = createAsyncThunk(
	'memory/fetchMemoryAtSymbol',
	async ({
		sessionId,
		length,
		expression
	}: {
		sessionId: string;
		length: number;
		expression: string;
	}) => {
		const [memoryResponse, symbolsResponse] = await Promise.all([
			getMemoryAtSymbol(sessionId, length, expression),
			getSymbolsAtSymbol(sessionId, length, expression).catch(err => {
				console.error(err);

				return [];
			})
		]);

		return {...memoryResponse, symbols: symbolsResponse};
	}
);

export const appendMemoryData = createAsyncThunk(
	'memory/appendMemoryData',
	async ({
		sessionId,
		address,
		length
	}: {
		sessionId: string;
		address: number;
		length: number;
	}) => {
		const [memoryResponse, symbolsResponse] = await Promise.all([
			getMemoryData(sessionId, length, address),
			getSymbolsInRange(sessionId, length, address).catch(err => {
				console.error(err);

				return [];
			})
		]);

		return {...memoryResponse, symbols: symbolsResponse};
	}
);

const MemorySlice = createSlice({
	name: 'memory',
	initialState: memoryInitialState,
	reducers: {
		setMemoryData(
			state,
			action: PayloadAction<{
				address?: number;
				data: number[];
				symbols: SymbolsDataResponse[];
			}>
		) {
			state.memoryBytes = action.payload;
			state.reachedEndOfMemory = false;
			state.error = undefined;
		},
		setSessions(state, action: PayloadAction<DebugSessionInfo[]>) {
			state.sessions = action.payload;
		},
		setActiveSessionId(
			state,
			action: PayloadAction<string | undefined>
		) {
			state.activeSessionId = action.payload;
		},
		setLoading(state, action: PayloadAction<boolean>) {
			state.loading = action.payload;
		},
		setError(state, action: PayloadAction<string | undefined>) {
			state.error = action.payload;
		}
	},
	extraReducers(builder) {
		builder
			.addCase(
				fetchSessions.fulfilled,
				(state, action: PayloadAction<DebugSessionInfo[]>) => {
					state.loading = false;
					state.error = undefined;
					state.activeSessionId = action.payload.find(
						session => session.isActive
					)?.sessionId;
					state.sessions = action.payload.map(
						({sessionId, isRunning, name, isActive, isLive}) => ({
							sessionId,
							isRunning,
							name,
							isActive,
							isLive
						})
					);
				}
			)
			.addCase(fetchSessions.rejected, (state, action) => {
				state.loading = false;
				state.error = action.error.message;
			})
			.addCase(fetchMemoryData.pending, state => {
				state.loading = true;
				state.error = undefined;
				state.reachedEndOfMemory = false;
			})
			.addCase(
				fetchMemoryData.fulfilled,
				(state, action: PayloadAction<MemoryDataWithSymbols>) => {
					state.loading = false;
					const {address, data, symbols} = action.payload;
					state.memoryBytes = {
						address,
						data,
						symbols
					};
				}
			)
			.addCase(fetchMemoryData.rejected, (state, action) => {
				state.loading = false;
				state.error = action.error.message;
			})
			.addCase(appendMemoryData.fulfilled, (state, action) => {
				state.loading = false;
				const {address, data, symbols} = action.payload;
				const requestedLength = action.meta.arg.length;

				if (data.length === 0) {
					state.reachedEndOfMemory = true;

					return;
				}

				if (data.length < requestedLength) {
					state.reachedEndOfMemory = true;
				}

				// Shouldn't be able to call append without existing memory data, but just in case
				if (
					state.memoryBytes.address === undefined ||
					state.memoryBytes.data.length === 0
				) {
					state.memoryBytes = {
						address,
						data,
						symbols
					};
				} else {
					const expectedNextAddress =
						state.memoryBytes.address + state.memoryBytes.data.length;

					if (address === expectedNextAddress) {
						state.memoryBytes.data.push(...data);

						if (!state.memoryBytes.symbols) {
							state.memoryBytes.symbols = [];
						}

						const existingSymbols = new Set(
							state.memoryBytes.symbols
								.map(symbol => symbol.address)
								.filter(addr => addr !== undefined)
						);

						state.memoryBytes.symbols.push(
							...symbols.filter(
								symbol =>
									symbol.address !== undefined &&
									!existingSymbols.has(symbol.address)
							)
						);
					}
				}
			})
			.addCase(appendMemoryData.pending, state => {
				state.loading = true;
				state.error = undefined;
			})
			.addCase(appendMemoryData.rejected, (state, action) => {
				state.loading = false;
				state.error = action.error.message;
				state.reachedEndOfMemory = true;
			})
			.addCase(fetchMemoryAtSymbol.pending, state => {
				state.loading = true;
				state.error = undefined;
				state.reachedEndOfMemory = false;
			})
			.addCase(
				fetchMemoryAtSymbol.fulfilled,
				(state, action: PayloadAction<MemoryDataWithSymbols>) => {
					state.loading = false;
					const {address, data, symbols} = action.payload;
					state.memoryBytes = {
						address,
						data,
						symbols
					};
				}
			)
			.addCase(fetchMemoryAtSymbol.rejected, (state, action) => {
				state.loading = false;
				state.error = action.error.message;
			});
	}
});

export const {
	setMemoryData,
	setSessions,
	setLoading,
	setError,
	setActiveSessionId
} = MemorySlice.actions;

export const memoryReducer = MemorySlice.reducer;
