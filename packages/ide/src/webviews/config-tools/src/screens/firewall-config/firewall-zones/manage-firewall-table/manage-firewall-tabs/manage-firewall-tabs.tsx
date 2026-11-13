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

import {
	Badge,
	Button,
	ConflictIcon,
	PlusIcon,
	Tooltip
} from 'cfs-react-library';
import {
	type FirewallColumn,
	type FirewallColumnTab
} from '../../../firewall-data';
import styles from './manage-firewall-tabs.module.scss';

type ManageFirewallTabsProps = {
	readonly columns: FirewallColumnTab[];
	readonly activeColumn: FirewallColumn;
	readonly addTooltip: string;
	readonly conflictLabel: string;
	readonly columnsWithConflicts: FirewallColumn[];
	readonly onSelectColumn: (column: FirewallColumn) => void;
	readonly onAdd: () => void;
};

function ManageFirewallTabs({
	columns,
	activeColumn,
	addTooltip,
	conflictLabel,
	columnsWithConflicts,
	onSelectColumn,
	onAdd
}: ManageFirewallTabsProps) {
	return (
		<div className={styles.tabsHeader}>
			<div
				className={styles.tabs}
				data-test='firewall-zones:manage-firewalls:tabs'
			>
				{columns.map(column => (
					<button
						key={column.id}
						type='button'
						className={`${styles.tab} ${
							activeColumn === column.id ? styles.active : ''
						}`}
						data-test={`firewall-zones:manage-firewalls:tab-${column.id}`}
						onClick={() => {
							onSelectColumn(column.id);
						}}
					>
						{column.label}
						<Badge
							appearance='secondary'
							dataTest={`firewall-zones:manage-firewalls:count-${column.id}`}
						>
							{column.count}
						</Badge>
						{columnsWithConflicts.includes(column.id) ? (
							<>
								<ConflictIcon
									width={16}
									height={16}
									aria-hidden='true'
									focusable={false}
									dataTest={`firewall-zones:manage-firewalls:tab-conflict-${column.id}`}
								/>
								<span className={styles.visuallyHidden}>
									{conflictLabel}
								</span>
							</>
						) : null}
					</button>
				))}
			</div>
			<Tooltip type='short' title={addTooltip} position='bottom'>
				<Button
					appearance='icon'
					ariaLabel={addTooltip}
					dataTest='firewall-zones:manage-firewalls:add-icon'
					onClick={onAdd}
				>
					<PlusIcon />
				</Button>
			</Tooltip>
		</div>
	);
}

export default ManageFirewallTabs;
