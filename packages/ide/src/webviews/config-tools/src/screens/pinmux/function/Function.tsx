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
import {memo, type MouseEventHandler, useMemo, useState} from 'react';
import styles from './Function.module.scss';
import {
	VSCodeDropdown,
	VSCodeOption
} from '@vscode/webview-ui-toolkit/react';
import {
	assignCoprogrammedSignal,
	removeAppliedCoprogrammedSignals,
	removeAppliedSignal,
	setAppliedSignal,
	setIsPinFocused,
	updateAppliedSignal
} from '../../../state/slices/pins/pins.reducer';
import {useAppDispatch, useAppSelector} from '../../../state/store';
import Config from '@common/icons/Config';
import type {Pin} from '@common/types/soc';
import {
	useAssignedPins,
	usePinAppliedSignals
} from '../../../state/slices/pins/pins.selector';
import ConflictIcon from '@common/icons/Conflict';
import {
	useActivePeripheral,
	useActiveSignal,
	useCurrentSignalTarget,
	useGetAllocatedProjectId
} from '../../../state/slices/peripherals/peripherals.selector';
import {
	removePeripheralAssignment,
	setActivePeripheral,
	setActiveSignal,
	setCurrentTarget,
	setSignalGroupAssignment
} from '../../../state/slices/peripherals/peripherals.reducer';
import {setActiveConfiguredSignal} from '../../../state/slices/app-context/appContext.reducer';
import {useActiveConfiguredSignal} from '../../../state/slices/app-context/appContext.selector';
import CheckmarkIcon from '@common/icons/Checkmark';
import Toggle from '@common/components/toggle/Toggle';
import DownArrow from '../../../../../common/icons/DownArrow';
import {getSocPinDetails} from '../../../utils/soc-pins';
import {Button} from 'cfs-react-library';
import {computeInitialPinConfig} from '../../../utils/pin-reset-controls';
import {getConfigurablePeripherals} from '../../../utils/soc-peripherals';
import {getPrimaryProjectId} from '../../../utils/config';
import {pinInConflict} from '../../../utils/pin-error';
import PinCfgSignalLabel from './pincfg-signal-label/pincfg-signal-label';

type FunctionProps = {
	readonly peripheralGroup: string;
	readonly name: string;
	readonly signalDesc?: string;
	readonly pins: Pin[];
	readonly isLastIndex?: boolean;
};

