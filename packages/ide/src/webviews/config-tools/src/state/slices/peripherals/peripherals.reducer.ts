/**
 *
 * Copyright (c) 2024-2025 Analog Devices, Inc.
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
import type {PeripheralSignalsTargets} from '../../../utils/json-formatter';
import type {
	PeripheralConfig,
	SignalConfig
} from '../../../types/peripherals';
import {getPeripheralSignals} from '../../../utils/soc-peripherals';
import type {TFormFieldValue} from 'cfs-react-library';

type PeripheralsState = {
	peripheralSignalsTargets: Record<string, PeripheralSignalsTargets>;
	activePeripheral: string | undefined;
	activeSignal: string | undefined;
	assignments: Record<string, PeripheralConfig>;
};

export const peripheralsInitialState: PeripheralsState = {
	peripheralSignalsTargets: {} satisfies Record<
		string,
		PeripheralSignalsTargets
	>,
	activePeripheral: undefined,
	activeSignal: undefined,
	assignments: {} satisfies Record<string, PeripheralConfig>
};

/**
 * Utility function to initialize a peripheral.
 *
 * @param peripheralId - The ID of the peripheral.
 * @param projectId - The ID of the project.
 * @returns {PeripheralConfig} The initialized peripheral configuration.
 */
function initializePeripheral(
	peripheralId: string,
	projectId?: string,
	config?: Record<string, string>
): PeripheralConfig {
	return {
		name: peripheralId,
		projectId,
		signals: {},
		config: config ?? {},
		description: '',
		security: ''
	};
}

const peripheralsSlice = createSlice({
	name: 'Peripherals',
	initialState: peripheralsInitialState,
	reducers: {
		setActivePeripheral(
			state,
			{payload}: PayloadAction<string | undefined>
		) {
			// Configuring a peripheral should cleanup the active signal
			state.activeSignal = undefined;

			if (state.activePeripheral === payload || !payload) {
				state.activePeripheral = undefined;
			} else {
				state.activePeripheral = payload;
			}
		},
		setActiveSignal(
			state,
			{
				payload
			}: PayloadAction<
				| {
						peripheral: string;
						signal: string;
						keepActivePeripheral?: boolean;
				  }
				| undefined
			>
		) {
			const formattedString = `${payload?.peripheral} ${payload?.signal}`;

			// Optionally keep the active peripheral when setting the active signal for pinmux
			if (!payload?.keepActivePeripheral) {
				state.activePeripheral = undefined;
			}

			if (!payload || formattedString === state.activeSignal) {
				state.activeSignal = undefined;

				return;
			}

			if (state.activeSignal === payload.signal) {
				state.activeSignal = undefined;
			} else {
				state.activeSignal = formattedString;
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
			state.peripheralSignalsTargets[peripheralGroup].signalsTargets[
				signalName
			] = dropdownVal;
		},
		setPeripheralAssignment(
			state,
			{
				payload
			}: PayloadAction<{
				peripheral: string;
				projectId: string;
				config: Record<string, string>;
			}>
		) {
			if (!state.assignments[payload.peripheral]) {
				state.assignments[payload.peripheral] = initializePeripheral(
					payload.peripheral,
					payload.projectId,
					payload.config
				);
			}
		},
		removePeripheralAssignment(
			state,
			{payload}: PayloadAction<{peripheral: string}>
		) {
			if (state.assignments[payload.peripheral]) {
				// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
				delete state.assignments[payload.peripheral];
			}
		},
		setSignalAssignment(
			state,
			{
				payload
			}: PayloadAction<{
				peripheral: string;
				signalName: string;
				projectId: string;
			}>
		) {
			if (
				!state.assignments[payload.peripheral]?.signals?.[
					payload.signalName
				]
			) {
				if (!state.assignments[payload.peripheral]) {
					state.assignments[payload.peripheral] =
						initializePeripheral(payload.peripheral);
				}

				state.assignments[payload.peripheral].signals[
					payload.signalName
				] = {
					name: payload.signalName,
					projectId: payload.projectId,
					config: {}
				} satisfies SignalConfig;
			}
		},
		setSignalGroupAssignment(
			state,
			{
				payload
			}: PayloadAction<{
				peripheral: string;
				projectId: string;
				config: Record<string, string>;
			}>
		) {
			const peripheralSignals = getPeripheralSignals(
				payload.peripheral
			);

			Object.keys(peripheralSignals).forEach(signalName => {
				if (
					!state.assignments[payload.peripheral]?.signals?.[
						signalName
					]
				) {
					if (!state.assignments[payload.peripheral]) {
						state.assignments[payload.peripheral] =
							initializePeripheral(
								payload.peripheral,
								payload.projectId,
								payload.config
							);
					}

					state.assignments[payload.peripheral].signals[signalName] =
						{
							name: signalName,
							projectId: payload.projectId,
							config: {}
						} satisfies SignalConfig;
				}
			});
		},
		removeSignalAssignment(
			state,
			{
				payload
			}: PayloadAction<{peripheral: string; signalName: string}>
		) {
			const peripheral = state.assignments[payload.peripheral];

			if (peripheral?.signals[payload.signalName]) {
				// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
				delete peripheral.signals[payload.signalName];
			}
		},
		setSignalConfig(
			state,
			{
				payload
			}: PayloadAction<{
				peripheral: string;
				signalName: string;
				config: Record<string, string>;
			}>
		) {
			state.assignments[payload.peripheral].signals[
				payload.signalName
			].config = payload.config;
		},
		setPeripheralConfig(
			state,
			{
				payload
			}: PayloadAction<{
				peripheralId: string;
				config: Record<string, TFormFieldValue>;
			}>
		) {
			const {peripheralId, config} = payload;
			state.assignments[peripheralId].config = config;
		},
		setPeripheralDescription(
			state,
			{
				payload
			}: PayloadAction<{peripheralId: string; description: string}>
		) {
			if (state.assignments[payload.peripheralId]) {
				state.assignments[payload.peripheralId].description =
					payload.description;
			}
		},
		setSignalDescription(
			state,
			{
				payload
			}: PayloadAction<{
				peripheral: string;
				signalName: string;
				description: string;
			}>
		) {
			const signal =
				state.assignments[payload.peripheral]?.signals[
					payload.signalName
				];

			if (signal) {
				signal.description = payload.description;
			}
		}
	}
});

export const {
	setActivePeripheral,
	setActiveSignal,
	setCurrentTarget,
	setPeripheralAssignment,
	removePeripheralAssignment,
	setSignalAssignment,
	setSignalGroupAssignment,
	removeSignalAssignment,
	setSignalConfig,
	setPeripheralConfig,
	setPeripheralDescription,
	setSignalDescription
} = peripheralsSlice.actions;

export const peripheralsReducer = peripheralsSlice.reducer;
