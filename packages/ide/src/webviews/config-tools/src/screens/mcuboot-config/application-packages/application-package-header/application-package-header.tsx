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

import {InlineEditField, WarningModal} from 'cfs-react-library';
import EditIcon from '../../../../../../common/icons/Edit';
import {useActiveApplicationPackage} from '../../../../state/slices/application-packages/applicationPackages.selector';
import {
	updateApplicationPackage,
	removeApplicationPackage
} from '../../../../state/slices/application-packages/applicationPackages.reducer';
import {useAppDispatch} from '../../../../state/store';
import styles from '../application-packages.module.scss';
import {useCallback, useEffect, useRef, useState} from 'react';
import {MAX_NAME_LENGTH, sanitizeName} from '../../constants';
import {useEditableField} from '../../../../hooks/use-editable-field';
import {
	getDeleteAppPackWarning,
	showDeleteAppPackWarning
} from '../../../../utils/api';
import {
	type TLocaleContext,
	useLocaleContext
} from '../../../../../../common/contexts/LocaleContext';
import useApplicationPackageErrorCount from '../../../../hooks/use-application-package-error-count';
import ErrorCount from '../../../peripheral-config/config-sidebar/error-count/error-count';
import ApplicationPackageHeaderTitle from './application-package-header-title/application-package-header-title';

type ApplicationPackageHeaderProps = {
	readonly onAddImage: () => void;
	readonly scrollContainerRef: React.RefObject<HTMLDivElement>;
};

function ApplicationPackageHeader({
	onAddImage,
	scrollContainerRef
}: ApplicationPackageHeaderProps) {
	const dispatch = useAppDispatch();
	const activePackage = useActiveApplicationPackage();
	const headerRef = useRef<HTMLDivElement>(null);
	const [isSticky, setIsSticky] = useState(false);
	const l10n: TLocaleContext | undefined =
		useLocaleContext()?.mcubootConfig?.applicationPackage
			?.warningModal;

	const errorCount = useApplicationPackageErrorCount(activePackage);

	const [shouldShowWarning, setShouldShowWarning] = useState(true);
	const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);

	const nameField = useEditableField({
		initialValue: activePackage?.name ?? '',
		maxLength: MAX_NAME_LENGTH,
		sanitize: sanitizeName,
		onConfirm(value: string) {
			if (!activePackage) return;
			dispatch(
				updateApplicationPackage({
					id: activePackage.id,
					updates: {name: value}
				})
			);
		}
	});

	const descriptionField = useEditableField({
		initialValue: activePackage?.description ?? '',
		onConfirm(value: string) {
			if (!activePackage) return;
			dispatch(
				updateApplicationPackage({
					id: activePackage.id,
					updates: {description: value}
				})
			);
		},
		allowEmpty: true
	});

	const handleToggleEnabled = useCallback(() => {
		if (!activePackage) return;
		dispatch(
			updateApplicationPackage({
				id: activePackage.id,
				updates: {enabled: !activePackage.enabled}
			})
		);
	}, [activePackage, dispatch]);

	const handleRemovePackage = useCallback(
		(isDismissed: boolean) => {
			if (!activePackage) return;

			if (isDismissed) {
				void showDeleteAppPackWarning(false);
				setShouldShowWarning(false);
			}

			setIsWarningModalOpen(false);
			dispatch(
				removeApplicationPackage({
					id: activePackage.id
				})
			);
		},
		[activePackage, dispatch]
	);

	const handleAddClick = useCallback(() => {
		onAddImage();
	}, [onAddImage]);

	useEffect(() => {
		nameField.cancelEdit();
		descriptionField.cancelEdit();
		// eslint-disable-next-line react-hooks/exhaustive-deps -- only reset on package switch, callbacks are stable
	}, [activePackage?.id]);

	useEffect(() => {
		getDeleteAppPackWarning()
			.then((resp: boolean) => {
				setShouldShowWarning(resp);
			})
			.catch(err => {
				console.error(err);
			});
	}, []);

	useEffect(() => {
		const container = scrollContainerRef.current;
		const header = headerRef.current;

		if (!container || !header) return;

		const observer = new IntersectionObserver(
			([entry]) => {
				setIsSticky(!entry.isIntersecting);
			},
			{
				root: container,
				threshold: 0
			}
		);

		observer.observe(header);

		return () => {
			observer.disconnect();
		};
	}, [scrollContainerRef]);

	return (
		<>
			{isSticky && activePackage && (
				<div
					className={styles.stickyHeader}
					data-test='mcuboot-config:sticky-header'
				>
					<ApplicationPackageHeaderTitle
						name={activePackage.name}
						nameField={nameField}
						hasError={errorCount > 0}
						isEnabled={Boolean(activePackage.enabled)}
						onToggleEnabled={handleToggleEnabled}
						onAddClick={handleAddClick}
						onDelete={() => {
							if (shouldShowWarning) {
								setIsWarningModalOpen(true);
							} else {
								handleRemovePackage(false);
							}
						}}
					/>
				</div>
			)}
			<div ref={headerRef} className={styles.appPackageHeader}>
				{activePackage && (
					<ApplicationPackageHeaderTitle
						name={activePackage.name}
						nameField={nameField}
						isEditable={!isSticky}
						isEnabled={Boolean(activePackage.enabled)}
						onToggleEnabled={handleToggleEnabled}
						onAddClick={handleAddClick}
						onDelete={() => {
							if (shouldShowWarning) {
								setIsWarningModalOpen(true);
							} else {
								handleRemovePackage(false);
							}
						}}
					/>
				)}
				<div className={styles.description}>
					{activePackage &&
						(descriptionField.isEditing ? (
							<InlineEditField
								ref={descriptionField.inputRef}
								inputVal={descriptionField.editValue}
								placeholder='Enter description'
								dataTest='edit-package-description'
								onInputChange={descriptionField.setEditValue}
								onConfirm={descriptionField.confirmEdit}
								onCancel={descriptionField.cancelEdit}
							/>
						) : (
							<div
								className={styles.editableField}
								data-test='app-packages-summary:edit-description-trigger'
								onClick={descriptionField.startEditing}
							>
								<span>
									{activePackage.description?.trim()
										? activePackage.description
										: 'Click to add a description'}
								</span>
								<span className={styles.editIconSmall}>
									<EditIcon />
								</span>
							</div>
						))}
				</div>
				{errorCount > 0 ? (
					<div className={styles.errorContainer}>
						<ErrorCount count={errorCount} />
					</div>
				) : (
					<div className={styles.errorPlaceholder} />
				)}
			</div>
			<WarningModal
				isOpen={isWarningModalOpen}
				title={`Delete ${activePackage?.name} ?`}
				description={l10n?.description}
				dismissLabel={l10n?.dismiss}
				cancelLabel={l10n?.cancelButton}
				confirmLabel={l10n?.deleteButton}
				dataTest='delete-app-pack-warning'
				onConfirm={handleRemovePackage}
				onCancel={() => {
					setIsWarningModalOpen(false);
				}}
			/>
		</>
	);
}

export default ApplicationPackageHeader;
