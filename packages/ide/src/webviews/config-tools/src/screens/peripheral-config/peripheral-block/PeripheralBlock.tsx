/**
 *
 * Copyright (c) 2024 - 2025 Analog Devices, Inc.
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
import {memo, useState, useCallback, useMemo, useEffect} from 'react';
import Accordion from '@common/components/accordion/Accordion';
import type {
	FormattedPeripheral,
	FormattedPeripheralSignal
} from '../../../../../common/types/soc';
import CoreSelector from '../core-selector/CoreSelector';
import PeripheralSignal from '../peripheral-signal/PeripheralSignal';
import PeripheralSignalGroup from '../peripheral-signal-group/PeripheralSignalGroup';
import styles from './PeripheralBlock.module.scss';
import {useAppDispatch} from '../../../state/store';
import {
	setPeripheralAssignment,
	setSignalAssignment,
	setSignalGroupAssignment
} from '../../../state/slices/peripherals/peripherals.reducer';
import {setIsAllocatingCore} from '../../../state/slices/app-context/appContext.reducer';
import {usePeripheralAllocations} from '../../../state/slices/peripherals/peripherals.selector';
import {usePinsByPeripheral} from '../../../state/slices/pins/pins.selector';
import {
	categorizeAllocationsByName,
	computePeripheralResetValues
} from '../../../utils/soc-peripherals';
import {computeInitialPinConfig} from '../../../utils/pin-reset-controls';
import {
	setMultiSignalConfig,
	updateSignalConfig
} from '../../../state/slices/pins/pins.reducer';
import {type PeripheralConfig} from '../../../types/peripherals';
import {
	getProjectInfoList,
	getIsExternallyManagedProyect
} from '../../../utils/config';
import {useIsAllocatingProject} from '../../../state/slices/app-context/appContext.selector';
import CircledCheckmark from '../../../../../common/icons/CircledCheckmark';
import accordianStyles from '@common/components/accordion/Accordion.module.scss';
import {getControlsForProjectIds} from '../../../utils/api';
import {CONTROL_SCOPES} from '../../../constants/scopes';
import {evaluateCondition} from '../../../utils/rpn-expression-resolver';

function findCoreIdBySignalName(
	name: string,
	allocations: Map<string, PeripheralConfig>
): string | undefined {
	for (const [, peripheral] of allocations) {
		if (peripheral.signals) {
			for (const signalKey of Object.keys(peripheral.signals)) {
				const signal = peripheral.signals[signalKey];

				if (signal.name === name) {
					return signal.projectId;
				}
			}
		}
	}

	return undefined;
}

function PeripheralBlock({
	name,
	signalGroup,
	signals,
	cores,
	security
}: FormattedPeripheral<FormattedPeripheralSignal>) {
	const dispatch = useAppDispatch();
	const isAllocatingProject = useIsAllocatingProject();
	const projectConfig = getProjectInfoList();
	const allocations = usePeripheralAllocations();
	const [isOpen, setIsOpen] = useState<boolean>(false);
	const title = signalGroup ? signalGroup : name;
	const peripheralPins = usePinsByPeripheral(title);

	const projects = projectConfig?.filter(project =>
		cores?.includes(project.CoreId)
	);

	const [allocatedTarget, setAllocatedTarget] = useState<
		string | undefined
	>(undefined);

	const categorizedAllocations = useMemo(
		() => categorizeAllocationsByName(allocations),
		[allocations]
	);

	const handleCoreSelectionDone = useCallback(() => {
		dispatch(setIsAllocatingCore(false));
	}, [dispatch]);

	const handleSignalGroupSelected = useCallback(
		async (projectId: string) => {
			if (!allocatedTarget) return;

			const isExternallyManaged =
				getIsExternallyManagedProyect(projectId);

			const controls = await (isExternallyManaged
				? Promise.resolve(undefined)
				: getControlsForProjectIds(
						[projectId],
						CONTROL_SCOPES.PERIPHERAL
					));

			const computedDefaults = controls?.[allocatedTarget]?.length
				? computePeripheralResetValues(
						allocatedTarget,
						controls?.[allocatedTarget] ?? []
					)
				: {};

			// Compute the initial control set that will be rendered in the UI
			// to filter out the configuration values that wont be accessible through the UI on the initial render of the form.
			const initialControlSet: string[] = [];
			const initialConfig: Record<string, string> = {};

			for (const control of controls?.[allocatedTarget] ?? []) {
				if (
					(typeof control.Condition === 'string' &&
						evaluateCondition(computedDefaults, control.Condition)) ||
					control.Condition === undefined
				) {
					initialControlSet.push(control.Id);
				}
			}

			for (const key of Object.keys(computedDefaults)) {
				if (initialControlSet.includes(key)) {
					initialConfig[key] = computedDefaults[key];
				}
			}

			const peripheralSignals = Object.keys(signals);

			// For cases where the a signal within the peripheral group was allocated to a pin
			// before allocating the peripheral to a project, the defaults are computed
			// and dispatched to the cfsconfig
			const signalsWithMissingDefaults = peripheralPins.filter(pin =>
				pin.appliedSignals.some(
					signal =>
						signal.Peripheral === allocatedTarget &&
						peripheralSignals.includes(signal.Name) &&
						(!signal.PinCfg ||
							Object.keys(signal.PinCfg).length === 0)
				)
			);

			let computedMissingDefaults: Array<{
				Pin: string;
				Peripheral: string;
				Name: string;
				PinCfg: Record<string, any>;
			}> = [];

			if (signalsWithMissingDefaults.length && !isExternallyManaged) {
				computedMissingDefaults = await Promise.all(
					signalsWithMissingDefaults.map(async pin => {
						const targetSignal =
							pin.appliedSignals.find(
								signal => signal.Peripheral === allocatedTarget
							)?.Name ?? '';

						const initialPinConfig = await computeInitialPinConfig({
							Pin: pin.Name,
							Peripheral: title,
							Signal: targetSignal,
							ProjectId: projectId
						});

						return {
							Pin: pin.Name,
							Peripheral: title,
							Name: targetSignal,
							PinCfg: initialPinConfig
						};
					})
				);

				if (computedMissingDefaults.length > 0) {
					dispatch(
						setMultiSignalConfig({
							signals: computedMissingDefaults
						})
					);
				}
			}

			if (peripheralSignals.length === 0) {
				dispatch(
					setPeripheralAssignment({
						peripheral: title,
						projectId,
						config: initialConfig
					})
				);
			} else if (peripheralSignals.length > 0) {
				dispatch(
					setSignalGroupAssignment({
						peripheral: title,
						projectId,
						config: initialConfig
					})
				);
			}

			handleCoreSelectionDone();
		},
		[
			allocatedTarget,
			dispatch,
			handleCoreSelectionDone,
			peripheralPins,
			signals,
			title
		]
	);

	const handleSignalAssignment = useCallback(
		async (args: {
			peripheral: string;
			signalName: string;
			projectId: string;
		}) => {
			// Check first if the signal is already allocated to a pin. If so, we need to
			// compute the initial pin config for the signal to make it available in the cfsconfig
			const allocatedPin = peripheralPins.find(
				pin =>
					pin.appliedSignals.length &&
					pin.appliedSignals.some(
						signal =>
							signal.Peripheral === args.peripheral &&
							signal.Name === args.signalName &&
							(!signal.PinCfg ||
								Object.keys(signal.PinCfg).length === 0)
					)
			);

			if (allocatedPin) {
				const payload = {
					Pin: allocatedPin.pinId,
					Peripheral: args.peripheral,
					Signal: args.signalName
				};

				const initialPinConfig = await computeInitialPinConfig({
					...payload,
					ProjectId: args.projectId
				});

				dispatch(
					updateSignalConfig({
						...payload,
						PinCfg: initialPinConfig
					})
				);
			}

			// Handles allocation to project and persistence of the computed default if available.
			dispatch(setSignalAssignment(args));
			handleCoreSelectionDone();
		},
		[dispatch, peripheralPins, handleCoreSelectionDone]
	);

	const handleTargetSelected = useCallback(
		(target: string) => {
			setAllocatedTarget(target);
			dispatch(setIsAllocatingCore(true));
		},
		[dispatch]
	);

	useEffect(() => {
		if (!isAllocatingProject) setAllocatedTarget(undefined);
	}, [isAllocatingProject]);

	return (
		<div
			data-test={`peripheral-block-${title}`}
			className={styles.accordionContainer}
		>
			<Accordion
				icon={
					categorizedAllocations.get(title) ? (
						<div
							data-test={`accordion:allocated:${title}`}
							id={`${title}-allocated`}
							className={accordianStyles.checkmarkIcon}
						>
							<CircledCheckmark />
						</div>
					) : null
				}
				isOpen={isOpen}
				title={title}
				body={
					<div>
						{(() => {
							/* @NOTE Two scenarios:
							 * - Scenario where there are no signals.
							 *	 We show only the signal group name and core selection.
							 * - Scenario where there are signals and signalGroup is defined.
							 *	 We show the signal group name and signals or core selection.
							 */
							if (signalGroup ?? Object.keys(signals).length === 0) {
								const allocatedCoreId =
									categorizedAllocations.get(title)?.projectId;

								return (
									<div
										className={
											allocatedTarget ? styles.focused : undefined
										}
									>
										<PeripheralSignalGroup
											name={title}
											isSelected={Boolean(allocatedTarget)}
											allocatedCoreId={allocatedCoreId}
											onClick={() => {
												if (!allocatedCoreId)
													handleTargetSelected(title);
											}}
										/>
										{allocatedTarget ? (
											<CoreSelector
												projects={projects ?? []}
												isPeripheralSecure={security === 'Secure'}
												onSelect={handleSignalGroupSelected}
												onCancel={handleCoreSelectionDone}
											/>
										) : (
											Object.entries(signals).map(([_, signal]) => (
												<PeripheralSignal
													key={`peripheral-signal-${signal.name}`}
													{...signal}
													isGrouped
												/>
											))
										)}
									</div>
								);
							}

							/* @NOTE scenario where there are signals and signalGroup is undefined.
							 *	We show signals and core selection.
							 */
							return Object.entries(signals).map(([_, signal]) => {
								const isSelected = allocatedTarget === signal.name;
								const allocatedCoreId = findCoreIdBySignalName(
									signal.name,
									categorizedAllocations
								);

								return (
									<div
										key={`peripheral-signal-${signal.name}`}
										className={
											isSelected ? styles.focused : undefined
										}
									>
										<PeripheralSignal
											{...signal}
											isSelected={isSelected}
											allocatedCoreId={allocatedCoreId}
											onClick={() => {
												if (!allocatedCoreId)
													handleTargetSelected(signal.name);
											}}
										/>
										{isSelected && (
											<CoreSelector
												projects={projects ?? []}
												isPeripheralSecure={security === 'Secure'}
												onSelect={async projectId => {
													await handleSignalAssignment({
														peripheral: title,
														signalName: signal.name,
														projectId
													});
												}}
												onCancel={handleCoreSelectionDone}
											/>
										)}
									</div>
								);
							});
						})()}
					</div>
				}
				toggleExpand={() => {
					setIsOpen(!isOpen);
				}}
			/>
		</div>
	);
}

export default memo(PeripheralBlock);
