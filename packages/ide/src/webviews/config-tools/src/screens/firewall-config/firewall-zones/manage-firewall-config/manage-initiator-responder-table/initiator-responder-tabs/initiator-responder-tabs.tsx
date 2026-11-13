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

import {Badge} from 'cfs-react-library';
import {
	type FirewallColumn,
	type FirewallColumnTab
} from '../../../../firewall-data';
import styles from './initiator-responder-tabs.module.scss';

type InitiatorResponderTabsProps = {
	readonly columns: FirewallColumnTab[];
	readonly activeColumn: FirewallColumn;
	readonly onSelectColumn: (column: FirewallColumn) => void;
};

function InitiatorResponderTabs({
	columns,
	activeColumn,
	onSelectColumn
}: InitiatorResponderTabsProps) {
	return (
		<div
			className={styles.tabs}
			data-test='firewall-zones:manage-firewall-view:initiator-responder-table:tabs'
		>
			{columns.map(column => (
				<button
					key={column.id}
					type='button'
					aria-pressed={activeColumn === column.id}
					className={`${styles.tab} ${
						activeColumn === column.id ? styles.active : ''
					}`}
					data-test={`firewall-zones:manage-firewall-view:initiator-responder-table:tab-${column.id}`}
					onClick={() => {
						onSelectColumn(column.id);
					}}
				>
					{column.label}
					<Badge
						appearance='secondary'
						dataTest={`firewall-zones:manage-firewall-view:initiator-responder-table:count-${column.id}`}
					>
						{column.count}
					</Badge>
				</button>
			))}
		</div>
	);
}

export default InitiatorResponderTabs;
