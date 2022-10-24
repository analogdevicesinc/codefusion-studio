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
import {
	showInformationMessage,
	type ConfiguredPin,
	type ConfiguredClockNode
} from '@common/api';
import type {
	ClockNodesDictionary,
	PinDictionary
} from '@common/types/soc';
import {
	removeAppliedSignal,
	setAppliedSignal,
	setAppliedSignalControlValue
} from '../state/slices/pins/pins.reducer';
import {setCurrentTarget} from '../state/slices/peripherals/peripherals.reducer';
import type {Store} from '../state/store';
import {
	setClockNodeControlValue,
	type ClockNodeSet
} from '../state/slices/clock-nodes/clockNodes.reducer';

export function applyPersistedPinConfig(
	dataModelPins: PinDictionary,
	persistedPinConfig: ConfiguredPin[]
) {
	if (persistedPinConfig.length > 0) {
		persistedPinConfig.forEach(
			({
				Pin,
				Peripheral,
				Signal,
				Config,
				ControlResetValues,
				Errors
			}) => {
				if (dataModelPins[Pin]) {
					dataModelPins[Pin].appliedSignals.push({
						Name: Signal,
						Peripheral,
						Pin,
						PinCfg: Config,
						ControlResetValues,
						Errors
					});
				}
			}
		);
	}
}

export function applyPersistedClockNodeConfig(
	dataModelClockNodes: ClockNodesDictionary,
	persistedClockNodes: ConfiguredClockNode[]
) {
	if (persistedClockNodes.length > 0) {
		persistedClockNodes.forEach(({Name, Control, Value, Error}) => {
			const currentClockNode = Object.values(
				dataModelClockNodes
			).find(clockNodesForType =>
				Object.values(clockNodesForType).find(
					clockNode => clockNode.Name === Name
				)
			);
			const type = currentClockNode?.[Name].Type;

			if (type && dataModelClockNodes[type][Name]) {
				dataModelClockNodes[type][Name].controlValues = {
					...dataModelClockNodes[type][Name].controlValues,
					[Control]: Value
				};
			}

			if (type && Error) {
				dataModelClockNodes[type][Name].Errors = {[Control]: Error};
			}
		});
	}
}

export function formatPinPersistencePayload(pins: PinDictionary) {
	const configuredPins: ConfiguredPin[] = [];

	for (const [pinName, pinData] of Object.entries(pins)) {
		if (pinData.appliedSignals.length > 0) {
			pinData.appliedSignals.forEach(signal => {
				configuredPins.push({
					Pin: pinName,
					Peripheral: signal.Peripheral ?? '',
					Signal: signal.Name,
					Config: signal.PinCfg ?? {},
					ControlResetValues: signal.ControlResetValues,
					Errors: signal.Errors
				});
			});
		}
	}

	return configuredPins;
}

export function formatClockNodePersistencePayload(
	clockNodeSet: ClockNodeSet
) {
	return {
		Type: clockNodeSet.type,
		Name: clockNodeSet.name,
		Control: clockNodeSet.key,
		Value: clockNodeSet.value,
		Error: clockNodeSet.error
	};
}

