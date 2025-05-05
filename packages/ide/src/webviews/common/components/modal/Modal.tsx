/**
 *
 * Copyright (c) 2024 Analog Devices, Inc.
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
import {Button} from 'cfs-react-library';
import {useRef, type ReactNode, useEffect} from 'react';
import CloseIcon from '@common/components/icons/CloseIcon';

import styles from './modal.module.scss';

export type ModalProps = {
	readonly isOpen: boolean;
	readonly handleModalClose: () => void;
	readonly children: ReactNode;
	readonly footer?: ReactNode;
};

export function Modal({
	isOpen,
	footer,
	handleModalClose,
	children
}: ModalProps) {
	const modalRef = useRef<HTMLDialogElement>(null);

	useEffect(() => {
		const dialog = modalRef.current;

		if (isOpen) {
			dialog?.showModal();
		} else {
			dialog?.close();
		}

		return () => {
			dialog?.close();
		};
	}, [isOpen]);

	return (
		<dialog
			ref={modalRef}
			className={styles.modal}
			onClick={e => {
				if (e.target === modalRef.current) {
					modalRef.current?.close();
					handleModalClose();
				}
			}}
			onKeyDown={e => {
				if (e.key === 'Escape') {
					modalRef.current?.close();
					handleModalClose();
				}
			}}
		>
			<div className={styles.innerModal} data-test='inner-modal'>
				<div className={styles.modalHeader}>
					<Button
						appearance='icon'
						className={styles.closeButton}
						onClick={() => {
							modalRef.current?.close();
							handleModalClose();
						}}
					>
						<CloseIcon />
					</Button>
				</div>
				<div className={styles.modalBody}>{children}</div>
				{footer && <div className={styles.modalFooter}>{footer}</div>}
			</div>
		</dialog>
	);
}
