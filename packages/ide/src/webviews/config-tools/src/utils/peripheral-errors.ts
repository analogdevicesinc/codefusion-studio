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

import type {TFormData} from 'cfs-react-library';
import type {
	PinSignal,
	AssignedPin,
	AppliedSignal,
	ControlCfg
} from '../../../common/types/soc';
import {type PeripheralConfig} from '../types/peripherals';
import {getFormErrors} from './soc-controls';
import {getIsPeripheralSignalRequired} from './soc-peripherals';
import {pinInConflict} from './pin-error';

/**
 * Retrieves the error messages for a given set of controls and their corresponding data.
 * it's used to validate the form data and to be used in the Peripheral Configuration form
 * @param controls - An array of controls per peripheral
 * @param data - The data object containing the values for each control
 */
export const getPeripheralFormErrors = (
	controls: ControlCfg[],
	data: TFormData
): Record<string, string> => {
	let errors: Record<string, string> = {};

	(controls ?? []).forEach(control => {
		errors = getFormErrors(errors, control, data[control.Id]);
	});

	return errors;
};

/**
 * Finds a pin that has been assigned to a specific peripheral and signal combination.
 *
 * @param assignedPins - Array of pin objects with their assigned signals and properties
 * @param peripheralName - The name of the peripheral to search for
 * @param signalName - The name of the signal to search for
 * @returns The pin object that has the specified peripheral and signal assigned to it, or undefined if no match is found
 */
export const getAssignedPin = (
	assignedPins: Array<{
		Name: string;
		Signals: PinSignal[] | undefined;
		pinId: string;
		isFocused: boolean;
		appliedSignals: AppliedSignal[];
	}>,
	peripheralName: string,
	signalName: string
) =>
	assignedPins.find(assignedPin =>
		assignedPin.appliedSignals.some(
			assignedSignal =>
				assignedSignal.Peripheral === peripheralName &&
				assignedSignal.Name === signalName
		)
	);

/**
 * Calculates the number of unassigned but required pins across all peripherals.
 *
 * This function iterates through all peripheral configurations and their signals,
 * checking if required signals have been assigned to pins.
 *
 * @param assignedPins - Array of pins that have been assigned to peripheral signals
 * @param allocations - Record mapping peripheral names to their configuration
 * @returns The count of required peripheral signals that have not been assigned to pins
 */
export function getPeripheralError(
	assignedPins: AssignedPin[],
	allocations: Record<string, PeripheralConfig>,
	controls: Record<string, ControlCfg[]>
): number {
	let count = 0;

	Object.values(allocations).forEach(peripheral => {
		Object.values(peripheral?.signals ?? {}).forEach(signal => {
			const assignedPin = getAssignedPin(
				assignedPins,
				peripheral.name,
				signal.name
			);

			const isRequired = getIsPeripheralSignalRequired(
				peripheral.name,
				signal.name,
				peripheral.config as Record<string, string>
			);

			if (isRequired && !assignedPin) {
				count++;
			}
		});

		const controlsErrors =
			// eslint-disable-next-line @typescript-eslint/prefer-optional-chain
			controls && controls[peripheral?.name]?.length && peripheral
				? getPeripheralFormErrors(
						controls[peripheral.name],
						peripheral?.config ?? {}
					)
				: {};

		if (
			Object.keys(controlsErrors).length &&
			// At least one 1 error found is part of the peripheral configuration
			Object.keys(controlsErrors).some(controlId =>
				Object.keys(peripheral?.config ?? []).includes(controlId)
			)
		)
			count++;
	});

	return count;
}

/**
 * Return True if pins has conflict across all peripherals.
 *
 * This function iterates through all peripheral configurations and their signals,
 * checking if signals assigned to pins have conflict.
 *
 * @param assignedPins - Array of pins that have been assigned to peripheral signals
 * @param allocations - Record mapping peripheral names to their configuration
 * @returns True/false if any peripheral signal has pin conflict
 */

export function hasPeripheralPinConflicts(
	assignedPins: AssignedPin[],
	allocations: Record<string, PeripheralConfig>
): boolean {
	return Object.values(allocations).some(peripheral => {
		// Filter pins that have at least one signal assigned to this peripheral
		const pinsForPeripheral = assignedPins.filter(pin =>
			pin.appliedSignals.some(
				appliedSignal => appliedSignal.Peripheral === peripheral.name
			)
		);
		// Check for conflicts only among those pins
		return pinsForPeripheral.some(
			targetPin =>
				pinInConflict(targetPin.appliedSignals) ||
				targetPin.appliedSignals.some(
					item => Object.keys(item?.Errors ?? {}).length
				)
		);
	});
}
