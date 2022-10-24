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
	useFocusedPins,
	usePackagePins,
	usePinDetailsTargetPin
} from '../../state/slices/pins/pins.selector';
import {computePinState} from '../../screens/pinmux/utils/filters';

import styles from './filterControls.module.scss';
import {useEffect, useMemo} from 'react';
import {useDispatch} from 'react-redux';
import {focusPinSet} from '../../state/slices/pins/pins.reducer';
import {
	useActivePeripheral,
	usePeripherals
} from '../../state/slices/peripherals/peripherals.selector';
import {setActiveFilter} from '../../state/slices/app-context/appContext.reducer';
import {
	useFilter,
	useSearchString
} from '../../state/slices/app-context/appContext.selector';
import type {Pin} from '@common/types/soc';
import {setActivePeripheral} from '../../state/slices/peripherals/peripherals.reducer';
import {VSCodeBadge} from '@vscode/webview-ui-toolkit/react';
import {Chip} from '@common/components/chip/Chip';

type Filter = 'assigned' | 'available' | 'conflict' | undefined;

function getPinsCount(string: string, type: Pin[]) {
	const count = string ? 0 : type.length;

	return Boolean(count) && <VSCodeBadge>{count}</VSCodeBadge>;
}

function FilterControls() {
	const packagePins = usePackagePins();
	const focusedPins = useFocusedPins();
	const pinDetailsTargetId = usePinDetailsTargetPin();
	const filterState = useFilter();
	const searchString = useSearchString('pinconfig');

	const dispatch = useDispatch();

	const activePeripheral = useActivePeripheral();
	const peripherals = usePeripherals();

	const beforeFilterPins = useMemo(() => {
		if (pinDetailsTargetId) {
			return [packagePins[pinDetailsTargetId]];
		}

		if (activePeripheral) {
			return Object.values(
				peripherals[activePeripheral].signals.dict
			).map(signal => packagePins[signal.currentTarget!]);
		}

		return Object.values(packagePins);
	}, [
		activePeripheral,
		packagePins,
		peripherals,
		pinDetailsTargetId
	]);

	const {assigned, available, conflicts} =
		computePinState(beforeFilterPins);

	const handleFilterState = (filter: Filter) => {
		if (filterState === filter) {
			dispatch(setActiveFilter(undefined));
		} else {
			dispatch(setActiveFilter(filter));
		}
	};

	// @TODO: This should not be handled as a side effect. This logic should be moved to the click handler.
	useEffect(() => {
		let pins: Pin[];

		switch (filterState) {
			case 'assigned':
				pins = assigned;
				break;
			case 'available':
				pins = available;
				break;
			case 'conflict':
				pins = conflicts;
				break;
			default:
				return;
		}

		const areTargetPinsFocused = pins.every(pin =>
			focusedPins.includes(pin.Name)
		);

		if (!areTargetPinsFocused) {
			dispatch(focusPinSet(pins.map(pin => pin.Name)));
		}

		if (
			(filterState === 'assigned' && pins.length === 0) ||
			(filterState === 'available' && pins.length === 0) ||
			(filterState === 'conflict' && pins.length === 0)
		) {
			if (activePeripheral) {
				dispatch(setActivePeripheral(''));
			} else {
				dispatch(setActiveFilter(undefined));
			}
		}
	}, [
		assigned,
		available,
		conflicts,
		filterState,
		beforeFilterPins,
		focusedPins,
		dispatch,
		activePeripheral
	]);

	return (
		<div className={styles.filterControlsContainer}>
			<Chip
				isActive={filterState === 'assigned'}
				id='filterControl-assigned'
				label='Assigned'
				dataTest='Assigned'
				isDisabled={searchString ? 0 : assigned.length}
				dataValue={searchString ? 0 : assigned.length}
				onClick={() => {
					handleFilterState('assigned');
				}}
			>
				{getPinsCount(searchString, assigned)}
			</Chip>
			<Chip
				isActive={filterState === 'available'}
				id='filterControl-available'
				label='Available'
				dataTest='Available'
				isDisabled={searchString ? 0 : available.length}
				dataValue={searchString ? 0 : available.length}
				onClick={() => {
					handleFilterState('available');
				}}
			>
				{getPinsCount(searchString, available)}
			</Chip>
			<Chip
				isActive={filterState === 'conflict'}
				id='filterControl-conflicts'
				label='Conflicts'
				dataTest='Conflicts'
				isDisabled={searchString ? 0 : conflicts.length}
				dataValue={searchString ? 0 : conflicts.length}
				onClick={() => {
					handleFilterState('conflict');
				}}
			>
				{getPinsCount(searchString, conflicts)}
			</Chip>
		</div>
	);
}

export default FilterControls;
