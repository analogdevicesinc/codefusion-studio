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

import {type DFGStream} from 'cfs-plugins-api';
import {Modal} from '../../../../../common/components/modal/Modal';
import {useLocaleContext} from '../../../../../common/contexts/LocaleContext';
import {useMemo} from 'react';
import {getGasketDictionary} from '../../../utils/dfg';
import {useGasketOutputStreamMap} from '../../../state/slices/gaskets/gasket.selector';
import {Button} from 'cfs-react-library';
import {useAppDispatch} from '../../../state/store';
import {removeStream} from '../../../state/slices/gaskets/gasket.reducer';
import styles from './stream-delete-modal.module.scss';

type StreamDeleteModalProps = {
	readonly isOpen: boolean;
	readonly stream: DFGStream | undefined;
	readonly onClose: (deleted: boolean) => void;
};

export function StreamDeleteModal({
	isOpen,
	stream,
	onClose
}: StreamDeleteModalProps) {
	const i10n = useLocaleContext();
	const streams = useGasketOutputStreamMap();
	const dispatch = useAppDispatch();

	const hasTiedStream = useMemo(() => {
		if (!stream) return false;
		const gaskets = getGasketDictionary();

		for (const destination of stream.Destinations) {
			if (
				gaskets[destination.Gasket]?.InputAndOutputBuffersTied &&
				streams[destination.Gasket]?.some(
					s => s.Source.Index === destination.Index
				)
			) {
				return true;
			}
		}

		return false;
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
								dispatch(
									removeStream({StreamId: stream?.StreamId ?? -1})
								);
								onClose(true);
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
