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

import {type RefObject} from 'react';
import {Badge, CheckBox} from 'cfs-react-library';
import Accordion from '../../../../../../../../common/components/accordion/Accordion';
import {
	type FirewallColumn,
	type FirewallNode,
	getEntryKey
} from '../../../../firewall-data';
import SelectableFirewallChildRow from './selectable-firewall-child-row';
import styles from './selectable-firewall-group-list.module.scss';

type SelectableFirewallGroupListLabels = {
	selectAll: string;
	unconfigured: string;
};

type SelectableFirewallGroupListProps = {
	readonly rowsRef: RefObject<HTMLDivElement>;
	readonly nodes: FirewallNode[];
	readonly activeColumn: FirewallColumn;
	readonly openRows: string[];
	readonly selectedEntries: string[];
	readonly configuredKeys: ReadonlySet<string>;
	readonly isAllSelected: boolean;
	readonly isSomeSelected: boolean;
	readonly allVisibleEntryKeys: string[];
	readonly labels: SelectableFirewallGroupListLabels;
	readonly onToggleRow: (name: string) => void;
	readonly onEntriesChange: (
		keys: string[],
		selected: boolean
	) => void;
};

function SelectableFirewallGroupList({
	rowsRef,
	nodes,
	activeColumn,
	openRows,
	selectedEntries,
	configuredKeys,
	isAllSelected,
	isSomeSelected,
	allVisibleEntryKeys,
	labels,
	onToggleRow,
	onEntriesChange
}: SelectableFirewallGroupListProps) {
	const hasModes = activeColumn === 'initiators';

	const handleToggleEntry = (key: string, selected: boolean) => {
		onEntriesChange([key], selected);
	};

	return (
		<>
			<div
				className={styles.selectAllRow}
				data-test='firewall-zones:manage-firewall-view:initiator-responder-table:select-all-row'
			>
				<CheckBox
					checked={isAllSelected}
					indeterminate={isSomeSelected}
					dataTest='firewall-zones:manage-firewall-view:initiator-responder-table:select-all'
					onClick={() => {
						onEntriesChange(allVisibleEntryKeys, !isAllSelected);
					}}
				>
					{labels.selectAll}
				</CheckBox>
				<span
					className={styles.unconfiguredCell}
					data-test='firewall-zones:manage-firewall-view:initiator-responder-table:unconfigured'
				>
					{`* ${labels.unconfigured}`}
				</span>
			</div>
			<div ref={rowsRef} className={styles.rows}>
				{nodes.map(node => {
					const childKeys = node.children.map(child =>
						getEntryKey(activeColumn, node.name, child.name)
					);
					const selectedChildCount = childKeys.filter(key =>
						selectedEntries.includes(key)
					).length;
					const allChildrenSelected =
						selectedChildCount === childKeys.length;
					const someChildrenSelected =
						selectedChildCount > 0 && !allChildrenSelected;

					return (
						<div key={node.name} className={styles.accordionRow}>
							<Accordion
								disableBorderOnHover
								title={node.name}
								isOpen={openRows.includes(node.name)}
								caption={
									<Badge
										appearance='secondary'
										dataTest={`firewall-zones:manage-firewall-view:initiator-responder-table:selected-count-${node.name}`}
									>
										{`${selectedChildCount}/${childKeys.length}`}
									</Badge>
								}
								titlePrefix={
									<CheckBox
										className={styles.entryCheckbox}
										checked={allChildrenSelected}
										indeterminate={someChildrenSelected}
										dataTest={`firewall-zones:manage-firewall-view:initiator-responder-table:select-${node.name}`}
										onClick={event => {
											event.stopPropagation();
											onEntriesChange(
												childKeys,
												!allChildrenSelected
											);
										}}
									/>
								}
								toggleExpand={() => {
									onToggleRow(node.name);
								}}
								body={
									<div className={styles.childList}>
										{node.children.map(child => {
											const childKey = getEntryKey(
												activeColumn,
												node.name,
												child.name
											);

											return (
												<SelectableFirewallChildRow
													key={child.name}
													parentName={node.name}
													childName={child.name}
													childKey={childKey}
													isSelected={selectedEntries.includes(
														childKey
													)}
													isConfigured={configuredKeys.has(childKey)}
													hasModes={hasModes}
													onToggle={handleToggleEntry}
												/>
											);
										})}
									</div>
								}
							/>
						</div>
					);
				})}
			</div>
		</>
	);
}

export default SelectableFirewallGroupList;
