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
import {
	type ChangeEvent,
	useState,
	useEffect,
	useCallback
} from 'react';

// Components
import SavedQueriesDropdown from '../SavedQueriesDropdown/SavedQueriesDropdown';
import SaveEditQueryModal from '../SaveEditQueryModal/SaveEditQueryModal';
import QueryFilterInput from '../QueryFilterInput/QueryFilterInput';
import {Modal} from '@common/components/modal/Modal';
import {Button} from 'cfs-react-library';

import {
	getQueries,
	getSymbols,
	showErrorMessage,
	showInformationMessage,
	updateQueries
} from '../../../../common/api';

import type {TSavedQuery} from '../../../../common/types/symbols';
import styles from './SymbolsFilters.module.scss';

type TSymbolsFiltersProps = {
	readonly queryToSet: string;
	readonly error: string | undefined;
	readonly emitQuery: (query: string) => void;
};

export default function SymbolsFilters({
	queryToSet,
	error,
	emitQuery
}: TSymbolsFiltersProps) {
	const [query, setQuery] = useState<string>('');
	const [isSaveModalOpen, setIsSaveModalOpen] =
		useState<boolean>(false);
	const [queryToSave, setQueryToSave] = useState<TSavedQuery>({
		id: 0,
		name: '',
		value: query
	});
	const [dbError, setDbError] = useState<string>('');
	const [savedQueries, setSavedQueries] = useState<TSavedQuery[]>([]);
	const [isCheckQueryValidity, setIsCheckQueryValidity] =
		useState<boolean>(true);

	useEffect(() => {
		setQuery(queryToSet);
		getSavedQueries();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		setQuery(queryToSet);
		setQueryToSave(prev => ({
			...prev,
			value: queryToSet
		}));
	}, [queryToSet]);

	const getSavedQueries = () => {
		getQueries()
			.then((response: TSavedQuery[]) => {
				setSavedQueries(response);
			})
			.catch((err: string) => {
				console.error(err);
				throw new Error(
					'An eror occurred retrieving the saved queries. Please try again!'
				);
			});
	};

	const postQueries = (
		queryName: string,
		data: TSavedQuery[],
		action: string
	) => {
		updateQueries(data)
			.then((response: TSavedQuery[]) => {
				setSavedQueries(response);

				switch (action) {
					case 'saveQuery':
						showInformationMessage(
							`Query "${queryName}" saved successfully`
						);
						break;
					case 'editQuery':
						showInformationMessage(
							`Query "${queryName}" updated successfully`
						);
						break;
					case 'deleteQuery':
						showInformationMessage(
							`Query "${queryName}" deleted successfully`
						);
						break;
					default:
						console.log('Unrecognized action: ', action);
				}
			})
			.catch((err: string) => {
				console.error(err);
				showErrorMessage('An error occurred. Please try again!');
			});
	};

	const handleOnInput = useCallback(
		(event: ChangeEvent<HTMLInputElement>) => {
			setQuery(event?.target?.value);
			setQueryToSave(prev => ({
				...prev,
				value: event?.target?.value
			}));
		},
		[]
	);

	const handleOnEnter = useCallback(
		(event: React.KeyboardEvent<HTMLInputElement>) => {
			if (event.code === 'Enter') {
				emitQuery(query);
			}
		},
		[query, emitQuery]
	);

	const handleInputClear = useCallback(() => {
		setQuery('');
		setQueryToSave(prev => ({
			...prev,
			value: ''
		}));
	}, []);

	const handleOnSaveQuery = () => {
		const found = savedQueries.find(
			(item: TSavedQuery) =>
				queryToSave?.name === item?.name &&
				queryToSave?.value === item?.value
		);

		// eslint-disable-next-line no-negated-condition
		if (!found) {
			if (isCheckQueryValidity) {
				saveWithCheck();
			} else {
				save();
			}
		} else {
			// If duplicate, show error message
			setDbError('This is a duplicate and can not be saved!');
		}
	};

	const save = useCallback(() => {
		const id = savedQueries.length ? savedQueries[0].id + 1 : 0;

		const updatedList = [
			{
				name: queryToSave.name,
				value: queryToSave.value,
				id
			},
			...savedQueries
		];

		postQueries(queryToSave.name, updatedList, 'saveQuery');
		toggleSaveQueryModal();
		// On save success, reset state
		setQueryToSave({
			id: 0,
			name: '',
			value: query
		});
	}, [query, queryToSave, savedQueries]);

	const saveWithCheck = useCallback(() => {
		setDbError('');

		// Check if the query is valid and then save it
		getSymbols(queryToSave.value)
			.then(_ => {
				save();
			})
			.catch((err: string) => {
				setDbError(err);
			});
	}, [queryToSave, save]);

	const handleOnEditQuery = (query: TSavedQuery) => {
		const index = savedQueries.findIndex(
			item => item.id === query.id
		);
		const queries: TSavedQuery[] = JSON.parse(
			JSON.stringify(savedQueries)
		);

		queries[index] = {
			...queries[index],
			name: query.name,
			value: query.value
		};

		postQueries(query.name, queries, 'editQuery');
	};

	const handleOnDeleteQuery = (query: TSavedQuery) => {
		const updatedList = savedQueries.filter(
			(item: TSavedQuery) => item.id !== query.id
		);

		postQueries(query.name, updatedList, 'deleteQuery');
	};

	const handleClickedQuery = (query: TSavedQuery) => {
		setQuery(query.value);
		setQueryToSave((prev: TSavedQuery) => ({
			...prev,
			value: query.value
		}));
		emitQuery(query.value);
	};

	const resetState = () => {
		toggleSaveQueryModal();
		setQueryToSave({
			id: 0,
			name: '',
			value: query
		});
		setDbError('');
	};

	const toggleSaveQueryModal = () => {
		setDbError('');
		setIsSaveModalOpen(prev => !prev);
	};

	return (
		<div
			className={styles.container}
			data-test='symbols:filters-container'
		>
			<QueryFilterInput
				error={error}
				query={query}
				onClear={handleInputClear}
				onInput={handleOnInput}
				onEnter={handleOnEnter}
				onSave={toggleSaveQueryModal}
			/>

			<SavedQueriesDropdown
				queries={savedQueries}
				onEdit={handleOnEditQuery}
				onDelete={handleOnDeleteQuery}
				onClick={handleClickedQuery}
			/>

			<Modal
				isOpen={isSaveModalOpen}
				handleModalClose={resetState}
				footer={
					<>
						<Button appearance='secondary' onClick={resetState}>
							Cancel
						</Button>
						<Button appearance='primary' onClick={handleOnSaveQuery}>
							Save
						</Button>
					</>
				}
			>
				<SaveEditQueryModal
					query={queryToSave}
					title='Save your query'
					error={dbError}
					onChange={query => {
						setQueryToSave(query);
						setDbError('');
					}}
					onCheckboxChange={isChecked => {
						setIsCheckQueryValidity(!isChecked);
					}}
				/>
			</Modal>
		</div>
	);
}
