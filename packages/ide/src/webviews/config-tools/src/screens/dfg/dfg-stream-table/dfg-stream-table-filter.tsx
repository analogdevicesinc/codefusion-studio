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

import {
	MultiSelect,
	SearchInput,
	type MultiSelectOption
} from 'cfs-react-library';
import styles from './dfg-stream-table-filter.module.scss';
import {useCallback, useMemo} from 'react';
import {useStreams} from '../../../state/slices/gaskets/gasket.selector';
import {useAppDispatch, useAppSelector} from '../../../state/store';
import {
	setFilteredDestinations,
	setFilteredGroups,
	setFilteredSources,
	setSearchQuery
} from '../../../state/slices/gaskets/gasket.reducer';

export function DfgStreamTableFilter() {
	const dispatch = useAppDispatch();
	const streams = useStreams();
	const filteredSources = useAppSelector(
		state => state.gasketsReducer.filteredSources ?? []
	);
	const filteredDestinations = useAppSelector(
		state => state.gasketsReducer.filteredDestinations ?? []
	);
	const filteredGroups = useAppSelector(
		state => state.gasketsReducer.filteredGroups ?? []
	);
	const searchQuery = useAppSelector(
		state => state.gasketsReducer.searchQuery ?? ''
	);

	const sourceOptions: MultiSelectOption[] = useMemo(() => {
		const sourceGaskets = new Set<string>();
		streams.forEach(stream => {
			sourceGaskets.add(stream.Source.Gasket);
		});

		return Array.from(sourceGaskets).map(gasket => ({
			label: gasket,
			value: gasket
		}));
	}, [streams]);

	const destinationOptions: MultiSelectOption[] = useMemo(() => {
		const destinationGaskets = new Set<string>();
		streams.forEach(stream => {
			stream.Destinations.forEach(dest => {
				destinationGaskets.add(dest.Gasket);
			});
		});

		return Array.from(destinationGaskets).map(gasket => ({
			label: gasket,
			value: gasket
		}));
	}, [streams]);

	const groupOptions: MultiSelectOption[] = useMemo(() => {
		const groups = new Set<string>();
		let streamsWithNoGroup = false;
		streams.forEach(stream => {
			if (stream.Group) {
				groups.add(stream.Group);
			} else {
				streamsWithNoGroup = true;
			}
		});

		const streamGroups = Array.from(groups).map(group => ({
			label: group,
			value: group
		}));

		if (groups.size > 0 && streamsWithNoGroup) {
			streamGroups.unshift({
				label: 'No group assigned',
				value: 'nogroup'
			});
		}

		return streamGroups;
	}, [streams]);

	const onSourceSelection = useCallback(
		(options: MultiSelectOption[]) => {
			dispatch(
				setFilteredSources(options.map(option => option.value))
			);
		},
		[dispatch]
	);

	const onDestinationSelection = useCallback(
		(options: MultiSelectOption[]) => {
			dispatch(
				setFilteredDestinations(options.map(option => option.value))
			);
		},
		[dispatch]
	);

	const onGroupSelection = useCallback(
		(options: MultiSelectOption[]) => {
			dispatch(
				setFilteredGroups(options.map(option => option.value))
			);
		},
		[dispatch]
	);

	const onClearAllFilters = useCallback(() => {
		dispatch(setFilteredSources([]));
		dispatch(setFilteredDestinations([]));
		dispatch(setFilteredGroups([]));
		dispatch(setSearchQuery(''));
	}, [dispatch]);

	const anyFilterSet = useMemo(
		() =>
			filteredSources.length > 0 ||
			filteredDestinations.length > 0 ||
			filteredGroups.length > 0 ||
			searchQuery.length > 0,
		[
			filteredSources,
			filteredDestinations,
			filteredGroups,
			searchQuery
		]
	);

	return (
		<div className={styles.container}>
			<div>
				<SearchInput
					inputVal={searchQuery}
					dataTest='dfg-search-input'
					onClear={() => {
						dispatch(setSearchQuery(''));
					}}
					onInputChange={(value: string) => {
						dispatch(setSearchQuery(value));
					}}
				/>
			</div>
			<div className={styles.multiSelectFilters}>
				<div className={styles.multiSelectContainer}>
					<MultiSelect
						variant='filter'
						disabled={sourceOptions.length === 0}
						chipText={
							filteredSources.length > 0
								? filteredSources.length.toString()
								: undefined
						}
						dropdownText='Source'
						dataTest='dfg-source-filter'
						options={sourceOptions}
						initialSelectedOptions={filteredSources.map(source => ({
							label: source,
							value: source
						}))}
						onSelection={onSourceSelection}
					/>
				</div>
				<div className={styles.multiSelectContainer}>
					<MultiSelect
						variant='filter'
						disabled={destinationOptions.length === 0}
						chipText={
							filteredDestinations.length > 0
								? filteredDestinations.length.toString()
								: undefined
						}
						dropdownText='Destination'
						dataTest='dfg-destination-filter'
						options={destinationOptions}
						initialSelectedOptions={filteredDestinations.map(
							destination => ({
								label: destination,
								value: destination
							})
						)}
						onSelection={onDestinationSelection}
					/>
				</div>
				<div className={styles.multiSelectContainer}>
					<MultiSelect
						variant='filter'
						disabled={groupOptions.length === 0}
						chipText={
							filteredGroups.length > 0
								? filteredGroups.length.toString()
								: undefined
						}
						dropdownText='Group'
						dataTest='dfg-group-filter'
						options={groupOptions}
						initialSelectedOptions={filteredGroups.map(group => ({
							label: group,
							value: group
						}))}
						onSelection={onGroupSelection}
					/>
				</div>
			</div>
			{anyFilterSet && (
				<div
					className={styles.clearAllFilters}
					data-test='dfg-clear-all-filters'
					onClick={onClearAllFilters}
				>
					Clear all
				</div>
			)}
		</div>
	);
}
