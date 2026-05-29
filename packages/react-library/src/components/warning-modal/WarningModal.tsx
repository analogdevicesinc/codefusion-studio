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

import {useCallback, useEffect, useRef, useState} from 'react';
import Button from '../button/button';
import CheckBox from '../checkbox/checkbox';
import CloseIcon from '../icons/close-icon';
import styles from './WarningModal.module.scss';

export type WarningModalProps = Readonly<{
	isOpen: boolean;
	title: string;
	description?: string;
	dismissLabel?: string;
	cancelLabel?: string;
	confirmLabel?: string;
	dataTest?: string;
	onConfirm: (isDismissed: boolean) => void;
	onCancel: () => void;
}>;

export default function WarningModal({
	isOpen,
	title,
	description,
	dismissLabel = "Don't show this again",
	cancelLabel = 'Cancel',
	confirmLabel = 'Delete',
	dataTest,
	onConfirm,
	onCancel
}: WarningModalProps) {
	const modalRef = useRef<HTMLDialogElement>(null);
	const [isDismissed, setIsDismissed] = useState(false);

	useEffect(() => {
		const dialog = modalRef.current;

		if (isOpen) {
			setIsDismissed(false);
			dialog?.showModal();
		} else {
			dialog?.close();
		}

		return () => {
			dialog?.close();
		};
	}, [isOpen]);

	const handleCheckboxChange = useCallback(
		(event: Event | React.FormEvent<HTMLElement>) => {
			const {target} = event as React.ChangeEvent<HTMLInputElement>;
			setIsDismissed(target.checked);
		},
		[]
	);

	const handleConfirm = useCallback(() => {
		onConfirm(isDismissed);
	}, [isDismissed, onConfirm]);

	return (
		<dialog
			ref={modalRef}
			className={styles.modal}
			data-test={dataTest}
			onClick={e => {
				if (e.target === modalRef.current) {
					modalRef.current?.close();
					onCancel();
				}
			}}
			onKeyDown={e => {
				if (e.key === 'Escape') {
					modalRef.current?.close();
					onCancel();
				}
			}}
		>
			<div className={styles.innerModal}>
				<div className={styles.modalHeader}>
					<Button
						appearance='icon'
						onClick={() => {
							modalRef.current?.close();
							onCancel();
						}}
					>
						<CloseIcon />
					</Button>
				</div>
				<div className={styles.modalBody}>
					<div className={styles.warningModalContainer}>
						<div className={styles.warningModalDescription}>
							<h1>{title}</h1>
							{description && <span>{description}</span>}
						</div>
						<div>
							<CheckBox
								checked={isDismissed}
								onChange={handleCheckboxChange}
							>
								<div className={styles.checkboxText}>
									{dismissLabel}
								</div>
							</CheckBox>
						</div>
					</div>
				</div>
				<div className={styles.modalFooter}>
					<Button appearance='secondary' onClick={onCancel}>
						{cancelLabel}
					</Button>
					<Button
						appearance='primary'
						dataTest={
							dataTest ? `${dataTest}:confirm-btn` : undefined
						}
						onClick={handleConfirm}
					>
						{confirmLabel}
					</Button>
				</div>
			</div>
		</dialog>
	);
}
