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
import {createSlice, type PayloadAction} from '@reduxjs/toolkit';

export type Endianness = 'big' | 'little';
export type DisplayFormat = 'hex' | 'dec';

const BYTE_GROUPING_CYCLE = [1, 2, 4] as const;

type AppContextState = {
	numColumns: number;
	activeSessionId?: string;
	byteGrouping: number;
	targetAddress?: number;
	endianness: Endianness;
	displayFormat: DisplayFormat;
};

export const appContextInitialState: AppContextState = {
	numColumns: 16,
	activeSessionId: undefined,
	byteGrouping: 1,
	targetAddress: undefined,
	endianness: 'big',
	displayFormat: 'hex'
};

const appContextSlice = createSlice({
	name: 'appContext',
	initialState: appContextInitialState,
	reducers: {
		setNumColumns(state, action: PayloadAction<number>) {
			state.numColumns = action.payload;
		},
		setActiveSessionId(
			state,
			action: PayloadAction<string | undefined>
		) {
			state.activeSessionId = action.payload;
		},
		setByteGrouping(state, action: PayloadAction<number>) {
			state.byteGrouping = action.payload;
		},
		toggleByteGrouping(state) {
			const currentIndex = BYTE_GROUPING_CYCLE.indexOf(
				state.byteGrouping as (typeof BYTE_GROUPING_CYCLE)[number]
			);
			const nextIndex =
				(currentIndex + 1) % BYTE_GROUPING_CYCLE.length;
			state.byteGrouping = BYTE_GROUPING_CYCLE[nextIndex];
		},
		setEndianness(state, action: PayloadAction<Endianness>) {
			state.endianness = action.payload;
		},
		toggleEndianness(state) {
			state.endianness =
				state.endianness === 'big' ? 'little' : 'big';
		},
		setDisplayFormat(state, action: PayloadAction<DisplayFormat>) {
			state.displayFormat = action.payload;
		},
		toggleDisplayFormat(state) {
			state.displayFormat =
				state.displayFormat === 'hex' ? 'dec' : 'hex';
		},
		setTargetAddress(state, action: PayloadAction<number>) {
			state.targetAddress = action.payload;
		},
		clearTargetAddress(state) {
			state.targetAddress = undefined;
		}
	}
});

export const {
	setNumColumns,
	setActiveSessionId,
	setByteGrouping,
	toggleByteGrouping,
	setEndianness,
	toggleEndianness,
	setDisplayFormat,
	toggleDisplayFormat,
	setTargetAddress,
	clearTargetAddress
} = appContextSlice.actions;
export const appContextReducer = appContextSlice.reducer;
