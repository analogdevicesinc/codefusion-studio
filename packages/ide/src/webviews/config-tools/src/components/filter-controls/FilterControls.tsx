/**
 *
 * Copyright (c) 2024 Analog Devices, Inc.
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
import {
	usePackagePins,
	usePinDetailsTargetPin
} from '../../state/slices/pins/pins.selector';
import {computePinState} from '../../screens/pinmux/utils/filters';

import styles from './filterControls.module.scss';
import {useEffect, useMemo} from 'react';
import {useDispatch} from 'react-redux';

import {
	useActivePeripheral,
	useCurrentSignalsTargets
} from '../../state/slices/peripherals/peripherals.selector';
import {
	type Filter,
	setActiveFilter
} from '../../state/slices/app-context/appContext.reducer';
import {
	useActiveFilterType,
	useSearchString
} from '../../state/slices/app-context/appContext.selector';
import {Chip} from 'cfs-react-library';
import {setActivePeripheral} from '../../state/slices/peripherals/peripherals.reducer';

const emptyCounter = 0;

function FilterControls() {
	const pinsState = usePackagePins();
	const pinDetailsTargetId = usePinDetailsTargetPin();
	const activeFilterType = useActiveFilterType();
	const searchString = useSearchString('pinconfig');

	const dispatch = useDispatch();

	const activePeripheral = useActivePeripheral();
	const peripherals = useCurrentSignalsTargets();

	const targetPinSet = useMemo(() => {
		if (pinDetailsTargetId) {
			return [pinsState[pinDetailsTargetId]];
		}

		if (activePeripheral) {
			return Object.values(
				peripherals[activePeripheral].signalsTargets
			).map(signal => pinsState[signal!]);
		}

		return Object.values(pinsState);
	}, [activePeripheral, peripherals, pinDetailsTargetId, pinsState]);

	const categorizedPins = computePinState(targetPinSet);

	const {assigned, available, conflict} = categorizedPins;

	const handleFilterState = (selectedFilterType: Filter) => {
		if (activeFilterType === selectedFilterType) {
			dispatch(setActiveFilter(undefined));
		} else {
			dispatch(setActiveFilter(selectedFilterType));
		}

		if (selectedFilterType === undefined) return;

		// @TODO: Probably this does not belong here.
		if (categorizedPins[selectedFilterType].length === 0) {
			if (activePeripheral) {
				dispatch(setActivePeripheral(''));
			} else {
				dispatch(setActiveFilter(undefined));
			}
		}
	};

	useEffect(() => {
		if (
			activeFilterType &&
			categorizedPins[activeFilterType].length === 0
		)
			dispatch(setActiveFilter(undefined));
	}, [activeFilterType, categorizedPins, dispatch]);

	return (
		<div className={styles.filterControlsContainer}>
			<Chip
				key='filterControl-assigned'
				isActive={activeFilterType === 'assigned'}
				id='filterControl-assigned'
				label='Assigned'
				dataTest='filter-control:assigned'
				isDisabled={
					Boolean(pinDetailsTargetId) ||
					(searchString ? emptyCounter : assigned.length)
				}
				dataValue={searchString ? emptyCounter : assigned.length}
				onClick={() => {
					handleFilterState('assigned');
				}}
			/>
			<Chip
				key='filterControl-available'
				isActive={activeFilterType === 'available'}
				id='filterControl-available'
				label='Available'
				dataTest='filter-control:available'
				isDisabled={
					Boolean(pinDetailsTargetId) ||
					(searchString ? emptyCounter : available.length)
				}
				dataValue={searchString ? emptyCounter : available.length}
				onClick={() => {
					handleFilterState('available');
				}}
			/>
			<Chip
				key='filterControl-conflicts'
				isActive={activeFilterType === 'conflict'}
				id='filterControl-conflicts'
				label='Conflicts'
				dataTest='filter-control:conflicts'
				isDisabled={
					Boolean(pinDetailsTargetId) ||
					(searchString ? emptyCounter : conflict.length)
				}
				dataValue={searchString ? emptyCounter : conflict.length}
				onClick={() => {
					handleFilterState('conflict');
				}}
			/>
		</div>
	);
}

export default FilterControls;
