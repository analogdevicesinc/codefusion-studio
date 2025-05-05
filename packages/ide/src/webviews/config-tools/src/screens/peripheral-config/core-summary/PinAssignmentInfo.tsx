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
import {useAssignedPin} from '../../../state/slices/pins/pins.selector';
import useIsPinAssignmentRequired from '../../../hooks/useIsPinAssignmentRequired';
import styles from './PinAssignmentInfo.module.scss';
import {getSocPinDetails} from '../../../utils/soc-pins';

type PinAssignmentInfoProps = Readonly<{
	signal: string;
	peripheral: string;
}>;

function PinAssignmentInfo({
	signal,
	peripheral
}: PinAssignmentInfoProps) {
	const assignedPin = useAssignedPin({signal, peripheral});
	const isRequired = useIsPinAssignmentRequired(signal, peripheral);
	const {Label, Name} = getSocPinDetails(assignedPin?.pinId ?? '');

	return (
		<p
			data-test='pin-assignment-info'
			className={styles.assignmentLabel}
		>
			{assignedPin ? `${Label} (${Name})` : <span>--</span>}
			{isRequired ? <span>(required)</span> : null}
		</p>
	);
}

export default memo(PinAssignmentInfo);
