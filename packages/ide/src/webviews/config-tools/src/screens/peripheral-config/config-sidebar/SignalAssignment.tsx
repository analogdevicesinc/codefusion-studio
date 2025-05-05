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
import PinAssignmentInfo from '../core-summary/PinAssignmentInfo';
import ConflictIcon from '../../../../../common/icons/Conflict';
import useIsPinAssignmentMissing from '../../../hooks/useIsPinAssignmentMissing';

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

	return (
		<div
			data-test={`signal-assignment:${signal}`}
			className={styles.container}
		>
			<span
				data-test='signal-assignment:name'
				className={styles.signalName}
			>
				{signal}
			</span>
			<PinAssignmentInfo signal={signal} peripheral={peripheral} />
			{isPinAssignmentMissing ? (
				<ConflictIcon data-test='signal-assignment:conflict' />
			) : (
				<div className={styles.placeholder} />
			)}
		</div>
	);
}

export default SignalAssignment;
