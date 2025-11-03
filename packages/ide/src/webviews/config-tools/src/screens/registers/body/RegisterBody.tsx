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
import {useCallback, useMemo, useState} from 'react';
import {useSearchString} from '../../../state/slices/app-context/appContext.selector';
import RegisterTable from '../table/RegisterTable';
import styles from './RegisterBody.module.scss';
import computeRegisterValue, {
	computeFieldValue,
	getNamespacedControlIntegerValue
} from '../../../utils/compute-register-value';
import type {
	ConfigFields,
	RegisterConfigField,
	FieldDictionary
} from '@common/types/soc';
import {useAssignedPins} from '../../../state/slices/pins/pins.selector';
import {Chip, Badge} from 'cfs-react-library';
import ContextSearchInput from '../../../components/context-search-input/context-search-input';
import {
	useDiagramData,
	useModifiedClockNodes
} from '../../../state/slices/clock-nodes/clockNodes.selector';
import {
	getClockNodeConfig,
	getClockNodeDictionary
} from '../../../utils/clock-nodes';
import {
	getRegisterDetails,
	getRegisterDictionary
} from '../../../utils/register-dictionary';
import {RegisterDetailsTable} from '../register-details-table/register-details-table';
import {RegisterDetailsHeader} from '../register-details-header/register-details-header';
import {setActiveSearchString} from '../../../state/slices/app-context/appContext.reducer';
import {useDispatch} from 'react-redux';
import {usePeripheralAllocations} from '../../../state/slices/peripherals/peripherals.selector';
import {getSocPeripheralDictionary} from '../../../utils/soc-peripherals';
import {
	useGasketOptions,
	useStreams
} from '../../../state/slices/gaskets/gasket.selector';
import type {DFGStream, GasketConfig} from 'cfs-plugins-api';
import {getGasketDictionary} from '../../../utils/dfg';
import {getClockFrequencyDictionary} from '../../../utils/rpn-expression-resolver';
import {filterClockFrequencies} from '../../../utils/persistence';
import {getSocPinDetails} from '../../../utils/soc-pins';

export type ComputedRegisters = Array<{
	name: string;
	description: string;
	address: string;
	value: string | number;
	isResetValue: boolean;
}>;

function getRegistersCount(amount: number) {
	return Boolean(amount) && <Badge>{amount}</Badge>;
}

// eslint-disable-next-line max-params
function addToRegisterConfigs(
	configs: Record<
		string,
		Record<string, RegisterConfigField[] | undefined>
	>,
	configNamespace: string,
	controlNamespace: string,
	dmConfig: ConfigFields | undefined,
	key: string,
	value: string
) {
	if (dmConfig?.[key] && value !== undefined && value !== '') {
		// If we can't find the value, try "VALUE" as it is most likely an entry box.
		const cfg = dmConfig[key][value] ?? dmConfig[key].VALUE;

		configs[configNamespace] = configs[configNamespace] ?? {};
		configs[configNamespace][key] =
			configs[configNamespace][key] ?? [];

		cfg?.forEach(s => {
			configs[configNamespace][key]?.push({
				...s,
				ControlValue: getNamespacedControlIntegerValue(
					controlNamespace,
					key,
					value
				)
			});
		});
	}
}

