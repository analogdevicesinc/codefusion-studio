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
	getMemoryData,
	getSessionList,
	type MemoryDataResponse
} from '../../../utils/api';
import {type DebugSessionInfo} from '../../../types/debug';

type MemoryState = {
	sessions: DebugSessionInfo[];
	memoryBytes: {
		address?: number;
		data: number[];
	};
	activeSessionId?: string;
	loading: boolean;
	error?: string;
	reachedEndOfMemory: boolean;
};

const memoryInitialState: MemoryState = {
	memoryBytes: {
		address: 0,
		data: []
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
		const response = await getMemoryData(sessionId, length, address);

		return response;
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
		const response = await getMemoryData(sessionId, length, address);

		return response;
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
				(state, action: PayloadAction<MemoryDataResponse>) => {
					state.loading = false;
					const {address, data} = action.payload;
					state.memoryBytes = {
						address,
						data
					};
				}
			)
			.addCase(fetchMemoryData.rejected, (state, action) => {
				state.loading = false;
				state.error = action.error.message;
			})
			.addCase(appendMemoryData.fulfilled, (state, action) => {
					state.loading = false;
					const {address, data} = action.payload;
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
							data
						};
					} else {
						const expectedNextAddress =
							state.memoryBytes.address +
							state.memoryBytes.data.length;

						if (address === expectedNextAddress) {
							state.memoryBytes.data.push(...data);
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
