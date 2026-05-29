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
import type {Zephelin, ZephelinInterface} from 'cfs-types';
import {applyProjectProfilingConfig} from '../../store';

export type ZephilinConfig = Partial<Zephelin>;

export type ZephelinConfigErrors = Partial<{
	[K in keyof Zephelin]: string;
}>;

export type ProfilingState = {
	// Project ID mapped to profiling config
	zephelin: Record<string, ZephilinConfig>;
	errors: Record<string, ZephelinConfigErrors>;
};

const profilingInitialState: ProfilingState = {
	zephelin: {},
	errors: {}
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
				state.zephelin[action.payload.projectId] =
					applyProjectProfilingConfig();
			}
		},
		toggleRtosEventsEnabled(
			state,
			action: PayloadAction<{
				enabled: boolean;
				projectId: string;
			}>
		) {
			if (state.zephelin[action.payload.projectId]) {
				state.zephelin[action.payload.projectId].RtosEventsEnabled =
					action.payload.enabled;
			}
		},
		toggleMemoryUsageEnabled(
			state,
			action: PayloadAction<{
				enabled: boolean;
				projectId: string;
			}>
		) {
			if (state.zephelin[action.payload.projectId]) {
				state.zephelin[
					action.payload.projectId
				].ProfilingMemoryUsageEnabled = action.payload.enabled;
			}
		},
		setMemoryUsageInterval(
			state,
			action: PayloadAction<{
				interval: number;
				projectId: string;
			}>
		) {
			if (state.zephelin[action.payload.projectId]) {
				state.zephelin[
					action.payload.projectId
				].ProfilingMemoryUsageInterval = action.payload.interval;
			}
		},
		toggleCpuLoadEnabled(
			state,
			action: PayloadAction<{
				enabled: boolean;
				projectId: string;
			}>
		) {
			if (state.zephelin[action.payload.projectId]) {
				state.zephelin[
					action.payload.projectId
				].ProfilingCpuLoadEnabled = action.payload.enabled;
			}
		},
		setCpuLoadInterval(
			state,
			action: PayloadAction<{
				interval: number;
				projectId: string;
			}>
		) {
			if (state.zephelin[action.payload.projectId]) {
				state.zephelin[
					action.payload.projectId
				].ProfilingCpuLoadInterval = action.payload.interval;
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
		toggleInstrumentationSubsystemEnabled(
			state,
			action: PayloadAction<{
				enabled: boolean;
				projectId: string;
			}>
		) {
			if (state.zephelin[action.payload.projectId]) {
				state.zephelin[
					action.payload.projectId
				].InstrumentationSubsystemEnabled = action.payload.enabled;
			}
		},
		setInterface(
			state,
			action: PayloadAction<{
				interface: ZephelinInterface;
				projectId: string;
			}>
		) {
			if (state.zephelin[action.payload.projectId]) {
				state.zephelin[action.payload.projectId].Interface =
					action.payload.interface;
			}
		},
		setUARTPort(
			state,
			action: PayloadAction<{
				port: string;
				projectId: string;
			}>
		) {
			if (state.zephelin[action.payload.projectId]) {
				state.zephelin[action.payload.projectId].Port =
					action.payload.port;
			}
		},
		setValidationErrors(
			state,
			action: PayloadAction<{
				projectId: string;
				errors: ZephelinConfigErrors;
			}>
		) {
			state.errors[action.payload.projectId] = action.payload.errors;
		}
	}
});

export const {
	toggleProfilingEnabled,
	toggleRtosEventsEnabled,
	toggleMemoryUsageEnabled,
	setMemoryUsageInterval,
	toggleCpuLoadEnabled,
	setCpuLoadInterval,
	toggleAIProfilingEnabled,
	toggleInstrumentationSubsystemEnabled,
	setInterface,
	setUARTPort,
	setValidationErrors
} = profilingContextSlice.actions;

export const profilingReducer = profilingContextSlice.reducer;
