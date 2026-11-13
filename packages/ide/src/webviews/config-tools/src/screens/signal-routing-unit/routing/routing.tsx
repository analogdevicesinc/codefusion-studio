/**
 *
 * Copyright (c) 2026 Analog Devices, Inc.
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
import CfsSingleColumnLayout from '@common/components/cfs-main-layout/CfsSingleColumnLayout';
import {RoutingTable} from './routing-table';
import {SearchBar} from '../common/search-bar';
import styles from './routing.module.scss';
import {useAppDispatch} from '../../../state/store';
import {setRoutingFilter} from '../../../state/slices/sru/sru.reducer';
import {
	useSruRoutingFilter,
	useFilteredSruConnections
} from '../../../state/slices/sru/sru.selector';

/**
 * Routing subscreen of the Signal Routing Unit screen.
 */
export function Routing() {
	const dispatch = useAppDispatch();
	const routingFilter = useSruRoutingFilter();

	const hasDefaultResults =
		useFilteredSruConnections({
			...routingFilter,
			statusFilter: 'default'
		}).length > 0;

	const hasModifiedResults =
		useFilteredSruConnections({
			...routingFilter,
			statusFilter: 'modified'
		}).length > 0;

	return (
		<CfsSingleColumnLayout>
			<div slot='header' data-test='signal-routing-unit-routing'>
				<SearchBar
					isDefaultDisabled={!hasDefaultResults}
					isModifiedDisabled={!hasModifiedResults}
					initialSearchValue={routingFilter.searchText}
					initialFilterOption={routingFilter.statusFilter}
					onSearchChange={searchValue =>
						dispatch(setRoutingFilter({searchText: searchValue}))
					}
					onFilterChange={filterOption =>
						dispatch(setRoutingFilter({statusFilter: filterOption}))
					}
				/>
			</div>

			<div
				data-test='signal-routing-unit-routing-body'
				className={styles.body}
			>
				<RoutingTable />
			</div>
		</CfsSingleColumnLayout>
	);
}
