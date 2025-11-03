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
} from '../peripheral-groups-filter-controls/FilterControls';
import PeripheralNavigation from '../peripheral-navigation/PeripheralNavigation';
import {
	getConfigurablePeripherals,
	filterAvailablePeripherals,
	filterAllocatedPeripherals,
	computePeripheralResetValues
} from '../../../utils/soc-peripherals';
import type {
	FormattedPeripheral,
	FormattedPeripheralSignal
} from '../../../../../common/types/soc';
import styles from './side-list-container.module.scss';
import {useIsProjectSelectionView} from '../../../state/slices/app-context/appContext.selector';
import {
	useAllocatedTarget,
	useIsPeripheralSecure,
	usePeripheralAllocations,
	usePeripheralProjects,
	usePeripheralTitle,
	useSignalName,
	useSignals
} from '../../../state/slices/peripherals/peripherals.selector';
import {useAppDispatch} from '../../../state/store';
import {
	setIsAllocatingCore,
	setProjectSelectionView
} from '../../../state/slices/app-context/appContext.reducer';
import CoreSelector from '../core-selector/CoreSelector';
import {computeInitialPinConfig} from '../../../utils/pin-reset-controls';
import {
	setMultiSignalConfig,
	updateSignalConfig
} from '../../../state/slices/pins/pins.reducer';
import {
	setPeripheralAssignment,
	setSignalAssignment,
	setSignalGroupAssignment
} from '../../../state/slices/peripherals/peripherals.reducer';
import {
	getIsExternallyManagedProyect,
	getProjectInfoList
} from '../../../utils/config';
import {getControlsForProjectIds} from '../../../utils/api';
import {CONTROL_SCOPES} from '../../../constants/scopes';
import {evaluateCondition} from '../../../utils/rpn-expression-resolver';
import {usePinsByPeripheral} from '../../../state/slices/pins/pins.selector';
import {
	handleSignalAssignment,
	handleSignalGroupSelected
} from './side-list-container.handlers';
import {PeripheralSecurity} from '../../../types/peripherals';

const defaultFilterOptions: Record<string, FilterOption> =
	Object.freeze({
		all: {isSelected: true},
		allocated: {},
		available: {}
	});

export default function SideListContainer() {
	const dispatch = useAppDispatch();

	const projectConfig = getProjectInfoList();

	const coreSelectionView = useIsProjectSelectionView();

	const allocatedTarget = useAllocatedTarget();

	const title = usePeripheralTitle();

	const peripheralPins = usePinsByPeripheral(title);

	const signals = useSignals();

	const cores = usePeripheralProjects();

	const signalName = useSignalName();

	const security = useIsPeripheralSecure();
	const projects = projectConfig?.filter(project =>
		cores?.includes(project.CoreId)
	);

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
		dispatch(setIsAllocatingCore(false));
		dispatch(setProjectSelectionView(false));
	}, [dispatch]);

	const onSignalGroupSelected = useCallback(
		(projectId: string) => {
			if (!allocatedTarget) {
				console.warn('allocatedTarget is undefined');

				return;
			}

			void handleSignalGroupSelected({
				projectId,
				allocatedTarget,
				dispatch,
				getIsExternallyManagedProyect,
				getControlsForProjectIds,
				CONTROL_SCOPES,
				computePeripheralResetValues,
				evaluateCondition,
				computeInitialPinConfig,
				setMultiSignalConfig,
				setPeripheralAssignment,
				setSignalGroupAssignment,
				handleCoreSelectionDone,
				peripheralPins,
				signals,
				title
			});
		},
		[
			allocatedTarget,
			dispatch,
			handleCoreSelectionDone,
			peripheralPins,
			signals,
			title
		]
	);

	const onSignalAssignment = useCallback(
		async (args: {
			peripheral: string;
			signalName: string;
			projectId: string;
		}) => {
			await handleSignalAssignment({
				args,
				peripheralPins,
				computeInitialPinConfig,
				dispatch,
				updateSignalConfig,
				setSignalAssignment,
				handleCoreSelectionDone
			});
		},
		[peripheralPins, dispatch, handleCoreSelectionDone]
	);

	const onSelectHandler = signalName
		? (projectId: string) => {
				void onSignalAssignment({
					peripheral: title,
					signalName,
					projectId
				});
			}
		: onSignalGroupSelected;

	return (
		<div className={styles.peripheralSidebarContainer}>
			<div className={styles.sidebarWrapper}>
				{coreSelectionView ? (
					<CoreSelector
						title={title}
						projects={projects ?? []}
						projectConfig={projectConfig}
						signalName={signalName}
						peripheralSecurity={security as PeripheralSecurity}
						onSelect={onSelectHandler}
						onCancel={handleCoreSelectionDone}
					/>
				) : (
					<>
						<PeripheralGroupsFilterControls
							options={filterOptions}
							onSelect={onFilterSelectionChange}
						/>
						<div
							id='peripheral-list-container'
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
