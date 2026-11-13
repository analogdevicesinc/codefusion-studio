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
	ConfigIcon,
	ConflictIcon,
	DeleteIcon,
	Tooltip
} from 'cfs-react-library';
import {SUPPORTED_MODES} from '../../../firewall-data';
import type {FirewallZoneAccessModeId} from '../../../../../types/firewall';
import styles from './firewall-group-list.module.scss';

type FirewallChildRowProps = {
	readonly parent: string;
	readonly child: string;
	readonly displayName: string;
	readonly hasModes: boolean;
	readonly accessModes: Record<FirewallZoneAccessModeId, boolean>;
	readonly isActiveResponder: boolean;
	readonly configureTooltip: string;
	readonly deleteTooltip: string;
	readonly conflictMessage?: string;
	readonly onConfigure: (parent: string, child: string) => void;
	readonly onRemove: (parent: string, child: string) => void;
};

function FirewallChildRow({
	parent,
	child,
	displayName,
	hasModes,
	accessModes,
	isActiveResponder,
	configureTooltip,
	deleteTooltip,
	conflictMessage,
	onConfigure,
	onRemove
}: FirewallChildRowProps) {
	return (
		<div
			className={`${styles.childRow} ${
				hasModes ? '' : styles.responderGrid
			} ${!hasModes && isActiveResponder ? styles.highlight : ''}`}
		>
			<span className={styles.nameCell}>{displayName}</span>
			{hasModes ? (
				<span className={styles.modesCell}>
					{SUPPORTED_MODES.map(({id, label}) => (
						<Badge
							key={id}
							className={styles.modeBadge}
							appearance={accessModes[id] ? 'secondary' : 'active'}
							dataTest={`firewall-zones:manage-firewalls:mode-${parent}-${child}-${label}`}
						>
							{label}
						</Badge>
					))}
				</span>
			) : null}
			<div className={styles.actionsCell}>
				{conflictMessage ? (
					<Tooltip
						type='short'
						title={conflictMessage}
						position='bottom'
					>
						<span
							className={styles.conflictIcon}
							role='img'
							aria-label={conflictMessage}
						>
							<ConflictIcon
								width={16}
								height={16}
								aria-hidden='true'
								focusable={false}
								dataTest={`firewall-zones:manage-firewalls:conflict-${parent}-${child}`}
							/>
						</span>
					</Tooltip>
				) : null}
				{hasModes ? null : (
					<Tooltip
						type='short'
						title={configureTooltip}
						position='bottom'
					>
						<Button
							className={isActiveResponder ? styles.configActive : ''}
							appearance='icon'
							ariaLabel={configureTooltip}
							dataTest={`firewall-zones:manage-firewalls:config-${parent}-${child}`}
							onClick={() => {
								onConfigure(parent, child);
							}}
						>
							<ConfigIcon />
						</Button>
					</Tooltip>
				)}
				<Tooltip type='short' title={deleteTooltip} position='bottom'>
					<Button
						appearance='icon'
						ariaLabel={deleteTooltip}
						dataTest={`firewall-zones:manage-firewalls:delete-${parent}-${child}`}
						onClick={() => {
							onRemove(parent, child);
						}}
					>
						<DeleteIcon />
					</Button>
				</Tooltip>
			</div>
		</div>
	);
}

export default FirewallChildRow;
