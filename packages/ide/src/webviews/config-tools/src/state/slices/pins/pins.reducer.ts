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
import {type PayloadAction, createSlice} from '@reduxjs/toolkit';
import type {
	AppliedSignal,
	PinCanvas,
	PinDictionary
} from '@common/types/soc';
import {getControlsFromCache} from '../../../utils/api';
import type {ControlErrorTypes} from '../../../types/errorTypes';
import {CONTROL_SCOPES} from '../../../constants/scopes';
import {getSocPinDictionary} from '../../../utils/soc-pins';
import {computeNextPinConfig} from '../../../utils/pin-reset-controls';

type PinsState = {
	pins: PinDictionary;
	pinDetailsTargetPin: string | undefined;
	canvas: PinCanvas | undefined;
	hoveredPin: string | undefined;
};

type Control = {
	Peripheral: string | undefined;
	Name: string | undefined;
	pinId: string | undefined;
	control: string;
	controlValue: string;
	errType?: ControlErrorTypes;
	pluginOption?: boolean;
};

export const pinsInitialState: PinsState = {
	pins: {} satisfies PinDictionary,
	pinDetailsTargetPin: undefined,
	canvas: undefined,
	hoveredPin: undefined
};

function removeSignalFromPin(
	state: PinsState,
	{
		Pin,
		Peripheral,
		Name
	}: {Pin: string; Peripheral: string | undefined; Name: string}
) {
	const targetPin = state.pins[Pin];

	if (targetPin) {
		targetPin.appliedSignals = targetPin.appliedSignals.filter(
			signal =>
				!(signal.Name === Name && signal.Peripheral === Peripheral)
		);
	}
}

