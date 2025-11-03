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
	ControlCfg,
	PinCanvas,
	PinDictionary
} from '@common/types/soc';
import {getControlsFromCache} from '../../../utils/api';
import type {ControlErrorTypes} from '@common/types/errorTypes';
import type {ConfigFields} from '@common/types/soc';
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

const getFilteredControlsAndCfg = (
	controls: ControlCfg[],
	pinId: string,
	name: string,
	peripheral: string | undefined
): {
	filteredControls: ControlCfg[];
	sourcePinCfg: ConfigFields | undefined;
} => {
	const socPins = getSocPinDictionary();
	const sourcePinCfg = socPins[pinId]?.Signals?.find(
		signal => signal.Name === name && signal.Peripheral === peripheral
	)?.PinConfig;

	const filteredControls = controls.filter(control => {
		if (control.PluginOption) return true;

		return Object.prototype.hasOwnProperty.call(
			sourcePinCfg ?? {},
			control.Id
		);
	});

	return {filteredControls, sourcePinCfg};
};

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
				const controlsList = projectId
					? (getControlsFromCache(
							CONTROL_SCOPES.PIN_CONFIG,
							projectId
						)?.PinConfig ?? [])
					: [];

				// Include only controls that have a configuration step present in the SoC
				const {filteredControls, sourcePinCfg} =
					getFilteredControlsAndCfg(
						controlsList,
						pinId,
						Name,
						Peripheral
					);

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
				payload: {Peripheral, Name, pinId, controls, resetValues}
			}: PayloadAction<{
				Peripheral: string | undefined;
				Name: string | undefined;
				pinId: string | undefined;
				controls: ControlCfg[];
				resetValues: Record<string, string>;
			}>
		) {
			const {filteredControls} = getFilteredControlsAndCfg(
				controls,
				pinId ?? '',
				Name ?? '',
				Peripheral
			);

			if (pinId && Peripheral && Name) {
				const targetAssignedPin = state.pins[
					pinId
				].appliedSignals.find(
					appliedSignal =>
						appliedSignal.Peripheral === Peripheral &&
						appliedSignal.Name === Name
				);

				if (targetAssignedPin) {
					targetAssignedPin.PinCfg = computeNextPinConfig({
						controls: filteredControls,
						pinId,
						Name,
						Peripheral,
						newConfig: {...resetValues}
					});
				}
			}
		},
		setHoveredPin(
			state,
			{payload: pinId}: PayloadAction<string | undefined>
		) {
			state.hoveredPin = pinId;
		},
		updateAppliedSignal(
			state,
			{
				payload
			}: PayloadAction<{
				removeSignal: {Pin: string; Peripheral: string; Name: string};
				addSignal: {
					Pin: string;
					Peripheral: string;
					Name: string;
					PinCfg: Record<string, string> | undefined;
				};
			}>
		) {
			//added to atomicly update both removal and addition of signal in signal Assignment
			removeSignalFromPin(state, payload.removeSignal);

			// Add the new signal
			const targetPin = state.pins[payload.addSignal.Pin];
			if (targetPin) {
				targetPin.appliedSignals.push(payload.addSignal);
			}
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
	setHoveredPin,
	updateAppliedSignal
} = pinsSlice.actions;

export const pinsReducer = pinsSlice.reducer;
