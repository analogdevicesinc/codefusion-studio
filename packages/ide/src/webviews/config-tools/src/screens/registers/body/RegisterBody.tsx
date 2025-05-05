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
import type {ConfigField, FieldDictionary} from '@common/types/soc';
import {useAssignedPins} from '../../../state/slices/pins/pins.selector';
import {Chip, Badge} from 'cfs-react-library';
import ContextSearchInput from '../../../components/context-search-input/context-search-input';
import {useModifiedClockNodes} from '../../../state/slices/clock-nodes/clockNodes.selector';
import {getClockNodeConfig} from '../../../utils/clock-nodes';
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

export default function RegisterBody() {
	const assignedPins = useAssignedPins();
	const modifiedClockNodes = useModifiedClockNodes();
	const allocatedPeripherals = usePeripheralAllocations();

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

						// @TODO: Review if we actually need to decouple the pin config and signal config.
						return {
							pinConfig: Object.entries(appliedSignal.PinCfg ?? {})
								.map(([controlKey, controlValue]) => {
									const cfg =
										pinSignal?.PinConfig?.[controlKey]?.[
											controlValue
										];
									// eslint-disable-next-line max-nested-callbacks
									cfg?.forEach(s => {
										s.ControlValue = getNamespacedControlIntegerValue(
											'PinConfig',
											controlKey,
											controlValue
										);
									});

									return cfg;
								})
								.flat(),
							// The ControlValue is not used in PinMux sequences.
							signalConfig: pinSignal?.PinMuxConfig
						};
					})
				)
				.flat(),
		[assignedPins]
	);

	const modifiedClockNodesRegisterConfigs = useMemo(
		() =>
			Object.values(modifiedClockNodes).map(node => {
				const targetConfigs = Object.entries(
					node.controlValues ?? {}
				).reduce<Record<string, ConfigField[] | undefined>>(
					(acc, [key, value]) => {
						const nodeConfig = getClockNodeConfig(node.Name);

						if (
							nodeConfig.Config[key] &&
							(value !== undefined || value !== '')
						) {
							let cfg = nodeConfig.Config[key][value];
							cfg?.forEach(s => {
								s.ControlValue = getNamespacedControlIntegerValue(
									'ClockConfig',
									key,
									value
								);
							});

							if (!cfg) {
								// It is most likely an entry box. Try "VALUE".
								cfg = nodeConfig.Config[key].VALUE;
								cfg?.forEach(s => {
									s.ControlValue = getNamespacedControlIntegerValue(
										'ClockConfig',
										key,
										value
									);
								});
							}

							acc[key] = cfg;
						}

						return acc;
					},
					{}
				);

				return targetConfigs;
			}),
		[modifiedClockNodes]
	);

	const peripheralRegisterConfig = Object.values(
		allocatedPeripherals
	).map(peripheralDict =>
		Object.entries(peripheralDict)
			.filter(([peripheralName]) =>
				Boolean(getSocPeripheralDictionary()[peripheralName].config)
			)
			.reduce<Record<string, ConfigField[]>>(
				(acc, [peripheralName, peripheral]) => {
					const peripheralConfigFields =
						getSocPeripheralDictionary()[peripheralName].config;

					Object.entries(peripheral.config).forEach(
						([key, value]) => {
							if (peripheralConfigFields?.[key]) {
								let cfg = peripheralConfigFields[key][String(value)];
								cfg?.forEach(s => {
									s.ControlValue = getNamespacedControlIntegerValue(
										peripheralName,
										key,
										String(value)
									);
								});

								if (!cfg) {
									// It is most likely an entry box. Try "VALUE".
									cfg = peripheralConfigFields[key].VALUE;
									cfg?.forEach(s => {
										s.ControlValue = getNamespacedControlIntegerValue(
											peripheralName,
											key,
											String(value)
										);
									});
								}

								acc[key] = cfg;
							}
						}
					);

					return acc;
				},
				{}
			)
	);

	const computedRegisters: ComputedRegisters = useMemo(
		() =>
			registerDictionary.map(register => {
				const {value, isResetValue} = computeRegisterValue(
					AssignedPinsRegisterConfigs,
					modifiedClockNodesRegisterConfigs,
					peripheralRegisterConfig,
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
		[
			AssignedPinsRegisterConfigs,
			modifiedClockNodesRegisterConfigs,
			peripheralRegisterConfig,
			registerDictionary
		]
	);

	const clearSearch = () => {
		dispatch(
			setActiveSearchString({
				searchContext: 'register',
				value: ''
			})
		);
	};

	const [filterState, setFilterState] = useState<{
		filter: 'modified' | 'unmodified' | undefined;
		filteredRegisters: ComputedRegisters;
		filteredDetails: FieldDictionary[];
	}>({filter: undefined, filteredRegisters: [], filteredDetails: []});

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

	const getModifiedRegisterFields = () =>
		activeRegisterDetails?.fields.filter(field => {
			const value = Number(
				computeFieldValue(
					AssignedPinsRegisterConfigs,
					modifiedClockNodesRegisterConfigs,
					peripheralRegisterConfig,
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
					isDisabled={getModifiedRegisters()?.length === 0}
					dataValue={getModifiedRegisters()?.length}
					dataTest='Modified'
					onClick={() => {
						chipClickHandler('modified');
					}}
				>
					{getRegistersCount(getModifiedRegisters()?.length ?? 0)}
				</Chip>
				<Chip
					isActive={filterState.filter === 'unmodified'}
					label='Unmodified'
					isDisabled={getUnmodifiedRegisters().length === 0}
					dataValue={getUnmodifiedRegisters().length}
					dataTest='Unmodified'
					onClick={() => {
						chipClickHandler('unmodified');
					}}
				>
					{getRegistersCount(getUnmodifiedRegisters().length)}
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
			{activeRegisterDetails && (
				<RegisterDetailsTable
					assignedPinsRegisterConfigs={AssignedPinsRegisterConfigs}
					modifiedClockNodesConfigs={
						modifiedClockNodesRegisterConfigs
					}
					allocatedPeripheralRegisterConfigs={
						peripheralRegisterConfig
					}
					registerDetails={
						filterState.filteredDetails.length
							? filterState.filteredDetails
							: activeRegisterDetails.fields
					}
					registerName={activeRegisterDetails.name}
					modifiedRegisterDetails={getModifiedRegisterFields() ?? []}
				/>
			)}
		</>
	);
}
