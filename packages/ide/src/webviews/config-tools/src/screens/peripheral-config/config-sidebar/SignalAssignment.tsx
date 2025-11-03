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

import styles from './SignalAssignment.module.scss';
import useIsPinAssignmentMissing from '../../../hooks/useIsPinAssignmentMissing';
import {
	useAssignedPin,
	usePinAppliedSignals
} from '../../../state/slices/pins/pins.selector';
import {getConfigurablePeripherals} from '../../../utils/soc-peripherals';
import {
	type FormattedPeripheral,
	type FormattedPeripheralSignal
} from '../../../../../common/types/soc';
import {
	useCurrentSignalTarget,
	useGetAllocatedProjectId
} from '../../../state/slices/peripherals/peripherals.selector';
import {
	removeAppliedSignal,
	setAppliedSignal,
	updateAppliedSignal
} from '../../../state/slices/pins/pins.reducer';
import {useAppDispatch} from '../../../state/store';
import {computeInitialPinConfig} from '../../../utils/pin-reset-controls';
import {useActiveConfiguredSignal} from '../../../state/slices/app-context/appContext.selector';
import {
	setActiveConfiguredSignal,
	setPeripheralErrorCount
} from '../../../state/slices/app-context/appContext.reducer';
import {setCurrentTarget} from '../../../state/slices/peripherals/peripherals.reducer';
import {pinInConflict} from '../../../utils/pin-error';
import {useEffect} from 'react';
import {getAppliedSignal} from '../../../utils/peripheral';
import SignalAssignmentError from './signal-assignment-error';
import SignalContainer from './signal-container';

type SignalAssignmentProps = Readonly<{
	signal: string;
	peripheral: string;
}>;

function SignalAssignment({
	signal,
	peripheral
}: SignalAssignmentProps) {
	const isPinAssignmentMissing = useIsPinAssignmentMissing(
		signal,
		peripheral
	);
	const dispatch = useAppDispatch();

	const assignedPin = useAssignedPin({signal, peripheral});
	const isToggledOn = Boolean(assignedPin);
	const configurablePeripheralList: Array<
		FormattedPeripheral<FormattedPeripheralSignal>
	> = getConfigurablePeripherals();
	const filteredPeripheralList = configurablePeripheralList.filter(
		item => item.name === peripheral
	);

	const {signal: activeConfiguredSignal, pin: activeConfiguredPin} =
		useActiveConfiguredSignal();

	const signals = filteredPeripheralList?.[0]?.signals ?? [];
	const pins = signals[signal].pins ?? [];

	const targetPinId =
		useCurrentSignalTarget(peripheral, signal) ?? '';

	const allocatedProjectId = useGetAllocatedProjectId(
		peripheral,
		signal
	);

	const signalsForTargetPin = usePinAppliedSignals(targetPinId) ?? [];

	const appliedSignal = getAppliedSignal(
		signalsForTargetPin,
		peripheral,
		signal,
		targetPinId
	);

	const isPinConflict =
		isToggledOn &&
		(pinInConflict(signalsForTargetPin) ||
			Object.keys(appliedSignal?.Errors ?? {}).length);

	const errorCount =
		(isPinAssignmentMissing ? 1 : 0) + (isPinConflict ? 1 : 0);

	const handleToggle = async () => {
		if (!targetPinId) {
			return;
		}

		const payload = {
			Pin: targetPinId,
			Peripheral: peripheral,
			Name: signal
		};
		const projectToAllocate: string | undefined = allocatedProjectId;
		let initialPinConfig = {};

		if (isToggledOn) {
			dispatch(removeAppliedSignal({...payload, Pin: targetPinId}));

			if (
				activeConfiguredPin === targetPinId &&
				activeConfiguredSignal === signal
			) {
				dispatch(setActiveConfiguredSignal({})); // Removes pinconfig selection
			}
		} else if (projectToAllocate && targetPinId) {
			initialPinConfig = await computeInitialPinConfig({
				Pin: targetPinId,
				Peripheral: peripheral,
				Signal: signal,
				ProjectId: projectToAllocate ?? ''
			});
			dispatch(
				setAppliedSignal({...payload, PinCfg: initialPinConfig})
			);
		}
	};

	const handleDropdown = (value: string) => {
		const payload = {
			Pin: value,
			Peripheral: peripheral,
			Name: signal
		};

		dispatch(
			setCurrentTarget({
				peripheralGroup: peripheral,
				signalName: signal,
				dropdownVal: value
			})
		);

		if (isToggledOn && targetPinId) {
			if (
				activeConfiguredPin === targetPinId &&
				activeConfiguredSignal === signal
			) {
				dispatch(setActiveConfiguredSignal({})); // Removes pinconfig selection
			}

			dispatch(
				updateAppliedSignal({
					removeSignal: {...payload, Pin: targetPinId},
					addSignal: {...payload, PinCfg: appliedSignal?.PinCfg ?? {}}
				})
			);
		}
	};

	// Update errorCount when it changes
	useEffect(() => {
		dispatch(
			setPeripheralErrorCount({peripheral, signal, errorCount})
		);
	}, [peripheral, signal, errorCount, dispatch]);

	return (
		<div className={styles.signalAssignmentWrapper}>
			{pins.length !== 0 && (
				<SignalContainer
					signal={signal}
					peripheral={peripheral}
					pins={pins}
					handleDropdown={handleDropdown}
					targetPinId={targetPinId}
					isToggledOn={isToggledOn}
					handleToggle={handleToggle}
					isPinConflict={isPinConflict}
					isPinAssignmentMissing={isPinAssignmentMissing}
				/>
			)}
			<SignalAssignmentError
				signal={signal}
				peripheral={peripheral}
				isPinConflict={isPinConflict}
				isPinAssignmentMissing={isPinAssignmentMissing}
			/>
		</div>
	);
}

export default SignalAssignment;
