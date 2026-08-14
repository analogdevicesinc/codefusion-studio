/**
 *
 * Copyright (c) 2025-2026 Analog Devices, Inc.
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

import {Modal} from '../../../../../common/components/modal/Modal';
import {useLocaleContext} from '../../../../../common/contexts/LocaleContext';
import {useMemo} from 'react';
import {useStreams} from '../../../state/slices/gaskets/gasket.selector';
import {Button} from 'cfs-react-library';
import {useAppDispatch} from '../../../state/store';
import {
	type DFGStreamUI,
	removeStream
} from '../../../state/slices/gaskets/gasket.reducer';
import {hasTiedStreamDependency} from '../../../utils/dfg-stream-validator';
import styles from './stream-delete-modal.module.scss';

type StreamDeleteModalProps = {
	readonly isOpen: boolean;
	readonly stream: DFGStreamUI | undefined;
	readonly onClose: (deleted: boolean) => void;
};

export function StreamDeleteModal({
	isOpen,
	stream,
	onClose
}: StreamDeleteModalProps) {
	const i10n = useLocaleContext();
	const streams = useStreams();
	const dispatch = useAppDispatch();

	const hasTiedStream = useMemo(() => {
		if (!stream) return false;

		const persistedStream = streams.find(s => s.Uuid === stream.Uuid);

		if (!persistedStream) return false;

		return hasTiedStreamDependency(persistedStream, streams);
	}, [stream, streams]);

	return (
		<Modal
			isOpen={isOpen}
			handleModalClose={() => {
				onClose(false);
			}}
			footer={
				<div className={styles.footer}>
					<Button
						appearance='secondary'
						onClick={() => {
							onClose(false);
						}}
					>
						{i10n?.dfg.deleteConfirmation.cancelButton}
					</Button>
					{!hasTiedStream && (
						<Button
							dataTest='confirm-delete-stream'
							onClick={() => {
								if (stream?.Uuid) {
									dispatch(removeStream({Uuid: stream.Uuid}));
									onClose(true);
								} else {
									onClose(false);
								}
							}}
						>
							{i10n?.dfg.deleteConfirmation.deleteButton}
						</Button>
					)}
				</div>
			}
		>
			<h2 className={styles.title}>
				{hasTiedStream
					? i10n?.dfg.deleteConfirmation.errorTitle
					: i10n?.dfg.deleteConfirmation.title}
			</h2>
			{hasTiedStream && (
				<p className={styles.message}>
					{i10n?.dfg.deleteConfirmation.tiedErrorMessage}
				</p>
			)}
		</Modal>
	);
}
