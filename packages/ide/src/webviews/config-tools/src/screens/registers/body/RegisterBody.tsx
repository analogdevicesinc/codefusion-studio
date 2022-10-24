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
import {useCallback, useMemo, useState} from 'react';
import {
	useRegisterDetails,
	useRegisters,
	useSearchString
} from '../../../state/slices/app-context/appContext.selector';
import RegisterTable from '../table/RegisterTable';
import styles from './RegisterBody.module.scss';
import computeRegisterValue from '../../../utils/compute-register-value';
import type {
	ConfigField,
	RegisterDictionary
} from '@common/types/soc';
import {useAssignedPins} from '../../../state/slices/pins/pins.selector';
import {Modal} from '@common/components/modal/Modal';
import {
	VSCodeButton,
	VSCodeBadge,
	VSCodePanels,
	VSCodePanelTab,
	VSCodePanelView
} from '@vscode/webview-ui-toolkit/react';
import RegisterField from '../register-field/RegisterField';
import {Chip} from '@common/components/chip/Chip';
import SearchInput from '../../../components/search-input/SearchInput';
import Svg from 'react-inlinesvg';
import {useModifiedClockNodes} from '../../../state/slices/clock-nodes/clockNodes.selector';

export type ComputedRegisters = Array<{
	name: string;
	description: string;
	address: string;
	value: string | number;
	isResetValue: boolean;
}>;

function getRegistersCount(type: ComputedRegisters) {
	const count = type.length;

	return Boolean(count) && <VSCodeBadge>{count}</VSCodeBadge>;
}

function formatSvgPath(svgFile: string) {
	const resourcesPath =
		(window as any).__webview_resources_path__ ??
		'missing_resources_path';

	return `${resourcesPath}/register-svgs/${svgFile}`;
}

export default function RegisterBody() {
	const registers: RegisterDictionary[] = useRegisters();
	const assignedPins = useAssignedPins();
	const modifiedClockNodes = useModifiedClockNodes();
	const [activeRegister, setActiveRegister] = useState<
		string | undefined
	>();
	const activeRegisterDetails = useRegisterDetails(activeRegister);

	const AssignedPinsRegisterConfigs = useMemo(
		() =>
			assignedPins
				.map(assignedPin =>
					assignedPin.appliedSignals.map(appliedSignal => {
						const pinSignal = assignedPin.details.Signals?.find(
							signal => signal.Name === appliedSignal.Name
						);

						// @TODO: Review if we actually need to decouple the pin config and signal config.
						return {
							pinConfig: Object.entries(appliedSignal.PinCfg ?? {})
								.map(
									([controlKey, controlValue]) =>
										pinSignal?.PinConfig?.[controlKey]?.[controlValue]
								)
								.flat(),
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
						if (
							node.Config[key] &&
							(value !== undefined || value !== '')
						) {
							acc[key] = node.Config[key][value];
						}

						return acc;
					},
					{}
				);

				return targetConfigs;
			}),
		[modifiedClockNodes]
	);

	const computedRegisters: ComputedRegisters = useMemo(
		() =>
			registers.map(register => {
				const {value, isResetValue} = computeRegisterValue(
					AssignedPinsRegisterConfigs,
					modifiedClockNodesRegisterConfigs,
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
			registers
		]
	);

	const [filterState, setFilterState] = useState<{
		filter: 'modified' | 'unmodified' | undefined;
		filteredRegisters: ComputedRegisters;
	}>({filter: undefined, filteredRegisters: []});

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

	const handleModalClose = () => {
		setActiveRegister(undefined);
	};

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
			setFilterState({filter: undefined, filteredRegisters: []});
		} else {
			const newFilteredRegisters =
				newFilter === 'modified'
					? modifiedRegisters
					: unmodifiedRegisters;
			setFilterState({
				filter: newFilter,
				filteredRegisters: newFilteredRegisters
			});
		}
	};

	return (
		<>
			<section className={styles.container}>
				<div className={styles.search}>
					<SearchInput searchContext='register' />
				</div>
				<Chip
					isActive={filterState.filter === 'modified'}
					label='Modified'
					isDisabled={modifiedRegisters.length}
					dataValue={modifiedRegisters.length}
					dataTest='Modified'
					onClick={() => {
						chipClickHandler('modified');
					}}
				>
					{getRegistersCount(modifiedRegisters)}
				</Chip>
				<Chip
					isActive={filterState.filter === 'unmodified'}
					label='Unmodified'
					isDisabled={unmodifiedRegisters.length}
					dataValue={unmodifiedRegisters.length}
					dataTest='Unmodified'
					onClick={() => {
						chipClickHandler('unmodified');
					}}
				>
					{getRegistersCount(unmodifiedRegisters)}
				</Chip>
				<div className={styles.divider} />
				<div className={styles.info}>
					<div>&lowast;</div>
					<div>Modified from reset value</div>
				</div>
			</section>

			{searchResults.length ? (
				<RegisterTable
					computedRegisters={searchResults}
					setActiveRegister={setActiveRegister}
				/>
			) : (
				<div style={{textAlign: 'center'}}>No results found</div>
			)}

			{activeRegister && (
				<Modal
					isOpen={activeRegister !== undefined}
					isDynamicHeight={false}
					footer={
						<VSCodeButton
							appearance='secondary'
							onClick={handleModalClose}
						>
							Close
						</VSCodeButton>
					}
					handleModalClose={handleModalClose}
				>
					{activeRegisterDetails && (
						<div className={styles.modalBody}>
							<div style={{marginBottom: '40px'}}>
								<h1>{activeRegisterDetails.name}</h1>
								<p>{activeRegisterDetails.description}</p>
							</div>
							<VSCodePanels>
								<VSCodePanelTab>Bit Fields</VSCodePanelTab>
								<VSCodePanelTab>Diagram</VSCodePanelTab>
								<VSCodePanelView>
									<div style={{width: '100%'}}>
										{activeRegisterDetails.fields.map(field => (
											<RegisterField
												key={field.id}
												field={field}
												activeRegister={activeRegisterDetails}
												assignedPinsRegisterConfigs={
													AssignedPinsRegisterConfigs
												}
												modifiedClockNodesConfigs={
													modifiedClockNodesRegisterConfigs
												}
											/>
										))}
									</div>
								</VSCodePanelView>
								<VSCodePanelView>
									<div className={styles.registerImgContainer}>
										<Svg
											src={formatSvgPath(activeRegisterDetails.svg)}
											title='Default Register Values'
											width='100%'
											height='100%'
										/>
									</div>
								</VSCodePanelView>
							</VSCodePanels>
						</div>
					)}
				</Modal>
			)}
		</>
	);
}
