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
import {Modal} from '@common/components/modal/Modal';
import {useLocaleContext} from '@common/contexts/LocaleContext';

import type {TLocaleContext} from '../../../../common/types/context';

import styles from './HelpOptionModal.module.scss';

type THelpOptionModalProps = {
	readonly state: {isVisible: boolean; item: string};
	readonly onModalClose: () => void;
};

export default function HelpOptionModal({
	state,
	onModalClose
}: THelpOptionModalProps) {
	const i10n: TLocaleContext | undefined =
		useLocaleContext()?.symbols?.helpModal;

	return (
		<Modal
			isDynamicHeight
			isOpen={state.isVisible}
			handleModalClose={() => {
				onModalClose();
			}}
		>
			<div className={styles.container}>
				<h1>{state.item}</h1>
				<div
					// eslint-disable-next-line react/no-danger
					dangerouslySetInnerHTML={{__html: i10n?.[state.item]}}
					className={styles.content}
				/>
			</div>
		</Modal>
	);
}
