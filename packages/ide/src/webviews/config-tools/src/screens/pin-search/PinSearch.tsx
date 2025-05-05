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
import {memo, useEffect, useMemo} from 'react';
import type {Pin} from '@common/types/soc';
import {setActiveSearchString} from '../../state/slices/app-context/appContext.reducer';
import {useSearchString} from '../../state/slices/app-context/appContext.selector';
import {useAssignedPins} from '../../state/slices/pins/pins.selector';
import {useAppDispatch} from '../../state/store';
import SideDetailsView from '../pinmux/side-details-view/SideDetailsView';
import {focusPinSet} from '../../state/slices/pins/pins.reducer';
import {getConfigurablePins} from '../../utils/soc-pins';

function PinSearch() {
	const dispatch = useAppDispatch();
	const searchString = useSearchString('pinconfig');
	const configurablePins = useMemo(() => getConfigurablePins(), []);

	const assignedPins = useAssignedPins().map(
		assignedPin => assignedPin.Name
	);

	const shouldSearchExactMatch = (): boolean => {
		if (
			(searchString.startsWith('"') && searchString.endsWith('"')) ||
			(searchString.startsWith("'") && searchString.endsWith("'")) ||
			searchString.endsWith(' ')
		) {
			return true;
		}

		return false;
	};

	const cleanseSearchString = (): string =>
		searchString.replace(/['"]+/g, '').trimEnd();

	const searchedForPins = shouldSearchExactMatch()
		? configurablePins.filter(
				pin =>
					pin.Label.toLocaleLowerCase() ===
					cleanseSearchString().toLowerCase()
			)
		: configurablePins.filter(pin =>
				pin.Label.toLowerCase().startsWith(searchString.toLowerCase())
			);

	const searchedForSignals = configurablePins
		.filter(pin =>
			pin.Signals?.find(signal =>
				signal.Name.toLowerCase().startsWith(
					searchString.toLowerCase()
				)
			)
		)
		.map(pin => {
			const pinDetailsCopy = {
				...pin
			};

			// Filter out the signals that don't start with searchString
			pinDetailsCopy.Signals = pinDetailsCopy.Signals?.filter(
				signal =>
					searchString &&
					signal.Name?.toLowerCase().startsWith(
						searchString.toLowerCase()
					)
			);

			return pinDetailsCopy;
		});

	const searchedForPeripherals = configurablePins
		.filter(pin =>
			pin.Signals?.find(signal =>
				signal.Peripheral?.toLowerCase().startsWith(
					searchString.toLowerCase()
				)
			)
		)
		.map(pin => {
			const pinDetailsCopy = {
				...pin
			};

			// Filter out the signals that don't start with searchString
			pinDetailsCopy.Signals = pinDetailsCopy.Signals?.filter(
				signal =>
					searchString &&
					signal.Peripheral?.toLowerCase().startsWith(
						searchString.toLowerCase()
					)
			);

			return pinDetailsCopy;
		});

	let searchedForTarget: Pin[] = useMemo(() => [], []);

	if (searchedForPins.length) {
		searchedForTarget = searchedForPins;
	} else if (searchedForSignals.length) {
		searchedForTarget = searchedForSignals;
	} else if (searchedForPeripherals.length) {
		searchedForTarget = searchedForPeripherals;
	}

	const searchResults = Object.values(
		searchedForTarget.reduce((acc: Record<string, Pin[]>, pin) => {
			if (pin.Signals && pin.Signals.length === 1) {
				pin?.Signals?.forEach(signal => {
					const key = `${signal.Name}-${signal.Peripheral}`;

					if (!acc[key]) {
						acc[key] = [];
					}

					acc[key].push(pin);
				});
			} else if (pin.Signals && pin.Signals.length > 1) {
				const key = pin.Name;

				if (!acc[key]) {
					acc[key] = [];
				}

				acc[key].push(pin);
			}

			return acc;
		}, {})
	);

	const handleBackClick = () => {
		dispatch(
			setActiveSearchString({searchContext: 'pinconfig', value: ''})
		);
	};

	useEffect(() => {
		if (searchString.length > 1) {
			const searchResultsPins = searchResults.flatMap(
				resultsArray => {
					if (resultsArray.length > 1) {
						const filteredArray = resultsArray.filter(pin =>
							assignedPins.includes(pin.Name)
						);

						if (filteredArray.length > 0) {
							return filteredArray.map(pin => pin.Name);
						}
					}

					return [resultsArray[0].Name];
				}
			);

			dispatch(focusPinSet(searchResultsPins));
		}
	}, [assignedPins, dispatch, searchResults, searchString.length]);

	let errorMsg = '';

	if (searchString.length === 1) {
		errorMsg =
			'A minimum of two characters is required to start searching';
	}

	if (!searchedForTarget.length) {
		errorMsg = 'No results found';
	}

	return (
		<SideDetailsView
			errorMsg={errorMsg}
			targetPins={searchResults}
			handleBackClick={handleBackClick}
		/>
	);
}

export default memo(PinSearch);