export function handleConfigDocumentUpdates(
	event: MessageEvent,
	store: Store
) {
	if (
		event.data.type !== 'document-changed' ||
		event.data.reason === undefined ||
		store === undefined
	)
		return;

	let notificationString = '';

	const currentPins = store.getState().pinsReducer.pins;

	const currentClockNodes =
		store.getState().clockNodesReducer.clockNodes;

	const {registers} =
		store.getState().appContextReducer.registersScreen;

	const currentlyAssignedPins = Object.keys(
		currentPins
	).reduce<PinDictionary>((acc, pin) => {
		if (currentPins[pin].appliedSignals.length > 0) {
			acc[pin] = currentPins[pin];
		}

		return acc;
	}, {});

	const configFilePins = (event.data.pins as ConfiguredPin[]).reduce<
		Record<string, ConfiguredPin[]>
	>((acc, pin) => {
		if (!acc[pin.Pin]) {
			acc[pin.Pin] = [];
		}

		acc[pin.Pin].push(pin);

		return acc;
	}, {});

	const configFileClockNodes = (
		event.data.clockNodes as ConfiguredClockNode[]
	).reduce<Record<string, ConfiguredClockNode>>((acc, clockNode) => {
		acc[clockNode.Control] = clockNode;

		return acc;
	}, {});

	let targetClockNode: ConfiguredClockNode | undefined;

	// Check for desyncs between nodes present in state and .cfs file, if they exist then we know what node we need to change
	targetClockNode = Object.values(configFileClockNodes).find(
		clockNode =>
			clockNode.Value !==
			currentClockNodes[clockNode.Type][clockNode.Name]
				.controlValues?.[clockNode.Control]
	);

	if (!targetClockNode) {
		// Check for desyncs between nodes present in state that may have been deleted in .cfs file because of them turning to an initial value
		Object.values(currentClockNodes).forEach(clockNodeForType => {
			Object.values(clockNodeForType).forEach(clockNode => {
				Object.entries(clockNode.controlValues ?? {}).forEach(
					([control, controlVal]) => {
						const initialControlVal =
							clockNode.initialControlValues?.[control];

						// Check that remaining nodes that weren't persisted in .cfs file have their initial value
						// At most we can always have one that has diverged
						if (
							configFileClockNodes[control]?.Control !== control &&
							initialControlVal !== undefined &&
							controlVal !== initialControlVal
						) {
							targetClockNode = {
								Type: clockNode.Type,
								Name: clockNode.Name,
								Control: control,
								Value: initialControlVal,
								Error: clockNode.Errors?.[control]
							};
						}
					}
				);
			});
		});
	}

	// If the number of assigned pins is greater than the number of pins in the config file, it means a pin was removed
	if (
		Object.keys(currentlyAssignedPins).length >
		Object.keys(configFilePins).length
	) {
		const removedAssignment = Object.keys(currentlyAssignedPins).find(
			pin => !Object.keys(configFilePins).includes(pin)
		);

		if (removedAssignment) {
			store.dispatch(
				removeAppliedSignal({
					...currentPins[removedAssignment].appliedSignals[0],
					discardPersistence: true
				})
			);
		}

		notificationString = `Assignment for pin ${removedAssignment} was removed`;
	}

	// If the number of assigned pins is less than the number of pins in the config file, it means a pin was added
	if (
		Object.keys(currentlyAssignedPins).length <
		Object.keys(configFilePins).length
	) {
		const newAssignment = Object.keys(configFilePins).find(
			pin => !Object.keys(currentlyAssignedPins).includes(pin)
		);

		if (newAssignment) {
			store.dispatch(
				setAppliedSignal({
					Pin: newAssignment,
					Peripheral: configFilePins[newAssignment][0].Peripheral,
					Name: configFilePins[newAssignment][0].Signal,
					PinCfg: configFilePins[newAssignment][0].Config,
					discardPersistence: true,
					registers
				})
			);

			store.dispatch(
				setCurrentTarget({
					peripheralGroup:
						configFilePins[newAssignment][0].Peripheral,
					signalName: configFilePins[newAssignment][0].Signal,
					dropdownVal: newAssignment
				})
			);
		}

		notificationString = `Assignment for pin ${newAssignment} was added`;
	}

	// If the number of assigned pins is equal to the number of pins in the config file, it means a pin config was potentially updated
	if (
		Object.keys(currentlyAssignedPins).length ===
		Object.keys(configFilePins).length
	) {
		Object.keys(currentlyAssignedPins).forEach(pin => {
			const currentPin = currentlyAssignedPins[pin];
			const configFilePin = configFilePins[pin];

			if (!configFilePin) {
				const currentlyAssignedSignal = currentPin.appliedSignals[0];
				const newPin = Object.values(configFilePins)
					.flat()
					.filter(
						({Signal}) => Signal === currentlyAssignedSignal.Name
					)?.[0];

				store.dispatch(
					removeAppliedSignal({
						...currentPin.appliedSignals[0],
						discardPersistence: true
					})
				);

				if (newPin) {
					store.dispatch(
						setAppliedSignal({
							Pin: newPin.Pin,
							Peripheral: newPin.Peripheral,
							Name: newPin.Signal,
							PinCfg: newPin.Config,
							discardPersistence: true,
							registers
						})
					);

					store.dispatch(
						setCurrentTarget({
							peripheralGroup: newPin.Peripheral,
							signalName: newPin.Signal,
							dropdownVal: newPin.Pin
						})
					);
				}

				notificationString = `Assignment for pin ${pin} was removed and added to pin ${newPin?.Pin}`;

				// If there are less signals in the state compared to the ones in the config file, it means a signal was added.
			} else if (
				currentPin.appliedSignals.length < configFilePins[pin]?.length
			) {
				const newSignal = configFilePins[pin].find(
					signal =>
						!currentPin.appliedSignals
							.map(({Name}) => Name)
							.includes(signal.Signal)
				);

				if (newSignal) {
					store.dispatch(
						setAppliedSignal({
							Pin: pin,
							Peripheral: newSignal.Peripheral,
							Name: newSignal.Signal,
							PinCfg: newSignal.Config,
							discardPersistence: true,
							registers
						})
					);
				}

				notificationString = `Signal ${newSignal?.Signal} was added to pin ${pin}`;

				// If there are more signals in the state compared to the ones in the config file, it means a signal was removed.
			} else if (
				currentPin.appliedSignals.length > configFilePins[pin]?.length
			) {
				const removedSignal = currentPin.appliedSignals.find(
					signal =>
						!configFilePins[pin]
							.map(({Signal}) => Signal)
							.includes(signal.Name)
				);

				if (removedSignal) {
					store.dispatch(
						removeAppliedSignal({
							...removedSignal,
							discardPersistence: true
						})
					);
				}

				notificationString = `Signal ${removedSignal?.Name} was removed from pin ${pin}`;

				// If the number of signals in the state is equal to the number of signals in the config file,
				// it means a signal config was potentially updated
			} else if (
				currentPin.appliedSignals.length ===
				configFilePins[pin].length
			) {
				currentPin.appliedSignals.forEach(appliedSignal => {
					const configFileSignal = configFilePins[pin].find(
						signal =>
							signal.Signal === appliedSignal.Name &&
							signal.Peripheral === appliedSignal.Peripheral
					);

					if (configFileSignal) {
						for (const key in configFileSignal.Config) {
							if (
								configFileSignal.Config[key] !==
								appliedSignal.PinCfg?.[key]
							) {
								store.dispatch(
									setAppliedSignalControlValue({
										controls: [
											{
												Peripheral: configFileSignal.Peripheral,
												Name: configFileSignal.Signal,
												pinId: pin,
												control: key,
												controlValue: configFileSignal.Config[key],
												errType: configFileSignal.Errors?.[key]
											}
										],
										discardPersistence: true
									})
								);

								notificationString = `Configuration for signal ${configFileSignal.Signal} on pin ${pin} was updated`;

								break;
							}
						}
					}
				});
			}
		});
	}

	if (targetClockNode) {
		const {Type, Name, Control, Value, Error} = targetClockNode;
		store.dispatch(
			setClockNodeControlValue({
				type: Type,
				name: Name,
				key: Control,
				value: Value,
				error: Error,
				discardPersistence: true
			})
		);

		notificationString = `Control ${Control} of node ${Name} was undo'd to ${Value || 'empty string'}`;
	}

	void showInformationMessage(notificationString);
}
