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

import {useCallback, useEffect, useState} from 'react';
import {
	Button,
	ConflictIcon,
	DeleteIcon,
	InlineEditField,
	Tooltip,
	WarningModal,
	EditIcon
} from 'cfs-react-library';
import ManageAccessModes from '../manage-access-modes/manage-access-modes';
import ManageFirewallTable from '../manage-firewall-table/manage-firewall-table';
import {
	type TLocaleContext,
	useLocaleContext
} from '../../../../../../common/contexts/LocaleContext';
import {localizeMessage} from '../../../../../../common/utils/localization';
import {formatAccessModeConflictMessage} from '../../firewall-conflict-messages';
import {
	useActiveFirewallZone,
	useActiveZoneAccessModeConflicts,
	useActiveZoneOverlapConflicts,
	useFirewallZones
} from '../../../../state/slices/firewall/firewall.selector';
import {
	removeFirewallZone,
	updateFirewallZone
} from '../../../../state/slices/firewall/firewall.reducer';
import {useAppDispatch} from '../../../../state/store';
import {useEditableField} from '../../../../hooks/use-editable-field';
import {
	getDeleteFirewallZoneWarning,
	showDeleteFirewallZoneWarning
} from '../../../../utils/api';
import {
	MAX_FIREWALL_ZONE_NAME_LENGTH,
	sanitizeFirewallZoneName
} from '../constants';
import styles from './firewall-zone-details.module.scss';

