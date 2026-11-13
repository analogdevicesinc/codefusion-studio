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

import {useEffect, useMemo, useRef, useState} from 'react';
import {EmptyState} from 'cfs-react-library';
import {
	type TLocaleContext,
	useLocaleContext
} from '../../../../../../../common/contexts/LocaleContext';
import {
	type FirewallChild,
	type FirewallColumn,
	type FirewallNode,
	buildFirewallCatalogColumns,
	filterFirewallNodes,
	getConfiguredEntryKeys,
	getEntryKey,
	getFirewallInitiators,
	getFirewallResponders
} from '../../../firewall-data';
import {useFirewallZones} from '../../../../../state/slices/firewall/firewall.selector';
import {createSearchPattern} from '../../../../../../../common/utils/highlightApi';
import {useTextNodeHighlight} from '../../../../../hooks/use-text-node-highlight';
import InitiatorResponderTabs from './initiator-responder-tabs/initiator-responder-tabs';
import SelectableFirewallGroupList from './selectable-firewall-group-list/selectable-firewall-group-list';
import styles from './manage-initiator-responder-table.module.scss';

type ManageInitiatorResponderTableProps = {
	readonly initialColumn: FirewallColumn;
	readonly searchQuery: string;
	readonly isUnconfiguredActive: boolean;
	readonly isConfiguredActive: boolean;
	readonly selectedEntries: string[];
	readonly onEntriesChange: (
		keys: string[],
		selected: boolean
	) => void;
};

function ManageInitiatorResponderTable({
	initialColumn,
	searchQuery,
	isUnconfiguredActive,
	isConfiguredActive,
	selectedEntries,
	onEntriesChange
}: ManageInitiatorResponderTableProps) {
	const l10n: TLocaleContext | undefined =
		useLocaleContext()?.firewallZones?.['manage-firewalls'];
	const [activeColumn, setActiveColumn] =
		useState<FirewallColumn>(initialColumn);

	// Keep the active tab in sync with the column the user launched the
	// manage view from (initiators vs responders) whenever it changes.
	useEffect(() => {
		setActiveColumn(initialColumn);
	}, [initialColumn]);
	const [openRows, setOpenRows] = useState<string[]>(() => [
		...getFirewallInitiators().map(node => node.name),
		...getFirewallResponders().map(node => node.name)
	]);

	const zones = useFirewallZones();
	const configuredKeys = useMemo(
		() => getConfiguredEntryKeys(zones),
		[zones]
	);

	const searchPattern: RegExp = useMemo(
		() => createSearchPattern(searchQuery),
		[searchQuery]
	);

	const visibleNodes = useMemo<FirewallNode[]>(() => {
		const nodes =
			activeColumn === 'initiators'
				? getFirewallInitiators()
				: getFirewallResponders();

		// When both or neither config filters are active, no config-based
		// filtering is applied.
		const matchesConfigFilter = (
			parent: string,
			child: FirewallChild
		): boolean => {
			if (isUnconfiguredActive === isConfiguredActive) {
				return true;
			}

			const configured = configuredKeys.has(
				getEntryKey(activeColumn, parent, child.name)
			);

			return isUnconfiguredActive ? !configured : configured;
		};

		return filterFirewallNodes(
			nodes,
			searchPattern,
			searchQuery.trim(),
			matchesConfigFilter
		);
	}, [
		activeColumn,
		searchPattern,
		searchQuery,
		isConfiguredActive,
		isUnconfiguredActive,
		configuredKeys
	]);

	const allVisibleEntryKeys = useMemo<string[]>(
		() =>
			visibleNodes.flatMap(node =>
				node.children.map(child =>
					getEntryKey(activeColumn, node.name, child.name)
				)
			),
		[visibleNodes, activeColumn]
	);

	const selectedVisibleCount = allVisibleEntryKeys.filter(key =>
		selectedEntries.includes(key)
	).length;
	const allEntriesSelected =
		allVisibleEntryKeys.length > 0 &&
		selectedVisibleCount === allVisibleEntryKeys.length;
	const someEntriesSelected =
		selectedVisibleCount > 0 && !allEntriesSelected;

	const rowsRef = useRef<HTMLDivElement>(null);

	useTextNodeHighlight({
		containerRef: rowsRef,
		highlightGroup: 'firewall-initiator-responder-search-highlight',
		searchQuery,
		searchPattern,
		contentDeps: [visibleNodes, openRows]
	});

	const toggleRow = (name: string) => {
		setOpenRows(prev =>
			prev.includes(name)
				? prev.filter(item => item !== name)
				: [...prev, name]
		);
	};

	const columns = buildFirewallCatalogColumns({
		initiators: l10n?.tabs?.initiators ?? 'INITIATORS',
		responders: l10n?.tabs?.responders ?? 'RESPONDERS'
	});

	return (
		<div
			className={styles.table}
			data-test='firewall-zones:manage-firewall-view:initiator-responder-table'
		>
			<InitiatorResponderTabs
				columns={columns}
				activeColumn={activeColumn}
				onSelectColumn={setActiveColumn}
			/>
			{visibleNodes.length === 0 ? (
				<div
					className={styles.emptyState}
					data-test='firewall-zones:manage-firewall-view:initiator-responder-table:no-results'
				>
					<EmptyState
						title={l10n?.['no-results']?.title}
						type='info'
						description={l10n?.['no-results']?.description}
						hasBorder={false}
					/>
				</div>
			) : (
				<SelectableFirewallGroupList
					rowsRef={rowsRef}
					nodes={visibleNodes}
					activeColumn={activeColumn}
					openRows={openRows}
					selectedEntries={selectedEntries}
					configuredKeys={configuredKeys}
					isAllSelected={allEntriesSelected}
					isSomeSelected={someEntriesSelected}
					allVisibleEntryKeys={allVisibleEntryKeys}
					labels={{
						selectAll: l10n?.selectAll ?? 'Select All',
						unconfigured: l10n?.unconfigured ?? 'UNCONFIGURED'
					}}
					onToggleRow={toggleRow}
					onEntriesChange={onEntriesChange}
				/>
			)}
		</div>
	);
}

export default ManageInitiatorResponderTable;
