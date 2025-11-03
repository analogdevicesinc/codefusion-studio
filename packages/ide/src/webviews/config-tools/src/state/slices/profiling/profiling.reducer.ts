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

import {createSlice, type PayloadAction} from '@reduxjs/toolkit';
import {Zephelin} from 'cfs-plugins-api';

export type ZephilinConfig = Partial<Zephelin>;

export type ProfilingState = {
	// Project ID mapped to profiling config
	zephelin: Record<string, ZephilinConfig>;
};

const profilingInitialState: ProfilingState = {
	zephelin: {}
};

const profilingContextSlice = createSlice({
	name: 'profilingContext',
	initialState: profilingInitialState,
	reducers: {
		toggleProfilingEnabled(
			state,
			action: PayloadAction<{
				enabled: boolean;
				projectId: string;
			}>
		) {
			if (state.zephelin[action.payload.projectId]) {
				state.zephelin[action.payload.projectId].Enabled =
					action.payload.enabled;
			} else if (action.payload.enabled) {
				state.zephelin[action.payload.projectId] = {
					Enabled: true,
					AIEnabled: false,
					Port: 0
				};
			}
		},
		toggleAIProfilingEnabled(
			state,
			action: PayloadAction<{
				enabled: boolean;
				projectId: string;
			}>
		) {
			if (state.zephelin[action.payload.projectId]) {
				state.zephelin[action.payload.projectId].AIEnabled =
					action.payload.enabled;
			}
		},
		setUARTPort(
			state,
			action: PayloadAction<{
				port: number;
				projectId: string;
			}>
		) {
			if (state.zephelin[action.payload.projectId]) {
				state.zephelin[action.payload.projectId].Port =
					action.payload.port;
			}
		}
	}
});

export const {
	toggleProfilingEnabled,
	toggleAIProfilingEnabled,
	setUARTPort
} = profilingContextSlice.actions;

export const profilingReducer = profilingContextSlice.reducer;