function FirewallZoneDetails() {
	const dispatch = useAppDispatch();
	const activeZone = useActiveFirewallZone();
	const l10n: TLocaleContext | undefined =
		useLocaleContext()?.firewallZones;
	const warningModalL10n: TLocaleContext | undefined =
		l10n?.warningModal;
	const overlapConflicts = useActiveZoneOverlapConflicts();
	const overlapCount = Object.keys(overlapConflicts).length;
	const accessModeConflicts = useActiveZoneAccessModeConflicts();
	const firewallZones = useFirewallZones();

	const [shouldShowWarning, setShouldShowWarning] = useState(true);
	const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);

	// Zone ids are regenerated on load, so the name is a zone's only stable
	// identity in the persisted config and has to stay unique.
	const validateZoneName = useCallback(
		(value: string): string | undefined => {
			const normalized = value.trim().toLowerCase();

			if (!normalized) return undefined;

			const isTaken = firewallZones.some(
				zone =>
					zone.id !== activeZone?.id &&
					zone.name.trim().toLowerCase() === normalized
			);

			return isTaken
				? localizeMessage(l10n, 'duplicateZoneName', {
						name: value.trim()
					})
				: undefined;
		},
		[firewallZones, activeZone?.id, l10n]
	);

	const nameField = useEditableField({
		initialValue: activeZone?.name ?? '',
		maxLength: MAX_FIREWALL_ZONE_NAME_LENGTH,
		sanitize: sanitizeFirewallZoneName,
		validate: validateZoneName,
		onConfirm(value: string) {
			if (!activeZone) return;
			dispatch(
				updateFirewallZone({
					id: activeZone.id,
					updates: {name: value}
				})
			);
		}
	});

	const descriptionField = useEditableField({
		initialValue: activeZone?.description ?? '',
		allowEmpty: true,
		onConfirm(value: string) {
			if (!activeZone) return;
			dispatch(
				updateFirewallZone({
					id: activeZone.id,
					updates: {description: value}
				})
			);
		}
	});

	useEffect(() => {
		nameField.cancelEdit();
		descriptionField.cancelEdit();
		// eslint-disable-next-line react-hooks/exhaustive-deps -- only reset on zone switch, callbacks are stable
	}, [activeZone?.id]);

	useEffect(() => {
		getDeleteFirewallZoneWarning()
			.then((resp: boolean) => {
				setShouldShowWarning(resp);
			})
			.catch(err => {
				console.error(err);
			});
	}, []);

	if (!activeZone) return null;

	const handleDelete = (isDismissed: boolean) => {
		if (!activeZone) return;

		if (isDismissed) {
			void showDeleteFirewallZoneWarning(false);
			setShouldShowWarning(false);
		}

		setIsWarningModalOpen(false);
		dispatch(removeFirewallZone({id: activeZone.id}));
	};

	const handleDeleteClick = () => {
		if (shouldShowWarning) {
			setIsWarningModalOpen(true);
		} else {
			handleDelete(false);
		}
	};

	return (
		<div
			className={styles.container}
			data-test={`firewall-zones:details:${activeZone.id}`}
		>
			<div className={styles.firewallZoneContainer}>
				<div className={styles.firewallZoneHeader}>
					<div className={styles.titleContainer}>
						<div className={styles.title}>
							{nameField.isEditing ? (
								<InlineEditField
									ref={nameField.inputRef}
									inputVal={nameField.editValue}
									placeholder='Enter zone name'
									dataTest='firewall-zones:details:edit-name'
									maxLength={nameField.maxLength}
									error={nameField.error}
									onInputChange={nameField.setEditValue}
									onConfirm={nameField.confirmEdit}
									onCancel={nameField.cancelEdit}
								/>
							) : (
								<div
									className={styles.editableField}
									data-test='firewall-zones:details:edit-name-trigger'
									onClick={nameField.startEditing}
								>
									<span>{activeZone.name}</span>
									<span>
										<EditIcon />
									</span>
								</div>
							)}
						</div>
						<div className={styles.actions}>
							<Tooltip
								title={l10n?.deleteZone}
								type='short'
								position='bottom'
							>
								<Button
									appearance='icon'
									dataTest='firewall-zones:details:delete'
									onClick={handleDeleteClick}
								>
									<DeleteIcon />
								</Button>
							</Tooltip>
						</div>
					</div>
					<div className={styles.description}>
						{descriptionField.isEditing ? (
							<InlineEditField
								ref={descriptionField.inputRef}
								inputVal={descriptionField.editValue}
								placeholder='Enter description'
								dataTest='firewall-zones:details:edit-description'
								onInputChange={descriptionField.setEditValue}
								onConfirm={descriptionField.confirmEdit}
								onCancel={descriptionField.cancelEdit}
							/>
						) : (
							<div
								className={styles.editableField}
								data-test='firewall-zones:details:edit-description-trigger'
								onClick={descriptionField.startEditing}
							>
								<span>
									{activeZone.description.trim()
										? activeZone.description
										: 'Add a description'}
								</span>
								<span>
									<EditIcon />
								</span>
							</div>
						)}
					</div>
					{overlapCount > 0 ? (
						<div
							className={styles.conflictBanner}
							data-test='firewall-zones:details:conflict-banner'
						>
							<span className={styles.conflictBannerIcon}>
								<ConflictIcon width={16} height={16} />
							</span>
							<span className={styles.conflictBannerMessage}>
								{localizeMessage(l10n, 'zoneOverlapBanner', {
									count: String(overlapCount)
								})}
							</span>
						</div>
					) : null}
					{accessModeConflicts.map(conflict => (
						<div
							key={`${conflict.initiatorKey}|${conflict.responderKey}`}
							className={styles.conflictBanner}
							data-test={`firewall-zones:details:access-mode-conflict-${conflict.initiatorName}-${conflict.responderName}`}
						>
							<span className={styles.conflictBannerIcon}>
								<ConflictIcon width={16} height={16} />
							</span>
							<span className={styles.conflictBannerMessage}>
								{formatAccessModeConflictMessage(l10n, conflict)}
							</span>
						</div>
					))}
				</div>
				<ManageAccessModes />
				<ManageFirewallTable />
			</div>
			<WarningModal
				isOpen={isWarningModalOpen}
				title={`Delete ${activeZone.name} ?`}
				description={warningModalL10n?.description}
				dismissLabel={warningModalL10n?.dismiss}
				cancelLabel={warningModalL10n?.cancelButton}
				confirmLabel={warningModalL10n?.deleteButton}
				dataTest='firewall-zones:details:delete-warning'
				onConfirm={handleDelete}
				onCancel={() => {
					setIsWarningModalOpen(false);
				}}
			/>
		</div>
	);
}

export default FirewallZoneDetails;
