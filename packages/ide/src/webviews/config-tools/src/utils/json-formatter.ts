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
import type {
	Soc,
	Pin,
	AppliedSignal,
	ConfigFields,
	PinDictionary,
	Package,
	MemoryBlock
} from '@common/types/soc';
import {isPinReserved} from './is-pin-reserved';
import {type Partition} from '../state/slices/partitions/partitions.reducer';
import type {
	ConfiguredProject,
	ConfiguredPartition,
	ConfiguredPin
} from '@common/api';
import {
	getBaseblockFromAddress,
	getPartitionBlockNames,
	mapDisplayUnit
} from './memory';
import {type PeripheralConfig} from '../types/peripherals';
import {getSocPeripheralDictionary} from './soc-peripherals';

export type PeripheralSignalsTargets = {
	signalsTargets: Record<string, string | undefined>;
};

type PinConfigDataStructure = Record<
	string,
	Array<{
		assignedSignal: string;
		assignedPinId: string;
		assignedPinCfg?: ConfigFields;
	}>
>;

export const formatPeripheralSignalsTargets = (
	json: Soc,
	persistedPins: ConfiguredPin[]
) => {
	const peripheralDict: Record<string, PeripheralSignalsTargets> = {};
	for (const peripheral of json.Peripherals) {
		const newPeripheral: PeripheralSignalsTargets = {
			signalsTargets: {}
		};

		peripheralDict[peripheral.Name] = newPeripheral;
	}

	for (const pin of json.Packages[0].Pins) {
		if (pin.Signals && !isPinReserved(pin.Name)) {
			// Default the current target pin of the signal to the first in the list
			for (const signal of pin.Signals) {
				const isSignalFoundInPeripheral =
					peripheralDict[signal.Peripheral ?? ''].signalsTargets[
						signal.Name
					];

				if (!isSignalFoundInPeripheral) {
					peripheralDict[signal.Peripheral ?? ''].signalsTargets[
						signal.Name
					] = pin.Name;
				} else {
					// Found the pin for the signal associated with the peripheral
					const persistedPin = persistedPins?.find(
						pPin =>
							pPin.Peripheral === signal.Peripheral &&
							pPin.Signal === signal.Name
					);

					if (persistedPin) {
						peripheralDict[signal.Peripheral ?? ''].signalsTargets[
							signal.Name
						] = persistedPin.Pin;
					}
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
	(socPackage?.Pins ?? []).reduce<PinDictionary>((acc, pin) => {
		acc[pin.Name] = {
			pinId: pin.Name,
			isFocused: false,
			appliedSignals: []
		};

		return acc;
	}, {});

export const formatPartitions = (
	soc: Soc,
	projects: Array<Partial<ConfiguredProject>>,
	memoryBlocks: MemoryBlock[]
) => {
	const partitionDict =
		projects?.reduce<Record<string, Partition>>((acc, core) => {
			const socCore = soc.Cores.find(c => c.Id === core.CoreId);
			core.Partitions?.forEach((partition: ConfiguredPartition) => {
				if (acc[partition.StartAddress]) {
					acc[partition.StartAddress] = {
						...acc[partition.StartAddress],
						projects: [
							...acc[partition.StartAddress].projects,
							{
								coreId: core.CoreId ?? '',
								projectId: core.ProjectId ?? '',
								label: socCore?.Name ?? '',
								access: partition.Access,
								owner: partition.IsOwner
							}
						],
						config: {
							...acc[partition.StartAddress].config,
							...(core.ProjectId
								? {[core.ProjectId]: partition.Config}
								: {})
						}
					};
				} else {
					const startAddress = parseInt(partition.StartAddress, 16);
					const baseBlock = getBaseblockFromAddress(
						memoryBlocks,
						startAddress
					)!;
					const type = baseBlock?.Type ?? '';

					acc[partition.StartAddress] = {
						displayName: partition.Name,
						type,
						baseBlock: baseBlock ?? {
							Name: '',
							Description: '',
							AddressStart: '',
							AddressEnd: '',
							Width: 0,
							Access: '',
							Location: '',
							Type: ''
						},
						blockNames: getPartitionBlockNames(
							memoryBlocks,
							startAddress,
							partition.Size
						),
						startAddress:
							partition.StartAddress.toUpperCase().replace('0X', ''),
						size: partition.Size,
						displayUnit: mapDisplayUnit(partition.DisplayUnit),
						projects: [
							{
								coreId: core.CoreId ?? '',
								projectId: core.ProjectId ?? '',
								label: socCore?.Name ?? '',
								access: partition.Access,
								owner: partition.IsOwner
							}
						],
						config: {
							...(core.ProjectId
								? {[core.ProjectId]: partition.Config}
								: {})
						}
					};
				}
			});

			return acc;
		}, {}) ?? {};

	return Object.values(partitionDict);
};

export const formatPeripheralAllocations = (
	projects: Array<Partial<ConfiguredProject>>,
	json: Soc
) => {
	const peripheralAllocations: Record<string, PeripheralConfig> = {};
	const socPeripheralDict = getSocPeripheralDictionary();
	const numericBaseMap: Record<string, Record<string, string>> = {};
	json.Peripherals.forEach(socPeripheral => {
		if (json.Controls[socPeripheral.Name]) {
			numericBaseMap[socPeripheral.Name] = {};
			json.Controls[socPeripheral.Name].forEach(control => {
				if (control.NumericBase) {
					numericBaseMap[socPeripheral.Name][control.Id] =
						control.NumericBase;
				}
			});
		}
	});

	projects.forEach(project => {
		project.Peripherals?.forEach(peripheral => {
			if (!peripheralAllocations[peripheral.Name]) {
				peripheralAllocations[peripheral.Name] = {
					name: peripheral.Name,
					...(peripheral.Description
						? {
								description: peripheral.Description
							}
						: {}),
					// The UI depends on the absence of coreId at the top level of a peripheral assignment level to map correctly GPIOs
					// For cases like DMA where there is an assignable property but it has no signal, we need to add the coreId
					...(socPeripheralDict[peripheral.Name]?.assignable ||
					!peripheral.Signals?.length
						? {projectId: project.ProjectId}
						: {}),
					signals: {},
					config: peripheral.Config
						? Object.fromEntries(
								Object.entries(peripheral.Config).map(
									([key, value]) => {
										const numericBase =
											numericBaseMap[peripheral.Name]?.[key];
										if (numericBase === 'Hexadecimal') {
											return [
												key,
												value.toUpperCase().replace(/^0X/i, '')
											];
										}
										return [key, value];
									}
								)
							)
						: {}
				};
			}

			peripheral.Signals.forEach(signal => {
				peripheralAllocations[peripheral.Name].signals[signal.Name] =
					{
						name: signal.Name,
						...(signal.Description && {
							description: signal.Description
						}),
						projectId: project.ProjectId ?? '',
						config: signal.Config ?? {}
					};
			});
		});
	});

	return peripheralAllocations;
};

export function formatSocCoreMemoryBlocks(dataModel: Soc): Soc {
	const updatedModel: Soc = JSON.parse(JSON.stringify(dataModel));
	const memoryMap = new Map<string, MemoryBlock>();

	// Add Core memory blocks without AliasType
	for (const core of updatedModel.Cores) {
		for (const mem of core.Memory) {
			// Add to memoryMap if AliasType is not set
			if (!('AliasType' in mem) || mem.AliasType === undefined) {
				memoryMap.set(mem.Name, mem as MemoryBlock);
			}
		}
	}

	// Overwrite with SystemMemory entries
	for (const mem of updatedModel.SystemMemory ?? []) {
		memoryMap.set(mem.Name, mem);
	}

	// Update each core's memory using memoryMap
	for (const core of updatedModel.Cores) {
		core.Memory = core.Memory.map(entry => {
			const base = memoryMap.get(entry.Name);
			if (!base) return entry;

			return {
				...base,
				...entry
			};
		});
	}

	return updatedModel;
}
