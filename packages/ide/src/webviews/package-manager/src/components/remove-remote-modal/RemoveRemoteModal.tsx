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

import {Button} from 'cfs-react-library';
import {Modal} from '@common/components/modal/Modal';
import {LocalizedMessage} from '@common/components/l10n/LocalizedMessage';
import {useLocaleContext} from '@common/contexts/LocaleContext';
import styles from './remove-remote-modal.module.scss';

export type RemoveRemoteModalProps = {
	readonly isOpen: boolean;
	/** Name of the custom remote pending removal. */
	readonly remoteName: string;
	/** Disables confirming, e.g. while custom remotes are indexed. */
	readonly isLocked?: boolean;
	readonly onCancel: () => void;
	readonly onConfirm: (name: string) => void;
};

/**
 * Confirmation dialog shown before a custom remote is removed from the
 * package sources. Closing the dialog via the close button, Escape or the
 * backdrop is treated as a cancellation.
 */
export default function RemoveRemoteModal({
	isOpen,
	remoteName,
	isLocked = false,
	onCancel,
	onConfirm
}: RemoveRemoteModalProps) {
	const l10n = useLocaleContext()?.remotes?.removeModal;

	return (
		<div className={styles.container} data-test='remove-remote-modal'>
			<Modal
				isOpen={isOpen}
				handleModalClose={onCancel}
				titleId='remove-remote-modal-title'
				closeLabel={l10n?.close}
				title={
					<LocalizedMessage
						id='remotes.removeModal.title'
						params={{name: remoteName}}
					/>
				}
				footer={
					<>
						<Button
							appearance='secondary'
							dataTest='remove-remote-modal:cancel'
							onClick={onCancel}
						>
							<LocalizedMessage id='remotes.removeModal.cancel' />
						</Button>
						<Button
							appearance='primary'
							dataTest='remove-remote-modal:confirm'
							disabled={isLocked}
							onClick={() => {
								onConfirm(remoteName);
							}}
						>
							<LocalizedMessage id='remotes.removeModal.confirm' />
						</Button>
					</>
				}
			>
				<p className={styles.message}>
					<LocalizedMessage id='remotes.removeModal.message' />
				</p>
			</Modal>
		</div>
	);
}