function Function({
	peripheralGroup,
	name: signalName,
	signalDesc,
	pins,
	isLastIndex = false
}: FunctionProps) {
	const [isExpanded, setIsExpanded] = useState(false);
	const dispatch = useAppDispatch();
	const activePeripheralName = useActivePeripheral();
	const {signal: activeConfiguredSignal, pin: activeConfiguredPin} =
		useActiveConfiguredSignal();
	const openSignal = useActiveSignal();

	const allocatedProjectId = useGetAllocatedProjectId(
		peripheralGroup,
		signalName
	);

	const assignedPeripherals = useAppSelector(
		state => state.peripheralsReducer.assignments
	);
	const assignedPins = useAssignedPins();
	const peripheral = assignedPeripherals[peripheralGroup];

	const targetPinId =
		useCurrentSignalTarget(peripheralGroup, signalName) ??
		pins[0].Name;

	const signalsForTargetPin = usePinAppliedSignals(targetPinId) ?? [];

	const assignedPin = signalsForTargetPin.find(
		signal =>
			signal.Pin === (targetPinId ?? pins[0].Name) &&
			signal.Peripheral === peripheralGroup &&
			signal.Name === signalName
	);

	const isPeripheralConfigurable = useMemo(
		() =>
			getConfigurablePeripherals().some(
				peripheral => peripheral.name === peripheralGroup
			),
		[peripheralGroup]
	);

	const hasAssignedPin = (peripheral: string, signal: string) =>
		assignedPins.some(assignedPin =>
			assignedPin.appliedSignals.some(
				assignedSignal =>
					assignedSignal.Peripheral === peripheral &&
					assignedSignal.Name === signal
			)
		);

	const coprogrammedSignals = getSocPinDetails(
		targetPinId
	)?.Signals?.find(
		signal => signal.Name === signalName
	)?.coprogrammedSignals;

	const isToggledOn = Boolean(assignedPin);

	const shouldRenderConflict =
		isToggledOn &&
		(pinInConflict(signalsForTargetPin) ||
			Object.keys(assignedPin?.Errors ?? {}).length);

	const handlePanelOpen = () => {
		if (!activePeripheralName) {
			dispatch(setActivePeripheral(peripheralGroup));
		}

		dispatch(
			setActiveSignal({
				peripheral: peripheralGroup,
				signal: signalName,
				keepActivePeripheral: true
			})
		);
	};

	const handleToggle = async () => {
		const payload = {
			Pin: targetPinId,
			Peripheral: peripheralGroup,
			Name: signalName
		};

		if (isToggledOn) {
			// Remove the active assignment
			if (coprogrammedSignals?.length) {
				const payloads = [
					payload,
					...coprogrammedSignals.map(coprogrammedSignal => ({
						Pin: coprogrammedSignal.Pin,
						Peripheral: coprogrammedSignal.Peripheral,
						Name: coprogrammedSignal.Signal
					}))
				];

				dispatch(removeAppliedCoprogrammedSignals(payloads));

				payloads.forEach(signalPayload => {
					if (
						activeConfiguredPin === signalPayload.Pin &&
						activeConfiguredSignal === signalPayload.Name
					) {
						dispatch(setActiveConfiguredSignal({})); // Removes pinconfig selection
					}
				});
			} else {
				dispatch(removeAppliedSignal(payload));

				if (
					activeConfiguredPin === targetPinId &&
					activeConfiguredSignal === signalName
				) {
					dispatch(setActiveConfiguredSignal({})); // Removes pinconfig selection
				}
			}

			// Unassign peripheral if no other signals are assigned excluding this signal and coprogrammed signals
			const shouldUnassignPeripheral =
				!isPeripheralConfigurable &&
				!Object.values(peripheral?.signals ?? {}).some(
					signal =>
						hasAssignedPin(peripheralGroup, signal.name) &&
						signal.name !== signalName &&
						(!coprogrammedSignals?.length ||
							coprogrammedSignals.every(
								s => s.Signal !== signal.name
							))
				);

			if (shouldUnassignPeripheral) {
				dispatch(
					removePeripheralAssignment({
						peripheral: peripheralGroup
					})
				);
			}

			if (openSignal === `${peripheralGroup} ${signalName}`) {
				handlePanelOpen();
			}
		} else {
			const primaryProjectId = getPrimaryProjectId();
			let projectToAllocate: string | undefined = allocatedProjectId;

			if (!isPeripheralConfigurable && !allocatedProjectId) {
				projectToAllocate = primaryProjectId;
				dispatch(
					setSignalGroupAssignment({
						peripheral: peripheralGroup,
						projectId: projectToAllocate ?? '',
						config: {}
					})
				);
			}

			if (coprogrammedSignals?.length) {
				const signalCfg = await computeInitialPinConfig({
					Pin: payload.Pin,
					Peripheral: payload.Peripheral,
					Signal: payload.Name,
					ProjectId: projectToAllocate ?? ''
				});

				const payloads = [
					{...payload, PinCfg: signalCfg},
					...(await Promise.all(
						coprogrammedSignals.map(async coprogrammedSignal => ({
							Pin: coprogrammedSignal.Pin,
							Peripheral: coprogrammedSignal.Peripheral,
							Name: coprogrammedSignal.Signal,
							PinCfg: projectToAllocate
								? await computeInitialPinConfig({
										Pin: coprogrammedSignal.Pin,
										Peripheral: coprogrammedSignal.Peripheral,
										Signal: coprogrammedSignal.Signal,
										ProjectId: projectToAllocate ?? ''
									})
								: {}
						}))
					))
				];

				dispatch(assignCoprogrammedSignal(payloads));
			} else {
				let initialPinConfig = {};

				if (projectToAllocate) {
					initialPinConfig = await computeInitialPinConfig({
						Pin: targetPinId,
						Peripheral: peripheralGroup,
						Signal: signalName,
						ProjectId: projectToAllocate ?? ''
					});
				}

				dispatch(
					setAppliedSignal({...payload, PinCfg: initialPinConfig})
				);
			}
		}
	};

	const handleDropdown: MouseEventHandler<HTMLOptionElement> = e => {
		const {value} = e.currentTarget;

		const payload = {
			Pin: value,
			Peripheral: peripheralGroup,
			Name: signalName
		};

		dispatch(
			setCurrentTarget({
				peripheralGroup,
				signalName,
				dropdownVal: value
			})
		);

		if (isToggledOn) {
			dispatch(
				updateAppliedSignal({
					removeSignal: {...payload, Pin: targetPinId},
					addSignal: {
						...payload,
						PinCfg: assignedPin?.PinCfg ?? {}
					}
				})
			);

			if (
				activeConfiguredPin === targetPinId &&
				activeConfiguredSignal === signalName
			) {
				dispatch(setActiveConfiguredSignal({})); // Removes pinconfig selection
			}
		} else {
			dispatch(setIsPinFocused({id: targetPinId, isFocused: false}));
		}
	};

	function getPinLabel(pin: Pin): string {
		return (
			pin.Name +
			(pin.Signals?.find(
				s => s.Peripheral === peripheralGroup && s.Name === signalName
			)?.IsInputTap
				? '+'
				: '')
		);
	}

	return (
		<section
			key={signalName}
			className={styles.container}
			data-test={`${peripheralGroup}-${signalName}`}
		>
			{signalDesc ? (
				<PinCfgSignalLabel
					containerId={`function-container-${peripheralGroup}`}
					label={signalName}
					description={signalDesc || ''}
				/>
			) : (
				<div>{signalName}</div>
			)}
			<div className={styles.divider} />
			{pins.length === 1 ? (
				<div>{getPinLabel(pins[0])}</div>
			) : (
				<VSCodeDropdown
					position={isLastIndex ? 'above' : 'below'}
					value={targetPinId}
					className={styles.dropDownPin}
					onClick={() => {
						setIsExpanded(!isExpanded);
					}}
				>
					<div
						slot='indicator'
						className={`${styles.indicator}${isExpanded ? ` ${styles.expanded}` : ''}`}
					>
						<DownArrow />
					</div>
					{pins.map(pin => (
						<VSCodeOption
							key={pin.Name}
							selected={pin.Name === targetPinId}
							className={styles.dropdownPinOption}
							value={pin.Name}
							onClick={handleDropdown}
						>
							<div className={styles.dropdownPinLabel}>
								{getPinLabel(pin)}
								<div className={styles.checkmarkIcon}>
									{pin.Name === targetPinId && <CheckmarkIcon />}
								</div>
							</div>
						</VSCodeOption>
					))}
				</VSCodeDropdown>
			)}
			<Toggle
				isToggledOn={isToggledOn}
				handleToggle={handleToggle}
				dataTest={`${peripheralGroup}-${signalName}`}
			/>
			<div
				className={`${styles.configButtonContainer} ${openSignal === `${peripheralGroup} ${signalName}` ? styles.active : ''}`}
			>
				<Button
					appearance='icon'
					disabled={!isToggledOn}
					onClick={handlePanelOpen}
				>
					{isToggledOn && <Config width='12.5' height='10.8' />}
				</Button>
			</div>
			{/* Always display container to reserve space */}
			<div className={styles.iconConflictContainer}>
				{Boolean(shouldRenderConflict) && (
					<div id={`signal-${signalName}-conflict`}>
						<ConflictIcon />
					</div>
				)}
			</div>
		</section>
	);
}

export default memo(Function);
