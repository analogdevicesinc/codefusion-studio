/**
 *
 * Copyright (c) 2024-2026 Analog Devices, Inc.
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
	type ConfiguredPin,
	type ConfiguredClockNode,
	type ConfiguredPartition,
	type ConfiguredProject
} from '@common/api';
import type {
	ClockNodesDictionary,
	PinDictionary
} from '@common/types/soc';
import {type ClockNodeSet} from '../state/slices/clock-nodes/clockNodes.reducer';
import {type Partition} from '../state/slices/partitions/partitions.reducer';
import {convertDecimalToHex} from './memory';
import {type PeripheralConfig} from '../types/peripherals';
import {formatPeripheralConfigValues} from './peripheral';
import {getProjectInfoList} from './config';
import {getClockNodeDictionary} from './clock-nodes';
import type {ClockNodeStatus} from './clock-evaluation';
import {type Zephelin} from 'cfs-types';
import {
	getDefaultProfilingInterval,
	getInterfaces,
	getUARTPorts
} from '../state/slices/profiling/profilingPeripherals';

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
					signalConfigMap.set(
						`${peripheral.Name}:${signal.Name}`,
						signal.Config
					);
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
						PinCfg: signalConfigMap.get(`${Peripheral}:${Signal}`),
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
					Peripheral: signal.Peripheral,
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
		const {
			Name: _Name,
			Description: _Description,
			IsPrimary: _IsPrimary,
			CoreNum: _CoreNum,
			...coreInfo
		} = project;
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
				// `project.access` is a loosely-typed Redux string (it can also
				// hold '' while no access has been assigned yet); narrow it to
				// the persisted schema's literal union here.
				Access: project.access as ConfiguredPartition['Access'],
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
				Config: formatPeripheralConfigValues(
					peripheralConfig.config,
					peripheralConfig.configFormat
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
					Config: formatPeripheralConfigValues(
						peripheralConfig.config,
						peripheralConfig.configFormat
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
	nodesStatus: Record<string, ClockNodeStatus>,
	clockFrequencies: Record<string, string | number>
) {
	const clockNodeDictionary = getClockNodeDictionary();

	const enabledClockNodes = new Set<string>();

	for (const [nodeName, nodeStatus] of Object.entries(nodesStatus)) {
		if (nodeStatus?.enabled) {
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

export function getDefaultZephelinProfilerConfig(): Partial<Zephelin> {
	const defaultInterface = getInterfaces()[0];

	return {
		Enabled: false,
		RtosEventsEnabled: false,
		ProfilingMemoryUsageEnabled: false,
		ProfilingMemoryUsageInterval: getDefaultProfilingInterval(),
		ProfilingCpuLoadEnabled: false,
		ProfilingCpuLoadInterval: getDefaultProfilingInterval(),
		AIEnabled: false,
		InstrumentationSubsystemEnabled: false,
		InstrumentationTriggerFunction: '',
		InstrumentationStopperFunction: '',
		Interface:
			defaultInterface === 'USB'
				? {Type: 'USB'}
				: {
						Type: 'UART',
						Port: Object.keys(getUARTPorts())[0] ?? ''
					}
	};
}
