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
import {
	showInformationMessage,
	type ConfiguredPin,
	type ConfiguredClockNode,
	type ConfiguredProject
} from '@common/api';
import type {
	ClockNodesDictionary,
	PinDictionary
} from '@common/types/soc';
import {
	removeAppliedCoprogrammedSignals,
	removeAppliedSignal,
	setAppliedSignal
} from '../state/slices/pins/pins.reducer';
import {setCurrentTarget} from '../state/slices/peripherals/peripherals.reducer';
import type {Store} from '../state/store';
import {
	setClockNodeControlValue,
	type ClockNodeSet
} from '../state/slices/clock-nodes/clockNodes.reducer';
import {type Partition} from '../state/slices/partitions/partitions.reducer';
import {convertDecimalToHex} from './memory';
import {type PeripheralConfig} from '../types/peripherals';
import {getProjectInfoList} from './config';
import {getClockNodeDictionary} from './clock-nodes';

export function applyPersistedPinConfig(
	dataModelPins: PinDictionary,
	persistedPinConfig: ConfiguredPin[],
	persistedCores?: ConfiguredProject[]
) {
	// NOTE we persist pin config in cores.
	const signalConfigMap = new Map<string, Record<string, string>>();
	persistedCores?.forEach(core => {
		core.Peripherals.forEach(peripheral => {
			peripheral.Signals.forEach(signal => {
				if (signal.Config) {
					signalConfigMap.set(signal.Name, signal.Config);
				}
			});
		});
	});

	if (persistedPinConfig.length > 0) {
		persistedPinConfig.forEach(
			({Pin, Peripheral, Signal, Errors}) => {
				if (dataModelPins[Pin]) {
					dataModelPins[Pin].appliedSignals.push({
						Name: Signal,
						Peripheral,
						Pin,
						PinCfg: signalConfigMap.get(Signal),
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
			if (dataModelClockNodes[Name]) {
				dataModelClockNodes[Name].controlValues = {
					...dataModelClockNodes[Name].controlValues,
					[Control]: Value
				};
			}

			if (Error) {
				dataModelClockNodes[Name].Errors = {[Control]: Error};
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
					Errors: signal.Errors
				});
			});
		}
	}

	return configuredPins;
}

export function formatProjectPersistencePayload(
	partitions: Partition[],
	peripheralAssigments: Record<string, PeripheralConfig>,
	pins: PinDictionary
) {
	const projectInfoList = getProjectInfoList();

	const projectDict = Object.values(projectInfoList ?? []).reduce<
		Record<string, ConfiguredProject>
	>((acc, project) => {
		const {Name, Description, IsPrimary, CoreNum, ...coreInfo} =
			project;
		acc[project.ProjectId] = {
			...coreInfo,
			Partitions: [],
			Peripherals: []
		};

		return acc;
	}, {});

	partitions.forEach(partition => {
		partition.projects.forEach(project => {
			projectDict[project.projectId].Partitions.push({
				Name: partition.displayName,
				// Consistent formatting in saved JSON
				StartAddress: convertDecimalToHex(
					parseInt(partition.startAddress, 16)
				),
				Size: partition.size,
				DisplayUnit: partition.displayUnit,
				IsOwner: project.owner,
				Access: project.access,
				Config: partition.config?.[project.projectId] ?? {}
			});
		});
	});

	const pinConfigMap = new Map<
		string,
		Record<string, string> | undefined
	>();

	Object.values(pins).forEach(pinState => {
		pinState.appliedSignals.forEach(signal => {
			pinConfigMap.set(
				`${signal.Peripheral}:${signal.Name}`,
				signal.PinCfg
			);
		});
	});

	Object.values(peripheralAssigments).forEach(peripheralConfig => {
		// Scenario when signal group or entire peripheral is allocated.
		if (peripheralConfig.projectId) {
			const Signals = Object.entries(
				peripheralConfig.signals || {}
			).map(([_, signal]) => ({
				Name: signal.name,
				Config:
					pinConfigMap.get(
						`${peripheralConfig.name}:${signal.name}`
					) ?? {}
			}));

			projectDict[peripheralConfig.projectId].Peripherals.push({
				Name: peripheralConfig.name,
				...(peripheralConfig.description
					? {
							Description: peripheralConfig.description
						}
					: {}),
				Signals,
				Config: Object.fromEntries(
					Object.entries(peripheralConfig.config).map(
						([key, value]) => {
							const numericBase = peripheralConfig.configFormat?.numericBase?.[key];
							if (numericBase === 'Hexadecimal' && typeof value === 'string') {
								return [key, convertDecimalToHex(parseInt(value, 16))];
							}
							return [key, String(value)];
						}
					)
				)
			});

			return;
		}

		// Scenario when signals are allocated individually. Ex: GPIO
		Object.values(peripheralConfig.signals).forEach(signal => {
			const existingPeripheral = projectDict[
				signal.projectId
			].Peripherals.find(
				peripheral => peripheral.Name === peripheralConfig.name
			);

			if (existingPeripheral) {
				existingPeripheral.Signals.push({
					Name: signal.name,
					...(signal.description
						? {
								Description: signal.description
							}
						: {}),
					Config:
						pinConfigMap.get(
							`${peripheralConfig.name}:${signal.name}`
						) ?? {}
				});
			} else {
				projectDict[signal.projectId].Peripherals.push({
					Name: peripheralConfig.name,
					...(peripheralConfig.description
						? {
								Description: peripheralConfig.description
							}
						: {}),
					Signals: [
						{
							Name: signal.name,
							...(signal.description
								? {
										Description: signal.description
									}
								: {}),
							Config:
								pinConfigMap.get(
									`${peripheralConfig.name}:${signal.name}`
								) ?? {}
						}
					],
					Config: Object.fromEntries(
						Object.entries(peripheralConfig.config).map(
							([key, value]) => {
								const numericBase = peripheralConfig.configFormat?.numericBase?.[key];
								if (numericBase === 'Hexadecimal' && typeof value === 'string') {
									return [key, convertDecimalToHex(parseInt(value, 16))];
								}
								return [key, String(value)];
							}
						)
					)
				});
			}
		});
	});

	return Object.values(projectDict);
}

export function formatClockNodePersistencePayload(
	clockNodeSet: ClockNodeSet
) {
	return {
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

	// @TODO impement persistance for cores / peripheral assignments

	let notificationString = '';

	const currentPins = store.getState().pinsReducer.pins;

	const currentClockNodes =
		store.getState().clockNodesReducer.clockNodes;

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
			currentClockNodes[clockNode.Name].controlValues?.[
				clockNode.Control
			]
	);

	if (!targetClockNode) {
		// Check for desyncs between nodes present in state that may have been deleted in .cfs file because of them turning to an initial value
		Object.entries(currentClockNodes).forEach(
			([nodeName, nodeState]) => {
				Object.entries(nodeState.controlValues ?? {}).forEach(
					([control, controlVal]) => {
						const initialControlVal =
							nodeState.initialControlValues?.[control];

						// Check that remaining nodes that weren't persisted in .cfs file have their initial value
						// At most we can always have one that has diverged
						if (
							configFileClockNodes[control]?.Control !== control &&
							initialControlVal !== undefined &&
							controlVal !== initialControlVal
						) {
							targetClockNode = {
								Name: nodeName,
								Control: control,
								Value: initialControlVal,
								Error: nodeState.Errors?.[control]
							};
						}
					}
				);
			}
		);
	}

	// If the number of assigned pins in state is greater than the number of pins in the config file, it means a pin was removed
	if (
		Object.keys(currentlyAssignedPins).length >
		Object.keys(configFilePins).length
	) {
		// Find all removed assignments
		const removedAssignments = Object.keys(
			currentlyAssignedPins
		).filter(pin => !Object.keys(configFilePins).includes(pin));

		if (removedAssignments.length > 0) {
			if (removedAssignments.length === 1) {
				// Single removed assignment, use removeAppliedSignal
				const removedAssignment = removedAssignments[0];
				store.dispatch(
					removeAppliedSignal({
						...currentPins[removedAssignment].appliedSignals[0],
						discardPersistence: true
					})
				);
				notificationString = `Assignment for pin ${removedAssignment} was removed`;
			} else {
				// Multiple removed assignments (coprogrammed signals), use removeAppliedCoprogrammedSignals
				const payloads = removedAssignments.map(pin => ({
					...currentPins[pin].appliedSignals[0],
					discardPersistence: true
				}));

				store.dispatch(removeAppliedCoprogrammedSignals(payloads));
				notificationString = `Assignments for pins ${removedAssignments.join(', ')} were removed`;
			}
		}
	}

	// If the number of assigned pins in state is less than the number of pins in the config file, it means a pin was added
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
					discardPersistence: true
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
							discardPersistence: true
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
							discardPersistence: true
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
			}
		});
	}

	if (targetClockNode) {
		const {Name, Control, Value, Error} = targetClockNode;
		store.dispatch(
			setClockNodeControlValue({
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

/**
 * Filters clock frequencies to only include frequencies from enabled clock nodes
 *
 * This function examines the diagram data to determine which clock nodes are enabled,
 * and then filters the clock frequencies dictionary to only include frequencies
 * that are outputs of enabled clock nodes.
 *
 * @param diagramData - The diagram state object containing the enabled/disabled status of each clock node
 * @param clockFrequencies - The original clock frequencies dictionary to be filtered
 * @returns A new clock frequencies dictionary containing only frequencies from enabled clock nodes
 *
 */
export function filterClockFrequencies(
	diagramData: Record<
		string,
		{enabled: boolean | undefined; error: boolean | undefined}
	>,
	clockFrequencies: Record<string, string | number>
) {
	const clockNodeDictionary = getClockNodeDictionary();

	const enabledClockNodes = new Set<string>();

	for (const [nodeName, nodeData] of Object.entries(diagramData)) {
		if (nodeData?.enabled) {
			enabledClockNodes.add(nodeName);
		}
	}

	const enabledFrequencies = new Set<string>();

	for (const [nodeName, clockNode] of Object.entries(
		clockNodeDictionary
	)) {
		if (enabledClockNodes.has(nodeName)) {
			clockNode.Outputs?.forEach(output => {
				enabledFrequencies.add(output.Name);
			});
		}
	}

	const filteredClockFrequencies: Record<string, string | number> =
		{};

	for (const [frequencyName, value] of Object.entries(
		clockFrequencies
	)) {
		if (enabledFrequencies.has(frequencyName)) {
			filteredClockFrequencies[frequencyName] = value;
		}
	}

	return filteredClockFrequencies;
}
