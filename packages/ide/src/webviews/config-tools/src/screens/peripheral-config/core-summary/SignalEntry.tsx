/**
 *
 * Copyright (c) 2025-2026 Analog Devices, Inc.
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

import {memo, useCallback} from 'react';
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
}>;

function SignalEntry({signal, peripheral}: SignalEntryProps) {
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

	const handleDeleteClick = useCallback(() => {
		const payload = {
			Pin: targetPinId,
			Peripheral: peripheral,
			Name: signal
		};

		dispatch(
			// Two Redux actions are dispatched synchronously — removeSignalAssignment and removeAppliedSignal.
			// Each triggers its own async persistence call to the extension, which does a full document replacement.
			// These two writes race: each reads the document, modifies only its subset, then writes the entire document back.
			// So we discard the persistence of this action so that the stale data does not get written back.
			removeSignalAssignment({
				signalName: signal,
				peripheral,
				discardPersistence: true
			})
		);
		dispatch(removeAppliedSignal(payload));
		dispatch(setActiveSignal(undefined));
	}, [dispatch, peripheral, signal, targetPinId]);

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
					{/* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing */}
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
								dataTest='signal-assignment:config-btn'
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
								dataTest='signal-assignment:delete-btn'
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
