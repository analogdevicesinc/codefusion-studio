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
import {createSlice, type PayloadAction} from '@reduxjs/toolkit';
import type {FormattedPeripheral} from '../../../utils/json-formatter';

type PeripheralsState = {
	peripherals: Record<string, FormattedPeripheral>;
	activePeripheral: string | undefined;
};

export const peripheralsInitialState: PeripheralsState = {
	peripherals: {} satisfies Record<string, FormattedPeripheral>,
	activePeripheral: undefined
};

const peripheralsSlice = createSlice({
	name: 'peripherals',
	initialState: peripheralsInitialState,
	reducers: {
		setActivePeripheral(state, {payload}: PayloadAction<string>) {
			if (state.activePeripheral === payload) {
				state.activePeripheral = undefined;
			} else {
				state.activePeripheral = payload;
			}
		},
		setCurrentTarget(
			state,
			{
				payload: {peripheralGroup, signalName, dropdownVal}
			}: PayloadAction<{
				peripheralGroup: string;
				signalName: string;
				dropdownVal: string | undefined;
			}>
		) {
			state.peripherals[peripheralGroup].signals.dict[
				signalName
			].currentTarget = dropdownVal;
		}
	}
});

export const {setActivePeripheral, setCurrentTarget} =
	peripheralsSlice.actions;

export const peripheralsReducer = peripheralsSlice.reducer;
