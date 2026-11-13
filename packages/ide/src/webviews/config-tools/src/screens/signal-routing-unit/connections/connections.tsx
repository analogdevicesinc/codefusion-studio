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

import {useMemo} from 'react';
import {EmptyState} from 'cfs-react-library';
import CfsTwoColumnLayout from '@common/components/cfs-main-layout/CfsTwoColumnLayout';
import {
	type TLocaleContext,
	useLocaleContext
} from '@common/contexts/LocaleContext';
import {useAppDispatch} from '../../../state/store';
import {setConnectionsFilter} from '../../../state/slices/sru/sru.reducer';
import {getSruSignalGroups} from '../../../utils/sru-navigation';
import {useSruBaseNavigationSections} from '../../../hooks/use-sru-search-results';
import SruPeripheralNavigation from './sru-peripheral-navigation/sru-peripheral-navigation';
import {ConnectionsSearch} from './connections-search';
import {ConnectionDetailsPanel} from './connection-details-panel/connection-details-panel';
import styles from './connections.module.scss';
import {
	useSruConnectionsFilter,
	useSruSelectedSignalGroupKey,
	useEditableConnections
} from '../../../state/slices/sru/sru.selector';
import {PeripheralConnections} from './peripheral-connections/peripheral-connections';

/**
 * Connections subscreen of the Signal Routing Unit screen.
 *
 * Renders the SoC's SRU peripherals in the side panel - pin buffers and
 * peripherals as separate sections, with grouped entries as expandable
 * accordions and everything else as flat rows - and the selected
 * peripheral's signal connections in the main panel.
 */
export function Connections() {
	const dispatch = useAppDispatch();
	const connectionsFilter = useSruConnectionsFilter();
	const editableConnections = useEditableConnections();
	const baseSections = useSruBaseNavigationSections();

	const selectedSignalGroupKey = useSruSelectedSignalGroupKey();

	const hasEntries = baseSections.some(
		section => section.entries.length > 0
	);

	// Resolving the selection against every signal group rather than the
	// status-filtered ones lets a selection survive its side-panel row being
	// filtered out. The main panel applies the same status filter to its
	// cards instead. `getSruSignalGroups` caches its result at module level -
	// shared with `revealSruSignal` - so this doesn't need its own memoing.
	const allSignalGroups = getSruSignalGroups();

	const selectedSignalGroup = useMemo(
		() =>
			allSignalGroups.find(
				signalGroup => signalGroup.key === selectedSignalGroupKey
			),
		[allSignalGroups, selectedSignalGroupKey]
	);

	const l10n: TLocaleContext | undefined =
		useLocaleContext()?.signalRoutingUnit;

	return (
		<CfsTwoColumnLayout>
			<div slot='header' className={styles.headerItems}>
				<ConnectionsSearch
					searchText={connectionsFilter.searchText}
					statusFilter={connectionsFilter.statusFilter}
					onSearchChange={searchValue =>
						dispatch(setConnectionsFilter({searchText: searchValue}))
					}
					onFilterChange={filterOption =>
						dispatch(
							setConnectionsFilter({
								statusFilter: filterOption
							})
						)
					}
				/>
			</div>
			<div
				slot='side-panel'
				className={styles.sidePanel}
				data-test='signal-routing-unit-side-panel'
			>
				{hasEntries ? (
					<div className={styles.sidePanelContent}>
						<div className={styles.listHeader}>
							<div className={styles.headerContent}>
								<span className={styles.listTitle}>
									{l10n?.connections?.peripheralList?.title}
								</span>
							</div>
						</div>
						<div className={styles.listWrapper}>
							<SruPeripheralNavigation sections={baseSections} />
						</div>
					</div>
				) : (
					<div
						className={styles.emptySidePanelContainer}
						data-test='signal-routing-unit-empty-side-panel'
					>
						<EmptyState
							title={l10n?.['empty-sidebar']?.title}
							description={l10n?.['empty-sidebar']?.description}
							hasBorder={false}
						/>
					</div>
				)}
			</div>
			<div
				slot='main-panel'
				data-test='signal-routing-unit-main'
				className={styles.main}
			>
				{selectedSignalGroup === undefined ? (
					<div
						className={styles.emptyMain}
						data-test='signal-routing-unit-no-selection'
					>
						<EmptyState
							title={l10n?.connections?.noSelection?.title}
							description={
								l10n?.connections?.noSelection?.description
							}
							hasBorder={false}
						/>
					</div>
				) : (
					<PeripheralConnections signalGroup={selectedSignalGroup} />
				)}
			</div>
			{editableConnections !== undefined && (
				<ConnectionDetailsPanel />
			)}
		</CfsTwoColumnLayout>
	);
}
