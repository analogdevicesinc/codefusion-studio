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
import {getPreallocatedPeripherals} from '../../../utils/soc-peripherals';
import {
	useActivePeripheral,
	usePeripheralAllocations,
	usePeripheralDescription
} from '../../../state/slices/peripherals/peripherals.selector';
import {useDispatch} from 'react-redux';
import debounce from 'lodash/debounce';
import {setPeripheralDescription} from '../../../state/slices/peripherals/peripherals.reducer';
import {useMemo} from 'react';
import AllocatedCore from '../allocated-core/AllocatedCore';
import styles from './DetailsSection.module.scss';

function DetailsSection() {
	const dispatch = useDispatch();
	const activePeripheral = useActivePeripheral();
	const preAssignments = getPreallocatedPeripherals();
	const assignments = usePeripheralAllocations();
	const description = usePeripheralDescription(
		activePeripheral ?? ''
	);

	// Check to what cores the current peripheral is allocated to
	const getActivePeripheralAllocations = () => {
		const allocations = new Set<string>();

		Object.keys(assignments).forEach(projectId => {
			const coreAllocations = Object.values(
				assignments[projectId] ?? {}
			);

			const isAllocated = coreAllocations.some(
				peripheral => peripheral.name === activePeripheral
			);

			if (isAllocated) {
				allocations.add(projectId);
			}
		});

		return Array.from(allocations);
	};

	const activePeripheralAllocations =
		getActivePeripheralAllocations();

	const handleDescriptionChange = useMemo(
		() =>
			debounce((value: string) => {
				if (!activePeripheral) return;

				dispatch(
					setPeripheralDescription({
						peripheralId: activePeripheral,
						description: value
					})
				);
			}, 1000),
		[dispatch, activePeripheral]
	);

	return (
		<div className={styles.detailsSection}>
			{(() => {
				// If there is only one assignment, show the core and alias inputs
				if (activePeripheralAllocations.length === 1) {
					const projectId = activePeripheralAllocations[0];

					const isPreAssigned = preAssignments[projectId]?.some(
						({name}) => name === activePeripheral
					);

					return (
						<>
							<div className={styles.detailsSectionGroup}>
								<label data-test='details-section:core-assignment:label'>
									Allocated to
								</label>
								<AllocatedCore
									key={projectId}
									projectId={projectId}
									isDeletable={!isPreAssigned}
								/>
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
						</>
					);
				}

				// If the peripheral is assigned in multiple cores, show an informative label.
				if (activePeripheralAllocations.length > 1) {
					return (
						<label data-test='details-section:core-assignment:multiple-assignments'>
							Allocated to multiple cores.
						</label>
					);
				}

				return null;
			})()}
		</div>
	);
}

export default DetailsSection;
