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

import {useMemo, useState} from 'react';
import {
	Badge,
	DataGrid,
	DataGridCell,
	DataGridRow
} from 'cfs-react-library';
import Accordion from '../../../../../../common/components/accordion/Accordion';
import styles from './unconfigured-firewalls.module.scss';
import {
	type TLocaleContext,
	useLocaleContext
} from '../../../../../../common/contexts/LocaleContext';
import {navigationItems} from '../../../../../../common/constants/navigation';
import {useAppDispatch} from '../../../../state/store';
import {setActiveScreenSubscreen} from '../../../../state/slices/app-context/appContext.reducer';
import {useFirewallZones} from '../../../../state/slices/firewall/firewall.selector';
import {
	getChildCount,
	getConfiguredEntryKeys,
	getFirewallInitiators,
	getFirewallResponders,
	getUnconfiguredNodes
} from '../../firewall-data';

type FirewallColumn = 'initiators' | 'responders';

export function UnconfiguredFirewalls() {
	const l10n: TLocaleContext | undefined =
		useLocaleContext()?.firewallOverview;
	const dispatch = useAppDispatch();
	const [activeColumn, setActiveColumn] =
		useState<FirewallColumn>('initiators');
	const [openRows, setOpenRows] = useState<string[]>([]);

	const zones = useFirewallZones();
	const configuredKeys = useMemo(
		() => getConfiguredEntryKeys(zones),
		[zones]
	);

	const initiators = getUnconfiguredNodes(
		getFirewallInitiators(),
		'initiators',
		configuredKeys
	);
	const responders = getUnconfiguredNodes(
		getFirewallResponders(),
		'responders',
		configuredKeys
	);

	const toggleRow = (name: string) => {
		setOpenRows(prev =>
			prev.includes(name)
				? prev.filter(item => item !== name)
				: [...prev, name]
		);
	};

	const initiatorChildCount = getChildCount(initiators);
	const responderChildCount = getChildCount(responders);

	const columns: Array<{
		id: FirewallColumn;
		label: string;
		count: number;
	}> = [
		{
			id: 'initiators',
			label:
				l10n?.unconfiguredFirewalls?.columns?.initiators ??
				'INITIATORS',
			count: initiatorChildCount
		},
		{
			id: 'responders',
			label:
				l10n?.unconfiguredFirewalls?.columns?.responders ??
				'RESPONDERS',
			count: responderChildCount
		}
	];

	return (
		<div
			className={styles.unconfiguredFirewalls}
			data-test='unconfigured-firewalls'
		>
			<div className={styles.titleRow}>
				<h1>
					{l10n?.unconfiguredFirewalls?.title ??
						'Unconfigured Firewalls'}
				</h1>
				<Badge
					appearance='secondary'
					dataTest='unconfigured-firewalls:total-count'
				>
					{initiatorChildCount + responderChildCount}
				</Badge>
			</div>
			<DataGrid
				className={styles.table}
				gridTemplateColumns='1fr'
				dataTest='unconfigured-firewalls:table'
			>
				<DataGridRow rowType='header' className={styles.tableHeader}>
					<DataGridCell cellType='columnheader' gridColumn='1'>
						<div className={styles.headerRow}>
							<div
								className={styles.tabs}
								data-test='unconfigured-firewalls:tabs'
							>
								{columns.map(column => (
									<button
										key={column.id}
										type='button'
										className={`${styles.tab} ${
											activeColumn === column.id ? styles.active : ''
										}`}
										data-test={`unconfigured-firewalls:tab-${column.id}`}
										onClick={() => {
											setActiveColumn(column.id);
										}}
									>
										{column.label}
										<Badge
											appearance='secondary'
											dataTest={`unconfigured-firewalls:count-${column.id}`}
										>
											{column.count}
										</Badge>
									</button>
								))}
							</div>
							<button
								type='button'
								className={styles.configureLink}
								data-test='unconfigured-firewalls:configure-link'
								onClick={() => {
									dispatch(
										setActiveScreenSubscreen(
											navigationItems.firewallZones
										)
									);
								}}
							>
								{l10n?.unconfiguredFirewalls?.link ??
									'Protect and Configure Firewalls Zones'}
							</button>
						</div>
					</DataGridCell>
				</DataGridRow>
				{(activeColumn === 'initiators'
					? initiators
					: responders
				).map(node => (
					<DataGridRow
						key={node.name}
						className={styles.accordionRow}
					>
						<DataGridCell gridColumn='1'>
							<Accordion
								disableBorderOnHover
								title={node.name}
								isOpen={openRows.includes(node.name)}
								titleBadge={
									<Badge
										appearance='secondary'
										dataTest={`unconfigured-firewalls:child-count-${node.name}`}
									>
										{node.children.length}
									</Badge>
								}
								toggleExpand={() => {
									toggleRow(node.name);
								}}
								body={
									<div className={styles.childList}>
										{node.children.map(child => (
											<span
												key={child.name}
												className={styles.childRow}
											>
												{child.name}
											</span>
										))}
									</div>
								}
							/>
						</DataGridCell>
					</DataGridRow>
				))}
			</DataGrid>
		</div>
	);
}
