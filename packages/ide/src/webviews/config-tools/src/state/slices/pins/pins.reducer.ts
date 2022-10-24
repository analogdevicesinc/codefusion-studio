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
	ConfigFields,
	ControlCfg,
	PinCanvas,
	PinDictionary,
	RegisterDictionary
} from '@common/types/soc';
import {evaluateCondition} from '../../../utils/rpn-expression-resolver';
import {
	getCachedSocControls,
	getSocControlsDictionary
} from '../../../utils/soc-controls';
import {computeDefaultValues} from '../../../utils/compute-register-value';
import type {ControlErrorTypes} from '../../../types/errorTypes';
import {getFirmwarePlatform} from '../../../utils/firmware-platform';

type PinsState = {
	pins: PinDictionary;
	pinDetailsTargetPin: string | undefined;
	canvas: PinCanvas | undefined;
	pinConfig: ControlCfg[];
};

type Control = {
	Peripheral: string | undefined;
	Name: string | undefined;
	pinId: string | undefined;
	control: string;
	controlValue: string;
	errType?: ControlErrorTypes;
};

export const pinsInitialState: PinsState = {
	pins: {} satisfies PinDictionary,
	pinDetailsTargetPin: undefined,
	canvas: undefined,
	pinConfig: []
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
			payload.forEach(pinId => {
				if (pinId && state.pins[pinId]) {
					state.pins[pinId].isFocused = true;
				}
			});
		},
		unfocusPinSet(state, {payload}: PayloadAction<string[]>) {
			payload.forEach(pinId => {
				if (pinId && state.pins[pinId]) {
					state.pins[pinId].isFocused = false;
				}
			});
		},
		setAppliedSignal(
			state,
			{
				payload: {Pin, Peripheral, Name, registers}
			}: PayloadAction<
				AppliedSignal &
					Partial<{
						discardPersistence: boolean;
					}> & {registers: RegisterDictionary[]}
			>
		) {
			const targetPin = state.pins[Pin];
			const initialPinCfg: Record<string, string> = {};
			let computedResetValues: Record<string, string> = {};
			let filteredSourcePinCfg: ConfigFields = {};
			const controlsDict = getSocControlsDictionary('PinConfig');
			const firmwarePlatform = getFirmwarePlatform();
			const getControlFirmwarePlatforms = (controlId: string) =>
				state.pinConfig.find(config => config.Id === controlId)
					?.FirmwarePlatforms;

			const sourcePinCfg = state.pins[Pin].details?.Signals?.find(
				signal =>
					signal.Name === Name && signal.Peripheral === Peripheral
			)?.PinConfig;

			if (sourcePinCfg) {
				// Only keep the correct controls based on firmware platform
				filteredSourcePinCfg = Object.keys(
					sourcePinCfg ?? {}
				).reduce<ConfigFields>((acc, controlId) => {
					if (
						!getControlFirmwarePlatforms(controlId) ||
						!firmwarePlatform ||
						getControlFirmwarePlatforms(controlId)?.some(fw =>
							firmwarePlatform
								?.toLowerCase()
								.includes(fw.toLowerCase())
						)
					) {
						acc[controlId] = sourcePinCfg[controlId];
					}

					return acc;
				}, {});

				const signalName =
					targetPin.details?.Signals?.find(
						signal =>
							signal.Name === Name && signal.Peripheral === Peripheral
					)?.Name ?? '';

				computedResetValues = computeDefaultValues(
					filteredSourcePinCfg,
					registers,
					getCachedSocControls('PinConfig'),
					{Name: signalName}
				);

				let augmentedCfg: Record<string, string> | undefined =
					computedResetValues;

				if (augmentedCfg && signalName) {
					augmentedCfg = {...computedResetValues};
					augmentedCfg.Name = signalName;
				}

				Object.entries(filteredSourcePinCfg).forEach(
					([controlKey]) => {
						if (
							evaluateCondition(
								augmentedCfg,
								controlsDict[controlKey]?.Condition
							)
						) {
							initialPinCfg[controlKey] =
								computedResetValues[controlKey];
						}
					}
				);
			}

			if (targetPin) {
				targetPin.appliedSignals.push({
					Pin,
					Peripheral,
					Name,
					PinCfg: initialPinCfg,
					ControlResetValues: computedResetValues
				});
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
			const targetPin = state.pins[Pin];

			if (targetPin) {
				targetPin.appliedSignals = targetPin.appliedSignals.filter(
					signal =>
						!(
							signal.Name === Name && signal.Peripheral === Peripheral
						)
				);
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
				payload: {controls}
			}: PayloadAction<{
				controls: Control[];
				discardPersistence?: boolean;
			}>
		) {
			controls.forEach(controlData => {
				const {
					Peripheral,
					Name,
					pinId,
					control,
					controlValue,
					errType
				} = controlData;

				if (Peripheral && Name && pinId) {
					const sourcePinCfg = state.pins[
						pinId
					].details?.Signals?.find(
						signal =>
							signal.Name === Name && signal.Peripheral === Peripheral
					)?.PinConfig;

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
							[control]: errType
						};

						if (
							Object.values(targetAssignedPin.Errors).every(
								error => !error
							)
						)
							delete targetAssignedPin.Errors;
					}

					if (
						sourcePinCfg &&
						targetAssignedPin?.PinCfg?.[control] !== undefined
					) {
						targetAssignedPin.PinCfg[control] = controlValue;
						const controls = getSocControlsDictionary('PinConfig');

						Object.keys(sourcePinCfg).forEach(controlKey => {
							const targetAssignedPinCfg = targetAssignedPin?.PinCfg;

							const defaultValueForControl =
								targetAssignedPin?.ControlResetValues?.[controlKey];

							let augmentedCfg: Record<string, string> | undefined =
								targetAssignedPinCfg;

							if (augmentedCfg && Name) {
								augmentedCfg = {...targetAssignedPinCfg};
								augmentedCfg.Name = Name;
							}

							if (
								evaluateCondition(
									augmentedCfg,
									controls[controlKey]?.Condition
								)
							) {
								if (!targetAssignedPin.PinCfg) {
									targetAssignedPin.PinCfg = {};
								}

								if (
									targetAssignedPin.PinCfg[controlKey] ===
										undefined &&
									defaultValueForControl
								) {
									targetAssignedPin.PinCfg[controlKey] =
										defaultValueForControl;
								}
							} else {
								delete targetAssignedPin?.PinCfg?.[controlKey];
							}
						});
					}
				}
			});
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
	setAppliedSignalControlValue
} = pinsSlice.actions;

export const pinsReducer = pinsSlice.reducer;