export default function RegisterBody() {
	const assignedPins = useAssignedPins();
	const modifiedClockNodes = useModifiedClockNodes();
	const diagramData = useDiagramData();
	const allocatedPeripherals = usePeripheralAllocations();
	const dfgGaskets = useGasketOptions();
	const dfgStreams = useStreams();
	const dmGaskets = getGasketDictionary();

	const [activeRegister, setActiveRegister] = useState<
		string | undefined
	>();
	const activeRegisterDetails = getRegisterDetails(activeRegister);
	const registerDictionary = getRegisterDictionary();
	const dispatch = useDispatch();

	const AssignedPinsRegisterConfigs = useMemo(
		() =>
			assignedPins
				.map(assignedPin =>
					assignedPin.appliedSignals.map(appliedSignal => {
						const pinSignal = assignedPin.Signals?.find(
							signal =>
								signal.Name === appliedSignal.Name &&
								signal.Peripheral === appliedSignal.Peripheral
						);

						const peripheral = appliedSignal.Peripheral
							? getSocPeripheralDictionary()[
									getSocPinDetails(assignedPin.pinId ?? 'not found')
										?.GPIOName ?? 'not found'
								]
							: undefined;
						const initCfg = peripheral?.initialization;

						// @TODO: Review if we actually need to decouple the pin config and signal config.
						return {
							pinConfig: Object.entries(appliedSignal.PinCfg ?? {})
								.map(([controlKey, controlValue]) => {
									const cfg =
										pinSignal?.PinConfig?.[controlKey]?.[
											controlValue
										];
									// eslint-disable-next-line max-nested-callbacks
									return cfg?.map(s => ({
										...s,
										ControlValue: getNamespacedControlIntegerValue(
											'PinConfig',
											controlKey,
											controlValue
										)
									}));
								})
								.flat(),
							// The ControlValue is not used in PinMux and initialization sequences.
							signalConfig: [
								...(pinSignal?.PinMuxConfig ?? []),
								...(initCfg ?? [])
							]
						};
					})
				)
				.flat(),
		[assignedPins]
	);

	const registerConfigs = useMemo(() => {
		const configs: Record<
			string,
			Record<string, RegisterConfigField[] | undefined>
		> = {};

		configs.ClockConfig = {};

		Object.values(modifiedClockNodes).forEach(node => {
			Object.entries(node.controlValues ?? {}).forEach(
				([key, value]) => {
					const nodeConfig = getClockNodeConfig(node.Name);
					const configNamespace = node.Name + ' ClockConfig';

					addToRegisterConfigs(
						configs,
						configNamespace,
						'ClockConfig',
						nodeConfig.Config,
						key,
						value
					);
				}
			);
		});

		// Add Initialization sequences for any enabled clock nodes.
		const clockFreqs = filterClockFrequencies(
			diagramData,
			getClockFrequencyDictionary()
		);
		Object.keys(clockFreqs).forEach(key => {
			const node = Object.values(getClockNodeDictionary()).find(c =>
				c.Outputs.find(o => o.Name === key)
			);

			if (node?.Initialization) {
				const configNamespace = node.Name + ' ClockConfig';
				configs[configNamespace] = configs[configNamespace] ?? {};
				configs[configNamespace].Initialization = [
					...(configs[configNamespace].Initialization ?? []),
					...node.Initialization?.map(s => ({...s, ControlValue: 0}))
				];
			}
		});

		Object.values(allocatedPeripherals).forEach(peripheralDict => {
			Object.entries(peripheralDict)
				.filter(([peripheralName]) =>
					Boolean(
						getSocPeripheralDictionary()[peripheralName]?.config
					)
				)
				.forEach(([peripheralName, peripheral]) => {
					const peripheralConfigFields =
						getSocPeripheralDictionary()[peripheralName].config;

					configs[peripheralName] = configs[peripheralName] || {};

					Object.entries(peripheral.config).forEach(
						([key, value]) => {
							addToRegisterConfigs(
								configs,
								peripheralName,
								peripheralName,
								peripheralConfigFields,
								key,
								String(value)
							);
						}
					);
				});
		});

		dfgGaskets.forEach((gasket: GasketConfig) => {
			const controlNamespace = gasket.Name + ' DFGGasketConfig';

			if (gasket.Config) {
				const dmGasket = dmGaskets[gasket.Name];
				Object.entries(gasket.Config).forEach(([key, value]) => {
					addToRegisterConfigs(
						configs,
						controlNamespace,
						controlNamespace,
						dmGasket?.Config,
						key,
						String(value)
					);
				});
			}
		});

		dfgStreams.forEach((stream: DFGStream) => {
			const srcNamespace = stream.Source.Gasket + ' DFGStreamConfig';
			const srcGasket = dmGaskets[stream.Source.Gasket];
			const srcIdx = stream.Source.Index;

			if (stream.Source.Config) {
				Object.entries(stream.Source.Config).forEach(
					([key, value]) => {
						addToRegisterConfigs(
							configs,
							srcNamespace,
							srcNamespace,
							srcGasket?.OutputStreams[srcIdx].Config,
							key,
							String(value)
						);
					}
				);
			}

			// Add setting for stream ID
			addToRegisterConfigs(
				configs,
				srcNamespace,
				srcNamespace,
				srcGasket?.OutputStreams[srcIdx].BuiltInConfig,
				'STREAM_ID',
				String(stream.StreamId)
			);

			// Add setting for buffer start address
			addToRegisterConfigs(
				configs,
				srcNamespace,
				srcNamespace,
				srcGasket?.OutputStreams[srcIdx].BuiltInConfig,
				'START_ADDR',
				String(stream.Source.BufferAddress)
			);

			// Add setting for buffer end address
			addToRegisterConfigs(
				configs,
				srcNamespace,
				srcNamespace,
				srcGasket?.OutputStreams[srcIdx].BuiltInConfig,
				'END_ADDR',
				String(
					stream.Source.BufferAddress + stream.Source.BufferSize - 1
				)
			);

			// Add destination gasket ID
			const destGasket = dmGaskets[stream.Destinations[0].Gasket];
			addToRegisterConfigs(
				configs,
				srcNamespace,
				srcNamespace,
				srcGasket?.OutputStreams[srcIdx].BuiltInConfig,
				'DEST_ID',
				String(destGasket?.Id)
			);

			if (stream.Destinations?.length > 1) {
				// Set up the multi-cast mask
				addToRegisterConfigs(
					configs,
					srcNamespace,
					srcNamespace,
					srcGasket?.OutputStreams[srcIdx].BuiltInConfig,
					'MCAST',
					String(
						stream.Destinations.reduce(
							(acc, dest) =>
								// eslint-disable-next-line no-bitwise
								acc |
								// eslint-disable-next-line no-bitwise
								(1 << ((dmGaskets[dest.Gasket]?.Id ?? 1) - 1)),
							0
						)
					)
				);
			}

			for (const destination of stream.Destinations) {
				const destNamespace = destination.Gasket + ' DFGStreamConfig';
				const destGasket = dmGaskets[destination.Gasket];
				const destIdx = destination.Index;

				if (destination.Config) {
					Object.entries(destination.Config).forEach(
						([key, value]) => {
							addToRegisterConfigs(
								configs,
								destNamespace,
								destNamespace,
								destGasket?.InputStreams[destIdx].Config,
								key,
								String(value)
							);
						}
					);
				}

				// Add setting for stream ID
				addToRegisterConfigs(
					configs,
					destNamespace,
					destNamespace,
					destGasket?.InputStreams[destIdx].BuiltInConfig,
					'STREAM_ID',
					String(stream.StreamId)
				);

				// Add setting for buffer start address
				addToRegisterConfigs(
					configs,
					destNamespace,
					destNamespace,
					destGasket?.InputStreams[destIdx].BuiltInConfig,
					'START_ADDR',
					String(stream.Source.BufferAddress)
				);

				// Add setting for buffer end address
				addToRegisterConfigs(
					configs,
					destNamespace,
					destNamespace,
					destGasket?.InputStreams[destIdx].BuiltInConfig,
					'END_ADDR',
					String(
						destination.BufferAddress + destination.BufferSize - 1
					)
				);
			}
		});

		return configs;
	}, [
		dfgStreams,
		dfgGaskets,
		dmGaskets,
		allocatedPeripherals,
		modifiedClockNodes,
		diagramData
	]);

	const computedRegisters: ComputedRegisters = useMemo(
		() =>
			registerDictionary.map(register => {
				const {value, isResetValue} = computeRegisterValue(
					AssignedPinsRegisterConfigs,
					Object.values(registerConfigs),
					register
				);

				return {
					name: register.name,
					description: register.description,
					address: register.address,
					value,
					isResetValue
				};
			}),
		[AssignedPinsRegisterConfigs, registerConfigs, registerDictionary]
	);

	const [filterState, setFilterState] = useState<{
		filter: 'modified' | 'unmodified' | undefined;
		filteredRegisters: ComputedRegisters;
		filteredDetails: FieldDictionary[];
	}>({filter: undefined, filteredRegisters: [], filteredDetails: []});

	const getFilteredRegisters = useCallback(
		(isResetValue: boolean) =>
			computedRegisters.filter(
				register => register.isResetValue === isResetValue
			),
		[computedRegisters]
	);

	const modifiedRegisters = useMemo(
		() => getFilteredRegisters(false),
		[getFilteredRegisters]
	);

	const unmodifiedRegisters = useMemo(
		() => getFilteredRegisters(true),
		[getFilteredRegisters]
	);

	const filterRegistersBySearch = (
		registers: ComputedRegisters,
		searchString: string
	) =>
		registers.filter(
			register =>
				register.name
					.toLowerCase()
					.includes(searchString.toLowerCase()) ||
				register.address
					.toLowerCase()
					.includes(searchString.toLowerCase())
		);

	const searchString = useSearchString('register');
	const searchResults = filterState.filteredRegisters.length
		? filterRegistersBySearch(
				filterState.filteredRegisters,
				searchString
			)
		: filterRegistersBySearch(computedRegisters, searchString);

	const getModifiedRegisterFields = () =>
		activeRegisterDetails?.fields.filter(field => {
			const value = Number(
				computeFieldValue(
					AssignedPinsRegisterConfigs,
					Object.values(registerConfigs),
					activeRegisterDetails.name,
					field,
					field.reset
				)
			);

			return value !== Number(field.reset);
		});

	const getModifiedRegisters = () => {
		if (activeRegisterDetails) {
			return getModifiedRegisterFields() ?? [];
		}

		return filterState.filter === 'modified' && searchString
			? searchResults.filter(register => !register.isResetValue)
			: modifiedRegisters;
	};

	const getUnmodifiedRegisters = () => {
		if (activeRegisterDetails) {
			return activeRegisterDetails.fields.filter(
				field => !getModifiedRegisterFields()?.includes(field)
			);
		}

		return filterState.filter === 'unmodified' && searchString
			? searchResults.filter(register => register.isResetValue)
			: unmodifiedRegisters;
	};

	const filteredRegFields = (
		activeRegisterDetails?.fields ?? [
			...getUnmodifiedRegisters(),
			...getModifiedRegisters()
		]
	).filter(r =>
		r.name.toLowerCase().includes(searchString.toLowerCase())
	);

	const unmodifiedRegCnt = filteredRegFields.filter(r =>
		getUnmodifiedRegisters().some(m => m.name === r.name)
	).length;

	const modifiedRegCnt = filteredRegFields.filter(r =>
		getModifiedRegisters().some(m => m.name === r.name)
	).length;

	const clearSearch = () => {
		dispatch(
			setActiveSearchString({
				searchContext: 'register',
				value: ''
			})
		);
	};

	const chipClickHandler = (newFilter: 'modified' | 'unmodified') => {
		if (newFilter === filterState.filter) {
			clearFilters();
		} else {
			const newFilteredRegisters =
				newFilter === 'modified'
					? getModifiedRegisters()
					: getUnmodifiedRegisters();

			setFilterState({
				filter: newFilter,
				filteredRegisters: activeRegisterDetails
					? []
					: (newFilteredRegisters as ComputedRegisters),
				filteredDetails: activeRegisterDetails
					? (newFilteredRegisters as FieldDictionary[])
					: []
			});
		}
	};

	const clearFilters = (): void => {
		setFilterState({
			filter: undefined,
			filteredRegisters: [],
			filteredDetails: []
		});
	};

	const closeDetailsTable = (): void => {
		clearFilters();
		clearSearch();
		setActiveRegister(undefined);
	};

	return (
		<>
			{activeRegisterDetails ? (
				<RegisterDetailsHeader
					register={activeRegisterDetails}
					value={
						computedRegisters
							.find(
								register =>
									register.name === activeRegisterDetails.name
							)
							?.value?.toString() ?? ''
					}
					onCloseDetails={closeDetailsTable}
				/>
			) : (
				<div className={styles.heading}>Registers</div>
			)}
			<section className={styles.container}>
				<div className={styles.search}>
					<ContextSearchInput searchContext='register' />
				</div>
				<Chip
					isActive={filterState.filter === 'modified'}
					label='Modified'
					isDisabled={modifiedRegCnt === 0}
					dataValue={modifiedRegCnt}
					dataTest='Modified'
					onClick={() => {
						chipClickHandler('modified');
					}}
				>
					{getRegistersCount(modifiedRegCnt)}
				</Chip>
				<Chip
					isActive={filterState.filter === 'unmodified'}
					label='Unmodified'
					isDisabled={unmodifiedRegCnt === 0}
					dataValue={unmodifiedRegCnt}
					dataTest='Unmodified'
					onClick={() => {
						chipClickHandler('unmodified');
					}}
				>
					{getRegistersCount(unmodifiedRegCnt)}
				</Chip>
				<div className={styles.divider} />
				<div className={styles.info}>
					<div>&lowast;</div>
					<div>Modified from reset value</div>
				</div>
			</section>

			{!activeRegister && (
				<div>
					{searchResults.length ? (
						<RegisterTable
							computedRegisters={searchResults}
							setActiveRegister={registerName => {
								clearSearch();
								clearFilters();
								setActiveRegister(registerName);
							}}
						/>
					) : (
						<div style={{textAlign: 'center'}}>No results found</div>
					)}
				</div>
			)}
			{activeRegisterDetails &&
				(modifiedRegCnt + unmodifiedRegCnt > 0 ? (
					<RegisterDetailsTable
						assignedPinsRegisterConfigs={AssignedPinsRegisterConfigs}
						registerConfigs={Object.values(registerConfigs)}
						registerDetails={
							filterState.filteredDetails.length
								? filterState.filteredDetails
								: activeRegisterDetails.fields
						}
						registerName={activeRegisterDetails.name}
						modifiedRegisterDetails={
							getModifiedRegisterFields() ?? []
						}
					/>
				) : (
					<div style={{textAlign: 'center'}}>No results found</div>
				))}
		</>
	);
}
