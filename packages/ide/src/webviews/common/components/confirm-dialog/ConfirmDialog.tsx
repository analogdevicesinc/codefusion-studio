/**
 *
 * Copyright (c) 2025 Analog Devices, Inc.
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

import {Button, CheckBox} from 'cfs-react-library';
import styles from './ConfirmDialog.module.scss';
import {Modal} from '../modal/Modal';
import {useCallback, useEffect, useState} from 'react';
import {getPreference, setPreference} from '../../api';

export type ConfirmDialogProps = {
	readonly isOpen: boolean;
	readonly title: string;
	readonly message: string;
	readonly confirmButtonText?: string;
	readonly cancelButtonText?: string;
	/**
	 * Optional ID of a vscode preference.
	 * If provided, the dialog will check the preference before showing and also offer a don't show again checkbox.
	 * If the preference is set to false it will call onConfirm directly whe showing.
	 */
	readonly showDialogPreferenceId?: string;
	readonly onConfirm: () => void;
	readonly onCancel: () => void;
};

export function ConfirmDialog({
	isOpen: shouldShow,
	title,
	message,
	showDialogPreferenceId,
	confirmButtonText,
	cancelButtonText,
	onConfirm,
	onCancel
}: ConfirmDialogProps) {
	const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
	const [checkboxChecked, setCheckboxChecked] = useState(false);

	useEffect(() => {
		setCheckboxChecked(false);
	}, [isDialogOpen, setCheckboxChecked]);

	useEffect(() => {
		if (showDialogPreferenceId) {
			if (shouldShow) {
				getPreference(showDialogPreferenceId)
					.then(doShow => {
						if (doShow) {
							setIsDialogOpen(true);
						} else {
							onConfirm();
						}
					})
					.catch(() => {
						console.error(
							`Failed to get preference for ${showDialogPreferenceId}`
						);
					});
			} else {
				setIsDialogOpen(false);
			}
		} else {
			setIsDialogOpen(shouldShow);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [shouldShow, showDialogPreferenceId]);

	const saveShowAgainChoice = useCallback(() => {
		if (showDialogPreferenceId && checkboxChecked) {
			setPreference(showDialogPreferenceId, false).catch(() => {
				console.error(
					`Failed to set preference for ${showDialogPreferenceId}`
				);
			});
		}
	}, [showDialogPreferenceId, checkboxChecked]);

	return (
		<Modal
			isOpen={isDialogOpen}
			handleModalClose={() => {
				onCancel();
			}}
		>
			<div className={styles.dialogContent}>
				<h2>{title}</h2>
				<p>{message}</p>
				{showDialogPreferenceId && (
					<CheckBox
						className={styles.dontShowAgainCheckbox}
						checked={checkboxChecked}
						onChange={() => {
							setCheckboxChecked(!checkboxChecked);
						}}
					>
						Don&apos;t show this message again
					</CheckBox>
				)}
				<div className={styles.buttonGroup}>
					<Button
						appearance='secondary'
						onClick={() => {
							onCancel();
						}}
					>
						{cancelButtonText ?? 'Cancel'}
					</Button>
					<Button
						onClick={() => {
							saveShowAgainChoice();
							onConfirm();
						}}
					>
						{confirmButtonText ?? 'Confirm'}
					</Button>
				</div>
			</div>
		</Modal>
	);
}
