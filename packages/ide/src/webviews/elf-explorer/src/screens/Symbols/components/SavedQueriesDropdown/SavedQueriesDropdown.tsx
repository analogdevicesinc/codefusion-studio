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
import {useCallback, useState, useRef, useEffect} from 'react';
import type {ChangeEvent} from 'react';
import {getSymbols} from '../../../../common/api';

// Components
import {Chip, Button} from 'cfs-react-library';
import {Modal} from '@common/components/modal/Modal';
import DeleteQueryModal from '../DeleteModal/DeleteQueryModal';
import SaveEditQueryModal from '../SaveEditQueryModal/SaveEditQueryModal';
import SavedQueryContainer from '../SavedQueryContainer/SavedQueryContainer';

import DownCarret from '@common/icons/DownCarret';
import type {TSavedQuery} from '../../../../common/types/symbols';

import styles from './SavedQueriesDropdown.module.scss';

type TSavedQueriesDropdownProps = {
	readonly queries: TSavedQuery[];
	readonly onEdit: (query: TSavedQuery) => void;
	readonly onDelete: (query: TSavedQuery) => void;
	readonly onClick: (query: TSavedQuery) => void;
};

export default function SavedQueriesDropdown({
	queries,
	onEdit,
	onDelete,
	onClick
}: TSavedQueriesDropdownProps) {
	const dropdownRef = useRef<HTMLDivElement>(null);
	const [isDropdownOpen, setIsDropdownOpen] =
		useState<boolean>(false);
	const [isDeleteModalOpen, setIsDeleteModalOpen] =
		useState<boolean>(false);
	const [isEditModalOpen, setIsEditModalOpen] =
		useState<boolean>(false);
	// To be used on delete or edit
	const [selectedQuery, setSelectedQuery] = useState<
		TSavedQuery | undefined
	>(undefined);
	const [dbError, setDbError] = useState<string>('');
	const [queryFilterInput, setQueryFilterInput] =
		useState<string>('');
	const [isCheckQueryValidity, setIsCheckQueryValidity] =
		useState<boolean>(true);

	useEffect(() => {
		document.addEventListener('mousedown', handleOutsideClick);

		return () => {
			document.removeEventListener('mousedown', handleOutsideClick);
		};
	}, []);

	const handleOutsideClick = (event: MouseEvent) => {
		const target = event?.target as Node;

		if (
			dropdownRef.current &&
			!dropdownRef.current.contains(target || Node)
		) {
			setIsDropdownOpen(false);
		}
	};

	const onChipClick = useCallback(() => {
		setIsDropdownOpen(prev => !prev);
	}, []);

	const handleQueryFilter = useCallback(
		(event: ChangeEvent<HTMLInputElement>) => {
			setQueryFilterInput(event.target.value);
		},
		[]
	);

	const onActionQueryClick = useCallback(
		(query: TSavedQuery, action: 'delete' | 'edit') => {
			setSelectedQuery(query);
			setIsDropdownOpen(false);
			if (action === 'delete') onToggleDeleteModal();
			if (action === 'edit') onToggleEditModal();
		},
		[]
	);

	const onItemClick = (item: TSavedQuery) => {
		onClick(item);
		setIsDropdownOpen(prev => !prev);
	};

	const onDeleteQuery = useCallback(() => {
		if (selectedQuery) onDelete(selectedQuery);

		setSelectedQuery(undefined);
		onToggleDeleteModal();
	}, [selectedQuery, onDelete]);

	const editQueryWithCheck = useCallback(() => {
		// Check if the query is valid
		getSymbols(selectedQuery?.value ?? '')
			.then(_ => {
				if (selectedQuery) onEdit(selectedQuery);
				setSelectedQuery(undefined);
				onToggleEditModal();
			})
			.catch((err: string) => {
				setDbError(err);
			});
	}, [selectedQuery, onEdit]);

	const editQueryWithoutCheck = useCallback(() => {
		if (selectedQuery) onEdit(selectedQuery);
		setSelectedQuery(undefined);
		onToggleEditModal();
	}, [selectedQuery, onEdit]);

	const onToggleDeleteModal = () => {
		setIsDeleteModalOpen(prev => !prev);
	};

	const onEditQuery = useCallback(() => {
		const found = queries.find(
			(item: TSavedQuery) =>
				selectedQuery?.name === item?.name &&
				selectedQuery?.value === item?.value
		);

		// eslint-disable-next-line no-negated-condition
		if (!found) {
			if (isCheckQueryValidity) {
				editQueryWithCheck();
			} else {
				editQueryWithoutCheck();
			}
		} else {
			setDbError('This is a duplicate and can not be saved!');
		}
	}, [
		editQueryWithCheck,
		editQueryWithoutCheck,
		isCheckQueryValidity,
		queries,
		selectedQuery
	]);

	const onToggleEditModal = () => {
		setDbError('');
		setIsEditModalOpen(prev => !prev);
	};

	const getDeleteModalFooter = () => (
		<>
			<Button appearance='secondary' onClick={onToggleDeleteModal}>
				Cancel
			</Button>
			<Button appearance='primary' onClick={onDeleteQuery}>
				Confirm
			</Button>
		</>
	);

	const getEditModalFooter = () => (
		<>
			<Button appearance='secondary' onClick={onToggleEditModal}>
				Cancel
			</Button>
			<Button appearance='primary' onClick={onEditQuery}>
				Confirm
			</Button>
		</>
	);

	return (
		<>
			<section
				ref={dropdownRef}
				data-test='symbols:dropdown-container'
				className={styles.container}
				onKeyDown={e => {
					if (e.key === 'Escape') {
						setIsDropdownOpen(false);
					}
				}}
			>
				<Chip
					isDisabled={false}
					isActive={isDropdownOpen}
					id='saved-queries'
					label='Saved queries'
					onClick={() => {
						onChipClick();
					}}
				>
					<div slot='end' className={styles.button}>
						<span
							className={`${isDropdownOpen ? styles['is-open'] : ''} ${styles.icon}`}
						>
							<DownCarret />
						</span>
					</div>
				</Chip>

				<div
					className={`${isDropdownOpen ? styles.show : styles.hide} ${styles.panel}`}
				>
					<SavedQueryContainer
						queries={queries}
						queryToFilter={queryFilterInput}
						onInputChange={handleQueryFilter}
						onItemClick={onItemClick}
						onActionClick={onActionQueryClick}
					/>
				</div>
			</section>

			{/* DELETE MODAL */}
			<Modal
				isOpen={isDeleteModalOpen}
				handleModalClose={onToggleDeleteModal}
				footer={getDeleteModalFooter()}
			>
				<DeleteQueryModal query={selectedQuery} />
			</Modal>

			{/* EDIT MODAL */}
			<Modal
				isOpen={isEditModalOpen}
				handleModalClose={onToggleEditModal}
				footer={getEditModalFooter()}
			>
				<SaveEditQueryModal
					query={selectedQuery}
					title={`Edit query ${queries.find(query => query.id === selectedQuery?.id)?.name}`}
					error={dbError}
					onChange={newQuery => {
						setSelectedQuery(newQuery);
						setDbError('');
					}}
					onCheckboxChange={isChecked => {
						setIsCheckQueryValidity(!isChecked);
					}}
				/>
			</Modal>
		</>
	);
}
