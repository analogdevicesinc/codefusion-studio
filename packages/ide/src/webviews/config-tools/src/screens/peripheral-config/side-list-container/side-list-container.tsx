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
import {useState, useMemo, useCallback} from 'react';
import PeripheralGroupsFilterControls, {
	type FilterOption
} from '../../../components/filter-controls/filter-controls';
import PeripheralNavigation from '../peripheral-navigation/PeripheralNavigation';
import {
	getConfigurablePeripherals,
	filterAvailablePeripherals,
	filterAllocatedPeripherals
} from '../../../utils/soc-peripherals';
import type {
	FormattedPeripheral,
	FormattedPeripheralSignal
} from '../../../../../common/types/soc';
import styles from './side-list-container.module.scss';
import {useProjectSelectionConfig} from '../../../state/slices/app-context/appContext.selector';
import {usePeripheralAllocations} from '../../../state/slices/peripherals/peripherals.selector';
import {useAppDispatch} from '../../../state/store';
import {setProjectSelectionConfig} from '../../../state/slices/app-context/appContext.reducer';
import CoreSelector from '../core-selector/CoreSelector';
import {getProjectInfoList} from '../../../utils/config';
import {useSignalGroupAssignmentHandler} from '../../../hooks/use-signal-group-assignment-handler';
import {useSignalAssignmentHandler} from '../../../hooks/use-signal-assignment-handler';
import {PERIPHERAL_LIST_CONTAINER_ID} from '../constants';

const defaultFilterOptions: Record<string, FilterOption> =
	Object.freeze({
		all: {isSelected: true},
		allocated: {},
		available: {}
	});

export default function SideListContainer() {
	const dispatch = useAppDispatch();
	const projects = getProjectInfoList();

	const isProjectSelectionViewActive = Boolean(
		useProjectSelectionConfig()
	);
	const {peripheral = '', signal = ''} =
		useProjectSelectionConfig() ?? {};

	const handleSignalAssignment = useSignalAssignmentHandler(
		peripheral,
		signal
	);

	const handleSignalGroupAssignment =
		useSignalGroupAssignmentHandler(peripheral);

	const configurablePeripheralList: Array<
		FormattedPeripheral<FormattedPeripheralSignal>
	> = getConfigurablePeripherals();

	const peripheralAllocations = usePeripheralAllocations();

	const availablePeripheralList = useMemo(
		() =>
			filterAvailablePeripherals(
				configurablePeripheralList,
				peripheralAllocations
			),
		[configurablePeripheralList, peripheralAllocations]
	);

	// @NOTE we can't just substract configurablePeripheralList and availablePeripheralList
	// as some pheripherals have signals that can be individually assigned - peripheral
	// will be present in both available and allocated list.
	const allocatedPerihperalList = useMemo(
		() =>
			filterAllocatedPeripherals(
				configurablePeripheralList,
				peripheralAllocations
			),
		[configurablePeripheralList, peripheralAllocations]
	);

	const [filterOptions, setFilterOptions] = useState<
		Record<string, FilterOption>
	>(defaultFilterOptions);

	const filteredPeripherals = useMemo(() => {
		if (filterOptions.available.isSelected) {
			return availablePeripheralList;
		}

		if (filterOptions.allocated.isSelected) {
			return allocatedPerihperalList;
		}

		return configurablePeripheralList;
	}, [
		filterOptions,
		configurablePeripheralList,
		availablePeripheralList,
		allocatedPerihperalList
	]);

	const onFilterSelectionChange = (filter: string) => {
		if (filterOptions[filter]?.isSelected) {
			// If the same filter is clicked again, reset to default
			setFilterOptions(defaultFilterOptions);

			return;
		}

		const updatedFilters: Record<string, FilterOption> =
			Object.fromEntries(
				Object.entries(filterOptions).map(([key, option]) => [
					key,
					{
						...option,
						isSelected: key === filter
					}
				])
			);
		setFilterOptions(updatedFilters);
	};

	const handleCoreSelectionDone = useCallback(() => {
		dispatch(setProjectSelectionConfig(undefined));
	}, [dispatch]);

	const onSelectHandler = useCallback(
		async (projectId: string) => {
			if (signal) {
				await handleSignalAssignment(projectId);
			} else {
				await handleSignalGroupAssignment(projectId);
			}

			handleCoreSelectionDone();
		},
		[
			signal,
			handleSignalAssignment,
			handleSignalGroupAssignment,
			handleCoreSelectionDone
		]
	);

	return (
		<div className={styles.peripheralSidebarContainer}>
			<div className={styles.sidebarWrapper}>
				{isProjectSelectionViewActive ? (
					<CoreSelector
						title={peripheral}
						projects={projects ?? []}
						signalName={signal}
						onSelect={onSelectHandler}
						onCancel={handleCoreSelectionDone}
					/>
				) : (
					<>
						<PeripheralGroupsFilterControls
							options={filterOptions}
							onSelect={onFilterSelectionChange}
						/>
						<div className={styles.horizontalDivider} />
						<div
							id={PERIPHERAL_LIST_CONTAINER_ID}
							className={styles.listWrapper}
							data-test='Peripheral-List'
						>
							<PeripheralNavigation
								peripherals={filteredPeripherals}
							/>
						</div>
					</>
				)}
			</div>
		</div>
	);
}
