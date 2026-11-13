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

import {Badge, CheckBox} from 'cfs-react-library';
import {SUPPORTED_MODE_LABELS} from '../../../../firewall-data';
import styles from './selectable-firewall-group-list.module.scss';

type SelectableFirewallChildRowProps = {
	readonly parentName: string;
	readonly childName: string;
	readonly childKey: string;
	readonly isSelected: boolean;
	readonly isConfigured: boolean;
	readonly hasModes: boolean;
	readonly onToggle: (childKey: string, selected: boolean) => void;
};

function SelectableFirewallChildRow({
	parentName,
	childName,
	childKey,
	isSelected,
	isConfigured,
	hasModes,
	onToggle
}: SelectableFirewallChildRowProps) {
	return (
		<div className={styles.childRow}>
			<CheckBox
				className={styles.entryCheckbox}
				checked={isSelected}
				dataTest={`firewall-zones:manage-firewall-view:initiator-responder-table:select-${parentName}-${childName}`}
				onClick={() => {
					onToggle(childKey, !isSelected);
				}}
			>
				{isConfigured ? childName : `${childName} *`}
			</CheckBox>
			{hasModes ? (
				<span className={styles.modesCell}>
					{SUPPORTED_MODE_LABELS.map(mode => (
						<Badge
							key={mode}
							className={styles.modeBadge}
							appearance='secondary'
							dataTest={`firewall-zones:manage-firewall-view:initiator-responder-table:mode-${parentName}-${childName}-${mode}`}
						>
							{mode}
						</Badge>
					))}
				</span>
			) : null}
		</div>
	);
}

export default SelectableFirewallChildRow;
