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
import {VSCodeTextField} from '@vscode/webview-ui-toolkit/react';
import type {ChangeEvent} from 'react';

import SearchIcon from '@common/icons/Search';
import DeleteIcon from '@common/icons/Delete';
import EditIcon from '@common/icons/Edit';

import type {TSavedQuery} from '../../../../common/types/symbols';
import styles from './SavedQueryContainer.module.scss';
import {Button, Divider} from 'cfs-react-library';

type TSavedQueriesContainerProps = {
	readonly queryToFilter: string;
	readonly queries: TSavedQuery[];
	readonly onInputChange: (
		event: ChangeEvent<HTMLInputElement>
	) => void;
	readonly onItemClick: (item: TSavedQuery) => void;
	readonly onActionClick: (
		item: TSavedQuery,
		type: 'edit' | 'delete'
	) => void;
};

export default function SavedQueryContainer({
	queryToFilter,
	queries,
	onInputChange,
	onItemClick,
	onActionClick
}: TSavedQueriesContainerProps) {
	const getFilteredQueries = (): TSavedQuery[] =>
		queries.filter(
			item =>
				item?.value
					?.toLowerCase()
					.includes(queryToFilter?.toLowerCase()) ||
				item?.name
					?.toLowerCase()
					.includes(queryToFilter?.toLowerCase())
		);

	return (
		<>
			<VSCodeTextField
				className={styles.input}
				type='text'
				placeholder='Search'
				name='save-query'
				value={queryToFilter}
				onInput={event => {
					onInputChange(event as ChangeEvent<HTMLInputElement>);
				}}
			>
				<span slot='start' className={styles.icon}>
					<SearchIcon />
				</span>
			</VSCodeTextField>
			<Divider />
			<ul className={styles.list}>
				{getFilteredQueries().map(item => (
					<li key={item.id} className={styles.item}>
						<div
							className={styles.container}
							onClick={() => {
								onItemClick(item);
							}}
						>
							<div className={`${styles.name} ${styles.ellipsis}`}>
								{item?.name ? item?.name : '<no name>'}
							</div>
							<div className={`${styles.value} ${styles.ellipsis}`}>
								{item?.value ? item?.value : '<no query>'}
							</div>
						</div>
						<div className={styles['action-buttons']}>
							<Button
								appearance='icon'
								dataTest='symbols:saved-query-container:edit-query'
								className={styles.icon}
								onClick={() => {
									onActionClick(item, 'edit');
								}}
							>
								<EditIcon />
							</Button>
							<Button
								appearance='icon'
								className={styles.icon}
								dataTest='symbols:saved-query-container:delete-query'
								onClick={() => {
									onActionClick(item, 'delete');
								}}
							>
								<DeleteIcon />
							</Button>
						</div>
					</li>
				))}
			</ul>
		</>
	);
}
