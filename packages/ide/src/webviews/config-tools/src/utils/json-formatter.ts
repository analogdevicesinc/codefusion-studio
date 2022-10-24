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
import type {
	Soc,
	Pin,
	AppliedSignal,
	ConfigFields,
	PinDictionary,
	Package
} from '@common/types/soc';

export type Signal = {
	name: string;
	description: string;
	pins: Pin[];
	currentTarget: string | undefined;
	invalid?: Record<string, string[]>;
};

type PeripheralSignalDict = {
	dict: Record<string, Signal>;
};

export type FormattedPeripheral = {
	name: string;
	signals: PeripheralSignalDict;
};

type PinConfigDataStructure = Record<
	string,
	Array<{
		assignedSignal: string;
		assignedPinId: string;
		assignedPinCfg?: ConfigFields;
	}>
>;

export const formatPeripheralData = (json: Soc) => {
	const peripheralDict: Record<string, FormattedPeripheral> = {};

	for (const peripheral of json.Peripherals) {
		const newPeripheral: FormattedPeripheral = {
			name: peripheral.Name,
			signals: {
				dict: {}
			}
		};

		if (peripheral.Signals) {
			for (const signal of peripheral.Signals) {
				const newSignal = {
					name: signal.Name,
					description: signal.Description,
					pins: [],
					currentTarget: undefined
				};

				newPeripheral.signals.dict[newSignal.name] = newSignal;
			}
		}

		peripheralDict[peripheral.Name] = newPeripheral;
	}

	for (const pin of json.Packages[0].Pins) {
		if (pin.Signals && pin.Signals.length > 1) {
			const newPin = {
				Name: pin.Name,
				Label: pin.Label,
				Description: pin.Description,
				Position: pin.Position,
				Signals: pin.Signals
			};

			for (const signal of pin.Signals) {
				const targetSignal =
					peripheralDict[signal.Peripheral ?? ''].signals.dict[
						signal.Name
					];

				targetSignal.pins.push(newPin);

				// Default the current target pin of the signal to the first in the list
				if (targetSignal.pins.length === 1) {
					targetSignal.currentTarget = newPin.Name;
				}
			}
		}
	}

	return peripheralDict;
};

export const formatAssignedPins = (
	structure: Array<{
		details: Pin;
		isFocused: boolean;
		appliedSignals: AppliedSignal[];
	}>
) => {
	const formattedDataStructure = structure.reduce(
		(acc: PinConfigDataStructure, pin) => {
			pin.appliedSignals.forEach(appliedSignal => {
				if (appliedSignal.Peripheral) {
					if (!acc[appliedSignal.Peripheral]) {
						acc[appliedSignal.Peripheral] = [];
					}

					const signal = pin.details?.Signals?.find(
						signal =>
							signal.Name === appliedSignal.Name &&
							signal.Peripheral === appliedSignal.Peripheral
					);

					acc[appliedSignal.Peripheral].push({
						assignedSignal: appliedSignal.Name,
						assignedPinId: appliedSignal.Pin,
						assignedPinCfg: signal?.PinConfig
					});
				}
			});

			return acc;
		},
		{}
	);

	return formattedDataStructure;
};

export const formatPinDictionary = (socPackage: Package) =>
	socPackage.Pins.reduce<PinDictionary>((acc, pin) => {
		acc[pin.Name] = {
			details: {
				...pin,
				Signals: pin.Signals?.map(signal => ({
					...signal,
					coprogrammedSignals: socPackage.CoprogrammedSignals?.filter(
						coprogrammedSignalOuterArray =>
							coprogrammedSignalOuterArray.some(
								coprogrammedSignalObj =>
									coprogrammedSignalObj.Pin === pin.Name &&
									coprogrammedSignalObj.Peripheral ===
										signal.Peripheral
							)
					)?.flatMap(coprogrammedSignalOuterArray =>
						coprogrammedSignalOuterArray.filter(
							coprogrammedSignalObj =>
								coprogrammedSignalObj.Pin !== pin.Name
						)
					)
				}))
			},
			isFocused: false,
			appliedSignals: []
		};

		return acc;
	}, {});
