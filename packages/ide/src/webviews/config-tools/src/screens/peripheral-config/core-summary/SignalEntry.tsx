/**
 *
 * Copyright (c) 2025 Analog Devices, Inc.
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

import {memo, useCallback, useEffect} from 'react';
import ConfigIcon16px from '@common/icons/Config16px';
import ConflictIcon from '@common/icons/Conflict';
import {useAppDispatch} from '../../../state/store';
import {
	removeSignalAssignment,
	setActiveSignal
} from '../../../state/slices/peripherals/peripherals.reducer';
import PinAssignmentInfo from './PinAssignmentInfo';
import useIsPinAssignmentMissing from '../../../hooks/useIsPinAssignmentMissing';
import {
	useActiveSignal,
	useCurrentSignalTarget
} from '../../../state/slices/peripherals/peripherals.selector';
import styles from './CoreSummaryEntry.module.scss';
import {getSocPeripheralDictionary} from '../../../utils/soc-peripherals';
import Tooltip from '../../../../../common/components/tooltip/Tooltip';
import {Button, DeleteIcon} from 'cfs-react-library';
import {
	useAssignedPin,
	usePinAppliedSignals
} from '../../../state/slices/pins/pins.selector';
import {getAppliedSignal} from '../../../utils/peripheral';
import {pinInConflict} from '../../../utils/pin-error';
import {removeAppliedSignal} from '../../../state/slices/pins/pins.reducer';

type SignalEntryProps = Readonly<{
	signal: string;
	peripheral: string;
	shouldHighlight?: boolean;
}>;

function SignalEntry({
	signal,
	peripheral,
	shouldHighlight
}: SignalEntryProps) {
	const dispatch = useAppDispatch();
	const [_, activeSignal] = useActiveSignal()?.split(' ') ?? [];
	const isActive = activeSignal === signal;
	const {assignable} = getSocPeripheralDictionary()[peripheral];

	const isPinAssignmentMissing = useIsPinAssignmentMissing(
		signal,
		peripheral
	);

	const assignedPin = useAssignedPin({signal, peripheral});

	const targetPinId =
		useCurrentSignalTarget(peripheral, signal) ?? '';

	const signalsForTargetPin = usePinAppliedSignals(targetPinId) ?? [];

	const appliedSignal = getAppliedSignal(
		signalsForTargetPin,
		peripheral,
		signal,
		targetPinId
	);

	const isPinConflict =
		pinInConflict(signalsForTargetPin) ||
		Object.keys(appliedSignal?.Errors ?? {}).length > 0;

	const handleConfigClick = useCallback(() => {
		dispatch(
			setActiveSignal({
				signal,
				peripheral
			})
		);
	}, [dispatch, signal, peripheral]);

	const handleDeleteClick = () => {
		const payload = {
			Pin: targetPinId,
			Peripheral: peripheral,
			Name: signal
		};

		dispatch(
			removeSignalAssignment({
				signalName: signal,
				peripheral
			})
		);
		dispatch(removeAppliedSignal(payload));
		dispatch(setActiveSignal(undefined));
	};

	useEffect(() => {
		if (shouldHighlight) {
			handleConfigClick();
		}
	}, [shouldHighlight, handleConfigClick, dispatch]);

	// Render if not a signalGroup, or if signalGroup and assignedPin is true
	if (Boolean(assignable) && !assignedPin) {
		return null;
	}

	return (
		<div
			className={`${styles.signalRowWrapper} ${isActive ? styles.highlight : ''}`}
		>
			<div
				key={signal}
				data-test={`signal-assignment:${signal}`}
				className={styles.signalRow}
			>
				<div className={styles.signalRowHeader}>
					<span data-test='signal-assignment:name'>{signal}</span>
					<PinAssignmentInfo
						signal={signal}
						peripheral={peripheral}
						showRequiredLabel={false}
					/>
				</div>

				<div className={styles.iconWrapper}>
					{isPinAssignmentMissing || isPinConflict ? (
						<div className={styles.conflictIconWrapper}>
							<ConflictIcon
								width='16'
								height='16'
								data-test='signal-assignment:conflict'
							/>
						</div>
					) : (
						<div className={styles.iconPlaceholder} />
					)}
					{assignable ? (
						<div className={styles.iconPlaceholder} />
					) : (
						<Tooltip title='Configure' type='long'>
							<Button
								className={`${styles.configIcon} ${isActive ? styles.isActive : ''}`}
								appearance='icon'
								onClick={handleConfigClick}
							>
								<ConfigIcon16px data-test='signal-assignment:config' />
							</Button>
						</Tooltip>
					)}
					{assignable ? (
						<div className={styles.iconPlaceholder} />
					) : (
						<Tooltip title='Remove' type='long'>
							<Button
								className={styles.deleteIcon}
								appearance='icon'
								onClick={handleDeleteClick}
							>
								<DeleteIcon
									data-test={`core:${peripheral}-${signal}:allocation:delete-icon`}
								/>
							</Button>
						</Tooltip>
					)}
				</div>
			</div>
		</div>
	);
}

export default memo(SignalEntry);
