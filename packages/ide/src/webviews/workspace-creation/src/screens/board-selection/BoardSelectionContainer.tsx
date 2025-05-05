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

import BoardList from './BoardList';

import {
	useConfigurationErrors,
	useSelectedSoc
} from '../../state/slices/workspace-config/workspace-config.selector';
import NotificationError from '../../components/notification-error/NotificationError';
import {getBoardList} from '../../utils/board-list';

import styles from './BoardSelectionContainer.module.scss';

export default function BoardSelectionContainer() {
	const selectedSoc = useSelectedSoc();
	const boardList = getBoardList(selectedSoc);
	const errors = useConfigurationErrors('boardPackage');

	return (
		<>
			<NotificationError
				error={errors}
				testId='board-selection-error'
			/>

			<div
				data-test='board-selection:container'
				className={styles.boardContainer}
			>
				<div className={styles.listsContainer}>
					<section className={styles.list}>
						<h2>Standard Boards and Packages</h2>

						<BoardList list={boardList.standard} />
					</section>

					<section className={styles.list}>
						<h2>Custom Board Packages</h2>

						<BoardList list={boardList.custom} />
					</section>
				</div>
			</div>
		</>
	);
}
