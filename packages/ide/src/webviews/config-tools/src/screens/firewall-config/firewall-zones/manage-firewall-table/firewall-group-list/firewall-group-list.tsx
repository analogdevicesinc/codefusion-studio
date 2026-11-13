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

import {Badge, ConflictIcon} from 'cfs-react-library';
import Accordion from '../../../../../../../common/components/accordion/Accordion';
import {
	type FirewallGroup,
	getEntryKey
} from '../../../firewall-data';
import type {
	FirewallZoneAccessModeId,
	ResponderConfig,
	ResponderConfigTarget
} from '../../../../../types/firewall';
import FirewallChildRow from './firewall-child-row';
import styles from './firewall-group-list.module.scss';

type FirewallGroupListLabels = {
	name: string;
	supportedModes: string;
	configureTooltip: string;
	deleteTooltip: string;
	conflictLabel: string;
};

type FirewallGroupListProps = {
	readonly groups: FirewallGroup[];
	readonly activeColumn: 'initiators' | 'responders';
	readonly hasModes: boolean;
	readonly accessModes: Record<FirewallZoneAccessModeId, boolean>;
	readonly closedRows: string[];
	readonly responderConfigs: Record<string, ResponderConfig>;
	readonly activeResponderConfig: ResponderConfigTarget | undefined;
	readonly conflictMessages: Record<string, string>;
	readonly labels: FirewallGroupListLabels;
	readonly onToggleRow: (name: string) => void;
	readonly onConfigure: (parent: string, child: string) => void;
	readonly onRemove: (parent: string, child: string) => void;
};

function FirewallGroupList({
	groups,
	activeColumn,
	hasModes,
	accessModes,
	closedRows,
	responderConfigs,
	activeResponderConfig,
	conflictMessages,
	labels,
	onToggleRow,
	onConfigure,
	onRemove
}: FirewallGroupListProps) {
	return (
		<div
			className={styles.groupList}
			data-test={`firewall-zones:manage-firewalls:list-${activeColumn}`}
		>
			<div
				className={`${styles.columnHeader} ${
					hasModes ? '' : styles.responderGrid
				}`}
				data-test='firewall-zones:manage-firewalls:column-header'
			>
				<span className={styles.columnHeaderName}>{labels.name}</span>
				{hasModes ? (
					<span className={styles.columnHeaderModes}>
						{labels.supportedModes}
					</span>
				) : null}
				<span aria-hidden />
			</div>
			{groups.map(group => {
				const hasConflict = group.children.some(
					child =>
						conflictMessages[
							getEntryKey(activeColumn, group.parent, child)
						]
				);

				return (
					<Accordion
						key={group.parent}
						disableBorderOnHover
						highlight={!closedRows.includes(group.parent)}
						title={group.parent}
						isOpen={!closedRows.includes(group.parent)}
						titleBadge={
							<Badge
								appearance='secondary'
								dataTest={`firewall-zones:manage-firewalls:child-count-${group.parent}`}
							>
								{group.children.length}
							</Badge>
						}
						caption={
							hasConflict ? (
								<span className={styles.groupConflictIcon}>
									<ConflictIcon
										width={16}
										height={16}
										aria-hidden='true'
										focusable={false}
										dataTest={`firewall-zones:manage-firewalls:group-conflict-${group.parent}`}
									/>
									<span className={styles.visuallyHidden}>
										{labels.conflictLabel}
									</span>
								</span>
							) : undefined
						}
						toggleExpand={() => {
							onToggleRow(group.parent);
						}}
						body={
							<div className={styles.childList}>
								{group.children.map(child => {
									const entryKey = getEntryKey(
										activeColumn,
										group.parent,
										child
									);
									const displayName = hasModes
										? child
										: (responderConfigs[entryKey]?.name ?? child);
									const isActiveResponder =
										activeResponderConfig?.parent === group.parent &&
										activeResponderConfig?.child === child;

									return (
										<FirewallChildRow
											key={child}
											parent={group.parent}
											child={child}
											displayName={displayName}
											hasModes={hasModes}
											accessModes={accessModes}
											isActiveResponder={isActiveResponder}
											configureTooltip={labels.configureTooltip}
											deleteTooltip={labels.deleteTooltip}
											conflictMessage={conflictMessages[entryKey]}
											onConfigure={onConfigure}
											onRemove={onRemove}
										/>
									);
								})}
							</div>
						}
					/>
				);
			})}
		</div>
	);
}

export default FirewallGroupList;
