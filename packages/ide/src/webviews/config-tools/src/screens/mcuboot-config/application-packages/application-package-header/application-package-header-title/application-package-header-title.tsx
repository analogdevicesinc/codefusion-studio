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
	Button,
	ConflictIcon,
	DeleteIcon,
	InlineEditField,
	PlusIcon,
	Tooltip
} from 'cfs-react-library';
import Toggle from '../../../../../../../common/components/toggle/Toggle';
import EditIcon from '../../../../../../../common/icons/Edit';
import styles from '../../application-packages.module.scss';
import type {EditableField} from '../../../../../hooks/use-editable-field';
import {
	type TLocaleContext,
	useLocaleContext
} from '../../../../../../../common/contexts/LocaleContext';

type ApplicationPackageHeaderTitleProps = {
	readonly name: string;
	readonly nameField: EditableField;
	readonly isEditable?: boolean;
	readonly hasError?: boolean;
	readonly isEnabled: boolean;
	readonly onToggleEnabled: () => void;
	readonly onAddClick: () => void;
	readonly onDelete: () => void;
};

function ApplicationPackageHeaderTitle({
	name,
	nameField,
	isEditable = true,
	hasError = false,
	isEnabled,
	onToggleEnabled,
	onAddClick,
	onDelete
}: ApplicationPackageHeaderTitleProps) {
	const l10n: TLocaleContext | undefined =
		useLocaleContext()?.mcubootConfig?.applicationPackage;

	return (
		<div className={styles.titleContainer}>
			<div className={styles.title}>
				{isEditable && nameField.isEditing ? (
					<InlineEditField
						ref={nameField.inputRef}
						inputVal={nameField.editValue}
						placeholder='Enter package name'
						dataTest='edit-package-name'
						maxLength={nameField.maxLength}
						onInputChange={nameField.setEditValue}
						onConfirm={nameField.confirmEdit}
						onCancel={nameField.cancelEdit}
					/>
				) : (
					<div
						className={styles.editableField}
						data-test='app-packages-summary:edit-name-trigger'
						onClick={() => {
							if (isEditable) {
								nameField.startEditing();
							}
						}}
					>
						<span>{name}</span>
						{isEditable && (
							<span className={styles.editIconSmall}>
								<EditIcon />
							</span>
						)}
					</div>
				)}
			</div>
			<div className={styles.actions}>
				{hasError && <ConflictIcon />}
				<Tooltip
					title={
						isEnabled ? l10n?.disableAppPack : l10n?.enableAppPack
					}
					type='long'
					width={95}
					position='bottom'
				>
					<Toggle
						isToggledOn={isEnabled}
						handleToggle={onToggleEnabled}
						dataTest='app-packages-summary:enabled-toggle'
					/>
				</Tooltip>
				<Tooltip
					title={l10n?.addImage}
					type='short'
					position='bottom'
				>
					<Button
						appearance='icon'
						dataTest='app-packages-summary:add-app-pack-button'
						onClick={e => {
							e.stopPropagation();
							onAddClick();
						}}
					>
						<PlusIcon />
					</Button>
				</Tooltip>
				<Tooltip
					title={l10n?.deleteAppPack}
					type='long'
					width={90}
					position='bottom'
				>
					<Button
						appearance='icon'
						dataTest='app-packages-summary:remove-app-pack-button'
						onClick={onDelete}
					>
						<DeleteIcon />
					</Button>
				</Tooltip>
			</div>
		</div>
	);
}

export default ApplicationPackageHeaderTitle;
