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

import {useEffect, useMemo, useState} from 'react';
import {
	Button,
	Card,
	EmptyState,
	WarningModal
} from 'cfs-react-library';
import {
	type TLocaleContext,
	useLocaleContext
} from '../../../../../../common/contexts/LocaleContext';
import {
	formatAccessModeConflictMessage,
	formatAddressOverlapMessage
} from '../../firewall-conflict-messages';
import {
	setActiveResponderConfig,
	setManageFirewallsColumn,
	setManageFirewallsView,
	removeFirewallEntry
} from '../../../../state/slices/firewall/firewall.reducer';
import {
	useActiveFirewallZone,
	useActiveResponderConfig,
	useActiveZoneAccessModeConflicts,
	useActiveZoneOverlapConflicts,
	useManageFirewallsColumn,
	useResponderConfigs
} from '../../../../state/slices/firewall/firewall.selector';
import {useAppDispatch} from '../../../../state/store';
import {
	getDeleteInitiatorResponderWarning,
	showDeleteInitiatorResponderWarning
} from '../../../../utils/api';
import {
	buildFirewallColumns,
	type FirewallColumn,
	getEntryKey,
	groupEntriesByParent
} from '../../firewall-data';
import {DEFAULT_FIREWALL_ZONE_ACCESS_MODES} from '../constants';
import FirewallGroupList from './firewall-group-list/firewall-group-list';
import ManageFirewallTabs from './manage-firewall-tabs/manage-firewall-tabs';
import styles from './manage-firewall-table.module.scss';

