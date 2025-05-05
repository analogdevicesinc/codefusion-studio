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

import {memo} from 'react';
import ConfigIcon16px from '@common/icons/Config16px';
import ConflictIcon from '@common/icons/Conflict';
import {useAppDispatch} from '../../../state/store';
import {setActiveSignal} from '../../../state/slices/peripherals/peripherals.reducer';
import PinAssignmentInfo from './PinAssignmentInfo';
import useIsPinAssignmentMissing from '../../../hooks/useIsPinAssignmentMissing';
import {useActiveSignal} from '../../../state/slices/peripherals/peripherals.selector';
import styles from './CoreSummaryEntry.module.scss';
import {getSocPeripheralDictionary} from '../../../utils/soc-peripherals';

type SignalEntryProps = Readonly<{
	signal: string;
	peripheral: string;
}>;

function SignalEntry({signal, peripheral}: SignalEntryProps) {
	const dispatch = useAppDispatch();
	const [_, activeSignal] = useActiveSignal()?.split(' ') ?? [];
	const isActive = activeSignal === signal;
	const {signalGroup} = getSocPeripheralDictionary()[peripheral];

	const isPinAssignmentMissing = useIsPinAssignmentMissing(
		signal,
		peripheral
	);

	const handleConfigClick = () => {
		dispatch(
			setActiveSignal({
				signal,
				peripheral
			})
		);
	};

	return (
		<div
			key={signal}
			data-test={`signal-assignment:${signal}`}
			className={styles.signalRow}
		>
			<span data-test='signal-assignment:name'>{signal}</span>
			<div className={styles.iconWrapper}>
				<PinAssignmentInfo signal={signal} peripheral={peripheral} />
				{isPinAssignmentMissing ? (
					<ConflictIcon data-test='signal-assignment:conflict' />
				) : (
					<div className={styles.iconPlaceholder} />
				)}
				{signalGroup ? (
					<div className={styles.iconPlaceholder} />
				) : (
					<ConfigIcon16px
						data-test='signal-assignment:config'
						data-active={isActive}
						className={styles.configIcon}
						onClick={handleConfigClick}
					/>
				)}
				<span className={styles.iconPlaceholder} />
			</div>
		</div>
	);
}

export default memo(SignalEntry);
