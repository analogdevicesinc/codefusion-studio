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

import {TextField} from 'cfs-react-library';
import {
	useActiveSignal,
	usePeripheralAllocations,
	useSignalDescription
} from '../../../state/slices/peripherals/peripherals.selector';
import {useDispatch} from 'react-redux';
import debounce from 'lodash/debounce';
import {setSignalDescription} from '../../../state/slices/peripherals/peripherals.reducer';
import {useMemo} from 'react';
import AllocatedCore from '../allocated-core/AllocatedCore';
import styles from './DetailsSection.module.scss';

function SignalDetailsSection() {
	const dispatch = useDispatch();
	const [targetPeripheral, targetSignal] = (
		useActiveSignal() ?? ''
	).split(' ');
	const assignments = usePeripheralAllocations();
	const description = useSignalDescription(
		targetPeripheral,
		targetSignal
	);

	// Identify to what project the active signal is allocated.
	const getActiveSignalAsignment = () => {
		if (!targetSignal) return undefined;

		for (const [project, peripherals] of Object.entries(
			assignments
		)) {
			if (targetPeripheral in peripherals) {
				const isSignalAssigned =
					peripherals[targetPeripheral].signals[targetSignal];

				if (isSignalAssigned) {
					return project;
				}
			}
		}
	};

	const projectId = getActiveSignalAsignment();

	const handleDescriptionChange = useMemo(
		() =>
			debounce((value: string) => {
				if (!targetPeripheral || !targetSignal) return;

				dispatch(
					setSignalDescription({
						peripheral: targetPeripheral,
						signalName: targetSignal,
						description: value
					})
				);
			}, 1000),
		[dispatch, targetPeripheral, targetSignal]
	);

	if (!projectId) return null;

	return (
		<div className={styles.detailsSection}>
			<div className={styles.detailsSectionGroup}>
				<label data-test='details-section:core-assignment:label'>
					Allocated to
				</label>
				<AllocatedCore key={projectId} projectId={projectId} />
			</div>
			<div className={styles.detailsSectionGroup}>
				<TextField
					optional
					dataTest='details-section:alias'
					label='Description'
					placeholder='Start typing...'
					inputVal={description}
					onInputChange={handleDescriptionChange}
				/>
			</div>
		</div>
	);
}

export default SignalDetailsSection;