function ManageFirewallTable() {
	const dispatch = useAppDispatch();
	const activeZone = useActiveFirewallZone();
	const firewallZonesL10n: TLocaleContext | undefined =
		useLocaleContext()?.firewallZones;
	const l10n: TLocaleContext | undefined =
		firewallZonesL10n?.['manage-firewalls'];
	const responderConfigL10n: TLocaleContext | undefined =
		firewallZonesL10n?.['responder-config'];

	// The active tab is stored in Redux so it survives this component
	// remounting when returning from the manage (add) view and stays in
	// sync with the column the user launched the add view from.
	const activeColumn = useManageFirewallsColumn();
	const responderConfigs = useResponderConfigs();
	const activeResponderConfig = useActiveResponderConfig();
	const overlapConflicts = useActiveZoneOverlapConflicts();
	const accessModeConflicts = useActiveZoneAccessModeConflicts();
	const [closedRows, setClosedRows] = useState<string[]>([]);
	const [shouldShowWarning, setShouldShowWarning] = useState(true);
	const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);
	const [pendingRemoval, setPendingRemoval] = useState<
		| {
				parent: string;
				child: string;
				column: FirewallColumn;
		  }
		| undefined
	>(undefined);

	const warningModalL10n: TLocaleContext | undefined =
		l10n?.warningModal;

	const selectedFirewalls = activeZone?.selectedFirewalls ?? [];

	const conflictMessages = useMemo(() => {
		const messages: Record<string, string> = {};

		accessModeConflicts.forEach(conflict => {
			const message = formatAccessModeConflictMessage(
				firewallZonesL10n,
				conflict
			);

			messages[conflict.initiatorKey] ??= message;
			messages[conflict.responderKey] ??= message;
		});

		// An overlap names the exact region, so it wins on responder rows.
		Object.entries(overlapConflicts).forEach(
			([entryKey, regionName]) => {
				messages[entryKey] = formatAddressOverlapMessage(
					responderConfigL10n,
					regionName
				);
			}
		);

		return messages;
	}, [
		accessModeConflicts,
		overlapConflicts,
		firewallZonesL10n,
		responderConfigL10n
	]);

	const columnsWithConflicts = useMemo(() => {
		const columnSet = new Set<FirewallColumn>();

		Object.keys(conflictMessages).forEach(key => {
			const [column] = key.split('::');

			if (column === 'initiators' || column === 'responders') {
				columnSet.add(column);
			}
		});

		return Array.from(columnSet);
	}, [conflictMessages]);

	useEffect(() => {
		getDeleteInitiatorResponderWarning()
			.then((resp: boolean) => {
				setShouldShowWarning(resp);
			})
			.catch(err => {
				console.error(err);
			});
	}, []);

	const handleManageFirewalls = () => {
		dispatch(setManageFirewallsView(true));
	};

	const removeFirewall = (parent: string, child: string) => {
		if (!activeZone) return;

		dispatch(
			removeFirewallEntry({
				id: activeZone.id,
				column: activeColumn,
				parent,
				child
			})
		);
	};

	const handleRemoveFirewall = (parent: string, child: string) => {
		if (!activeZone) return;

		if (shouldShowWarning) {
			setPendingRemoval({parent, child, column: activeColumn});
			setIsWarningModalOpen(true);
		} else {
			removeFirewall(parent, child);
		}
	};

	const handleConfirmRemoval = (isDismissed: boolean) => {
		if (isDismissed) {
			void showDeleteInitiatorResponderWarning(false);
			setShouldShowWarning(false);
		}

		if (pendingRemoval) {
			removeFirewall(pendingRemoval.parent, pendingRemoval.child);
		}

		setPendingRemoval(undefined);
		setIsWarningModalOpen(false);
	};

	const handleCancelRemoval = () => {
		setPendingRemoval(undefined);
		setIsWarningModalOpen(false);
	};

	const toggleRow = (name: string) => {
		setClosedRows(prev =>
			prev.includes(name)
				? prev.filter(item => item !== name)
				: [...prev, name]
		);
	};

	const initiatorGroups = groupEntriesByParent(
		selectedFirewalls,
		'initiators'
	);
	const responderGroups = groupEntriesByParent(
		selectedFirewalls,
		'responders'
	);

	const columns = buildFirewallColumns(
		initiatorGroups,
		responderGroups,
		{
			initiators: l10n?.tabs?.initiators ?? 'INITIATORS',
			responders: l10n?.tabs?.responders ?? 'RESPONDERS'
		}
	);

	const activeGroups =
		activeColumn === 'initiators' ? initiatorGroups : responderGroups;

	const showModes = activeColumn === 'initiators';

	const emptyState = l10n?.emptyState?.[activeColumn];

	// Match the table's display formatting: responder rows show the configured
	// name override and every row is upper-cased by CSS (.childList).
	const pendingRemovalName = pendingRemoval
		? (pendingRemoval.column === 'responders'
				? (responderConfigs[
						getEntryKey(
							'responders',
							pendingRemoval.parent,
							pendingRemoval.child
						)
					]?.name ?? pendingRemoval.child)
				: pendingRemoval.child
			).toUpperCase()
		: '';

	return (
		<Card
			disableHoverEffects
			testId='firewall-zones:manage-firewalls'
		>
			<div className={styles.container}>
				<div className={styles.tableWrapper}>
					<ManageFirewallTabs
						columns={columns}
						activeColumn={activeColumn}
						addTooltip={
							l10n?.addTooltip ?? 'Add Initiators and Responders'
						}
						conflictLabel={
							l10n?.table?.conflictLabel ?? 'Has conflicts'
						}
						columnsWithConflicts={columnsWithConflicts}
						onSelectColumn={column => {
							dispatch(setManageFirewallsColumn(column));
						}}
						onAdd={handleManageFirewalls}
					/>
					{activeGroups.length > 0 ? (
						<FirewallGroupList
							groups={activeGroups}
							activeColumn={activeColumn}
							hasModes={showModes}
							accessModes={
								activeZone?.accessModes ??
								DEFAULT_FIREWALL_ZONE_ACCESS_MODES
							}
							closedRows={closedRows}
							responderConfigs={responderConfigs}
							activeResponderConfig={activeResponderConfig}
							conflictMessages={conflictMessages}
							labels={{
								name: l10n?.table?.name ?? 'NAME',
								supportedModes:
									l10n?.table?.supportedModes ?? 'SUPPORTED MODES',
								configureTooltip:
									l10n?.table?.configureTooltip ?? 'Configure',
								deleteTooltip: l10n?.table?.deleteTooltip ?? 'Remove',
								conflictLabel:
									l10n?.table?.conflictLabel ?? 'Has conflicts'
							}}
							onToggleRow={toggleRow}
							onConfigure={(parent, child) => {
								dispatch(setActiveResponderConfig({parent, child}));
							}}
							onRemove={handleRemoveFirewall}
						/>
					) : (
						<EmptyState
							className={styles.emptyContainer}
							title={emptyState?.title}
							description={emptyState?.description}
							dataTest={`firewall-zones:manage-firewalls:empty-${activeColumn}`}
						>
							<div slot='footer'>
								<Button
									appearance='primary'
									dataTest={`firewall-zones:manage-firewalls:add-${activeColumn}`}
									onClick={handleManageFirewalls}
								>
									{l10n?.addButton ?? 'Add'}
								</Button>
							</div>
						</EmptyState>
					)}
				</div>
			</div>
			<WarningModal
				isOpen={isWarningModalOpen}
				title={`Remove ${pendingRemovalName} ?`}
				description={warningModalL10n?.description}
				dismissLabel={warningModalL10n?.dismiss}
				cancelLabel={warningModalL10n?.cancelButton}
				confirmLabel={warningModalL10n?.removeButton}
				dataTest='firewall-zones:manage-firewalls:delete-warning'
				onConfirm={handleConfirmRemoval}
				onCancel={handleCancelRemoval}
			/>
		</Card>
	);
}

export default ManageFirewallTable;