const pinsSlice = createSlice({
	name: 'Pins',
	initialState: pinsInitialState,
	reducers: {
		setIsPinFocused(
			state,
			{payload}: PayloadAction<{id: string; isFocused: boolean}>
		) {
			state.pins[payload.id].isFocused = payload.isFocused;
		},
		focusPinSet(state, {payload}: PayloadAction<string[]>) {
			const pinsToFocus = payload.reduce<Record<string, boolean>>(
				(acc, pinId) => {
					acc[pinId] = true;

					return acc;
				},
				{}
			);

			// Each new focus will involve unfocusing previously focused pins
			// To avoid having two dispatches, we will unfocus all pins first
			for (const pinId in state.pins) {
				if (Object.prototype.hasOwnProperty.call(state.pins, pinId)) {
					if (state.pins[pinId].isFocused && !pinsToFocus[pinId]) {
						state.pins[pinId].isFocused = false;
					} else if (pinsToFocus[pinId]) {
						state.pins[pinId].isFocused = true;
					}
				}
			}
		},
		unfocusPinSet(
			state,
			{payload}: PayloadAction<string[] | undefined>
		) {
			if (!payload) {
				for (const pinId in state.pins) {
					if (
						Object.prototype.hasOwnProperty.call(state.pins, pinId)
					) {
						state.pins[pinId].isFocused = false;
					}
				}

				return;
			}

			payload.forEach(pinId => {
				if (pinId && state.pins[pinId]) {
					state.pins[pinId].isFocused = false;
				}
			});
		},
		setAppliedSignal(
			state,
			{
				payload: {Pin, Peripheral, Name, PinCfg}
			}: PayloadAction<
				AppliedSignal &
					Partial<{
						discardPersistence: boolean;
					}>
			>
		) {
			const targetPin = state.pins[Pin];

			if (!targetPin) {
				return;
			}

			targetPin.appliedSignals.push({
				Pin,
				Peripheral,
				Name,
				PinCfg
			});
		},
		assignCoprogrammedSignal(
			state,
			{
				payload
			}: PayloadAction<
				Array<
					AppliedSignal &
						Partial<{
							discardPersistence: boolean;
						}>
				>
			>
		) {
			for (const signal of payload) {
				const {Pin, Peripheral, Name, PinCfg} = signal;
				const targetPin = state.pins[Pin];

				if (!targetPin) {
					continue;
				}

				targetPin.appliedSignals.push({
					Pin,
					Peripheral,
					Name,
					PinCfg
				});
			}
		},
		setMultiSignalConfig(
			state,
			{
				payload
			}: PayloadAction<{
				signals: Array<{
					Pin: string;
					Peripheral: string;
					Name: string;
					PinCfg: Record<string, any>;
				}>;
			}>
		) {
			for (const signal of payload.signals) {
				const targetPin = state.pins[signal.Pin];

				if (!targetPin) {
					continue;
				}

				const signalToUpdate = targetPin.appliedSignals.find(
					s =>
						s.Name === signal.Name &&
						s.Peripheral === signal.Peripheral
				);

				if (signalToUpdate) {
					signalToUpdate.PinCfg = signal.PinCfg;
				}
			}
		},
		updateSignalConfig(
			state,
			{
				payload
			}: PayloadAction<{
				Pin: string;
				Peripheral: string;
				Signal: string;
				PinCfg: Record<string, any>;
			}>
		) {
			const targetPin = state.pins[payload.Pin];

			if (!targetPin) {
				return;
			}

			const signalToUpdate = targetPin.appliedSignals.find(
				signal =>
					signal.Name === payload.Signal &&
					signal.Peripheral === payload.Peripheral
			);

			if (signalToUpdate) {
				signalToUpdate.PinCfg = payload.PinCfg;
			}
		},
		removeAppliedSignal(
			state,
			{
				payload: {Peripheral, Pin, Name}
			}: PayloadAction<
				AppliedSignal &
					Partial<{
						discardPersistence: boolean;
					}>
			>
		) {
			removeSignalFromPin(state, {Pin, Peripheral, Name});
		},
		removeAppliedCoprogrammedSignals(
			state,
			{
				payload
			}: PayloadAction<
				Array<AppliedSignal & Partial<{discardPersistence: boolean}>>
			>
		) {
			for (const signal of payload) {
				const {Pin, Peripheral, Name} = signal;
				removeSignalFromPin(state, {Pin, Peripheral, Name});
			}
		},
		setPinDetailsTargetPin(
			state,
			{payload: pinId}: PayloadAction<string | undefined>
		) {
			state.pinDetailsTargetPin = pinId;
		},
		setAppliedSignalControlValue(
			state,
			{
				payload: {control, projectId}
			}: PayloadAction<{
				control: Control;
				projectId?: string;
				discardPersistence?: boolean;
			}>
		) {
			const socPins = getSocPinDictionary();

			const {
				Peripheral,
				Name,
				pinId,
				control: controlKey,
				controlValue,
				errType,
				pluginOption = false
			} = control;

			if (Peripheral && Name && pinId) {
				const sourcePinCfg = socPins[pinId]?.Signals?.find(
					signal =>
						signal.Name === Name && signal.Peripheral === Peripheral
				)?.PinConfig;

				const controlsList = projectId
					? (getControlsFromCache(
							CONTROL_SCOPES.PIN_CONFIG,
							projectId
						)?.PinConfig ?? [])
					: [];

				// Include only controls that have a configuration step present in the SoC
				const filteredControls = controlsList.filter(control => {
					if (control.PluginOption) return true;

					return Object.prototype.hasOwnProperty.call(
						sourcePinCfg ?? {},
						control.Id
					);
				});

				const targetAssignedPin = state.pins[
					pinId
				].appliedSignals.find(
					appliedSignal =>
						appliedSignal.Peripheral === Peripheral &&
						appliedSignal.Name === Name
				);

				if (targetAssignedPin) {
					targetAssignedPin.Errors = {
						...targetAssignedPin.Errors,
						[controlKey]: errType
					};

					if (
						Object.values(targetAssignedPin.Errors).every(
							error => !error
						)
					)
						delete targetAssignedPin.Errors;
				}

				if (sourcePinCfg && targetAssignedPin) {
					const newConfig = {
						...(targetAssignedPin.PinCfg ?? {}),
						[controlKey]: controlValue
					};

					targetAssignedPin.PinCfg = computeNextPinConfig({
						controls: filteredControls,
						pinId,
						Name,
						Peripheral,
						newConfig
					});
				} else if (targetAssignedPin && pluginOption) {
					// For plugin options, we need to set the value directly
					targetAssignedPin.PinCfg = {
						...targetAssignedPin.PinCfg,
						[controlKey]: controlValue
					};
				}
			}
		},
		setResetControlValues(
			state,
			{
				payload: {Peripheral, Name, pinId, resetValues}
			}: PayloadAction<{
				Peripheral: string | undefined;
				Name: string | undefined;
				pinId: string | undefined;
				resetValues: Record<string, string>;
			}>
		) {
			if (pinId && Peripheral && Name) {
				const targetAssignedPin = state.pins[
					pinId
				].appliedSignals.find(
					appliedSignal =>
						appliedSignal.Peripheral === Peripheral &&
						appliedSignal.Name === Name
				);

				if (targetAssignedPin) {
					targetAssignedPin.PinCfg = {...resetValues};
				}
			}
		},
		setHoveredPin(
			state,
			{payload: pinId}: PayloadAction<string | undefined>
		) {
			state.hoveredPin = pinId;
		}
	}
});

export const {
	setIsPinFocused,
	focusPinSet,
	unfocusPinSet,
	setAppliedSignal,
	removeAppliedSignal,
	setPinDetailsTargetPin,
	setAppliedSignalControlValue,
	setResetControlValues,
	assignCoprogrammedSignal,
	setMultiSignalConfig,
	updateSignalConfig,
	removeAppliedCoprogrammedSignals,
	setHoveredPin
} = pinsSlice.actions;

export const pinsReducer = pinsSlice.reducer;
