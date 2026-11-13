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
import {localizeMessage} from '@common/utils/localization';
import type {SruReroute} from '../../../../types/sru';
import {useConnectionDetailsL10n} from './use-connection-details-l10n';
import styles from './reroute-confirm-dialog.module.scss';

type RerouteConfirmDialogProps = {
	readonly isOpen: boolean;
	readonly newOutput: string;
	readonly reroutes: SruReroute[];
	readonly onConfirm: () => void;
	readonly onCancel: () => void;
};

/**
 * Warns before saving output connection details when staged inputs would
 * be re-routed away from another user-modified output.
 */
export function RerouteConfirmDialog({
	isOpen,
	newOutput,
	reroutes,
	onConfirm,
	onCancel
}: RerouteConfirmDialogProps) {
	const detailsL10n = useConnectionDetailsL10n();

	if (!isOpen) {
		return null;
	}

	const rerouteL10n = detailsL10n?.rerouteWarning as
		| {
				cancelButton?: string;
				confirmButton?: string;
				continueQuestion?: string;
		  }
		| undefined;
	const countKey = reroutes.length === 1 ? 'one' : 'other';

	const title = localizeMessage(
		detailsL10n,
		`rerouteWarning.title.${countKey}`
	);
	const intro = localizeMessage(
		detailsL10n,
		`rerouteWarning.intro.${countKey}`,
		{newOutput}
	);

	return (
		<Modal
			isOpen={isOpen}
			title={title}
			handleModalClose={onCancel}
			footer={
				<>
					<Button
						appearance='secondary'
						dataTest='reroute-confirm-cancel'
						onClick={onCancel}
					>
						{rerouteL10n?.cancelButton ?? 'Cancel'}
					</Button>
					<Button
						appearance='primary'
						dataTest='reroute-confirm-confirm'
						onClick={onConfirm}
					>
						{rerouteL10n?.confirmButton ?? 'Confirm and Reroute'}
					</Button>
				</>
			}
		>
			<div
				className={styles.content}
				data-test='reroute-confirm-dialog'
			>
				<p>{intro}</p>
				<ul className={styles.rerouteList}>
					{reroutes.map(reroute => (
						<li
							key={reroute.input}
							data-test={`reroute-item-${reroute.input}`}
						>
							{reroute.previousOutput} → {reroute.input}
						</li>
					))}
				</ul>
				<p>{rerouteL10n?.continueQuestion}</p>
			</div>
		</Modal>
	);
}
