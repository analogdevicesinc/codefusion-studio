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

import {useCallback, useEffect, useMemo, useState} from 'react';
import {
	Badge,
	Button,
	DeleteIcon,
	HexInputField,
	InlineEditField,
	TextField,
	Tooltip,
	WarningModal
} from 'cfs-react-library';
import EditIcon from '../../../../../common/icons/Edit';
import ApplicationPackageCard from '../application-package-card/application-package-card';
import {type CustomTLV} from '../../../types/application-packages';
import {useEditableField} from '../../../hooks/use-editable-field';
import styles from './custom-tlv-card.module.scss';
import {
	parseHexTag,
	tagToHexString
} from './validate-custom-tlv-value';
import {
	type TLocaleContext,
	useLocaleContext
} from '../../../../../common/contexts/LocaleContext';
import ConflictIcon from '../../../../../common/icons/Conflict';
import {useCustomTlvValidation} from './use-custom-tlv-validation';
import {
	getDeleteCustomTLVWarning,
	showDeleteCustomTLVWarning
} from '../../../utils/api';
import {MAX_NAME_LENGTH, sanitizeName} from '../constants';

type CustomTLVCardProps = Readonly<{
	customTLV: CustomTLV;
	siblingTlvs?: CustomTLV[];
	labelSize?: 'large' | 'small';
	onDelete: (id: string) => void;
	onUpdate?: (
		id: string,
		updates: Partial<Omit<CustomTLV, 'id'>>
	) => void;
	defaultOpen?: boolean;
}>;

function CustomTLVCard({
	customTLV,
	siblingTlvs,
	labelSize = 'large',
	onDelete,
	onUpdate,
	defaultOpen = false
}: CustomTLVCardProps) {
	const l10n: TLocaleContext | undefined =
		useLocaleContext()?.mcubootConfig?.applicationPackage?.customTlv;
	const [isOpen, setIsOpen] = useState(defaultOpen);
	const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);
	const [shouldShowWarning, setShouldShowWarning] = useState(true);

	const currentTlv = customTLV;

	const updateCustomTLV = useCallback(
		(updates: Partial<Omit<CustomTLV, 'id'>>) => {
			if (onUpdate) {
				onUpdate(customTLV.id, updates);
			}
		},
		[customTLV.id, onUpdate]
	);

	const nameField = useEditableField({
		initialValue: customTLV.name,
		maxLength: MAX_NAME_LENGTH,
		sanitize: sanitizeName,
		onConfirm(value: string) {
			updateCustomTLV({name: value});
		}
	});

	const descriptionField = useEditableField({
		initialValue: customTLV.description ?? '',
		onConfirm(value: string) {
			updateCustomTLV({description: value});
		},
		allowEmpty: true
	});

	const handleTagChange = useCallback(
		(rawValue: string) => {
			updateCustomTLV({tag: parseHexTag(rawValue)});
		},
		[updateCustomTLV]
	);

	const handleValueChange = useCallback(
		(value: string) => {
			updateCustomTLV({value});
		},
		[updateCustomTLV]
	);

	const tagHexValue = useMemo(
		() => tagToHexString(currentTlv.tag),
		[currentTlv.tag]
	);

	const effectiveSiblingTlvs = siblingTlvs ?? [];

	const {tagError, valueError, hasError} = useCustomTlvValidation(
		currentTlv,
		effectiveSiblingTlvs
	);

	const handleDelete = useCallback(
		(isDismissed: boolean) => {
			if (isDismissed) {
				void showDeleteCustomTLVWarning(false);
				setShouldShowWarning(false);
			}

			setIsWarningModalOpen(false);
			onDelete(customTLV.id);
		},
		[customTLV.id, onDelete]
	);

	useEffect(() => {
		getDeleteCustomTLVWarning()
			.then((resp: boolean) => {
				setShouldShowWarning(resp);
			})
			.catch(err => {
				console.error(err);
			});
	}, []);

	return (
		<div className={styles.container}>
			<ApplicationPackageCard
				dataTest={`custom-tlv-card:${customTLV.id}`}
				isOpen={isOpen}
				setOpen={setIsOpen}
			>
				<div slot='title' className={styles.titleSlot}>
					<div className={styles.nameRow}>
						{nameField.isEditing ? (
							<div
								className={styles.nameFieldContainer}
								onClick={e => {
									e.stopPropagation();
								}}
							>
								<InlineEditField
									ref={nameField.inputRef}
									inputVal={nameField.editValue}
									placeholder='Enter TLV name'
									dataTest='edit-tlv-name'
									maxLength={nameField.maxLength}
									onInputChange={nameField.setEditValue}
									onConfirm={nameField.confirmEdit}
									onCancel={nameField.cancelEdit}
								/>
							</div>
						) : (
							<div className={styles.header}>
								<div
									className={styles.editableField}
									data-test={`custom-tlv-card:${customTLV.id}-name`}
									onClick={e => {
										e.stopPropagation();
										nameField.startEditing();
									}}
								>
									<span
										className={`${labelSize === 'small' ? styles.nameSmall : styles.name}`}
									>
										{customTLV.name}
									</span>
									<Button
										appearance='icon'
										className={styles.editButton}
									>
										<EditIcon />
									</Button>
								</div>
								{labelSize === 'large' && (
									<div className={styles.badgeContainer}>
										<Badge appearance='secondary'>
											{l10n?.title}
										</Badge>
									</div>
								)}
							</div>
						)}
					</div>
					<div className={styles.descriptionRow}>
						{descriptionField.isEditing ? (
							<div
								className={styles.descriptionFieldContainer}
								onClick={e => {
									e.stopPropagation();
								}}
							>
								<InlineEditField
									ref={descriptionField.inputRef}
									inputVal={descriptionField.editValue}
									placeholder='Enter description'
									dataTest='edit-tlv-description'
									onInputChange={descriptionField.setEditValue}
									onConfirm={descriptionField.confirmEdit}
									onCancel={descriptionField.cancelEdit}
								/>
							</div>
						) : (
							<div
								className={styles.editableField}
								data-test={`custom-tlv-card:${customTLV.id}-description`}
								onClick={e => {
									e.stopPropagation();
									descriptionField.startEditing();
								}}
							>
								<span
									className={`${labelSize === 'small' ? styles.descriptionSmall : styles.description}`}
								>
									{customTLV.description?.trim()
										? customTLV.description
										: l10n?.descriptionPlaceholder}
								</span>
								<Button
									appearance='icon'
									className={styles.editButton}
								>
									<EditIcon />
								</Button>
							</div>
						)}
					</div>
				</div>
				<div slot='end' className={styles.endSlot}>
					{hasError && <ConflictIcon />}
					<Tooltip
						title={l10n?.delete}
						position='bottom'
						type='long'
						width={65}
					>
						<Button
							appearance='icon'
							dataTest='delete-custom-tlv'
							onClick={e => {
								e.stopPropagation();

								if (shouldShowWarning) {
									setIsWarningModalOpen(true);
								} else {
									handleDelete(false);
								}
							}}
						>
							<DeleteIcon />
						</Button>
					</Tooltip>
				</div>
				<div slot='content'>
					<div className={styles.formContainer}>
						<div
							className={`${labelSize === 'small' ? styles.tagFieldSmall : styles.tagField}`}
						>
							<label>{l10n?.fields?.tag}</label>
							<HexInputField
								value={tagHexValue}
								dataTest='custom-tlv-tag'
								error={tagError}
								placeholder='0000'
								onValueChange={handleTagChange}
							/>
						</div>
						<div
							className={`${labelSize === 'small' ? styles.valueFieldSmall : styles.valueField}`}
						>
							<label>{l10n?.fields?.value}</label>
							<span
								className={
									labelSize === 'small'
										? styles.infoTextSmall
										: styles.infoText
								}
							>
								{l10n?.info?.description}
							</span>
							<TextField
								inputVal={currentTlv.value}
								placeholder={l10n?.fields?.valuePlaceholder}
								error={valueError}
								dataTest='custom-tlv-value'
								onInputChange={handleValueChange}
							/>
						</div>
					</div>
				</div>
			</ApplicationPackageCard>
			<WarningModal
				isOpen={isWarningModalOpen}
				title={`Delete ${currentTlv.name} ?`}
				description={l10n?.warningModal?.description}
				dismissLabel={l10n?.warningModal?.dismiss}
				cancelLabel={l10n?.warningModal?.cancelButton}
				confirmLabel={l10n?.warningModal?.deleteButton}
				dataTest='delete-custom-tlv-warning'
				onConfirm={handleDelete}
				onCancel={() => {
					setIsWarningModalOpen(false);
				}}
			/>
		</div>
	);
}

export default CustomTLVCard;
