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
import {useEffect, useState, type ChangeEvent} from 'react';
import {VSCodeTextField} from '@vscode/webview-ui-toolkit/react';
// SVG
import Database from '@common/icons/Database';

import type {TSavedQuery} from '../../../../common/types/symbols';

import styles from './SaveEditQueryModal.module.scss';
import InputError from '../InputErrorMessage/InputError';
import {CheckBox} from 'cfs-react-library';

type SaveEditQueryModalProps = {
	readonly query: TSavedQuery | undefined;
	readonly title: string;
	readonly error?: string;
	readonly onChange: (query: TSavedQuery) => void;
	readonly onCheckboxChange: (isChecked: boolean) => void;
};

export default function SaveEditQueryModal({
	query,
	title,
	error,
	onChange,
	onCheckboxChange
}: SaveEditQueryModalProps) {
	const [queryForm, setQueryForm] = useState<TSavedQuery>({
		id: 0,
		name: '',
		value: ''
	});
	const [isChecked, setIsChecked] = useState<boolean>(false);

	useEffect(() => {
		if (query) {
			setQueryForm(() => ({
				id: query.id,
				name: query.name,
				value: query.value
			}));
		}
	}, [query]);

	const handleQueryNameChange = (
		event: ChangeEvent<HTMLInputElement>
	) => {
		const name = event.target.value;

		setQueryForm(prev => ({
			...prev,
			name
		}));
		onChange({
			...queryForm,
			name
		});
	};

	const handleQueryValueChange = (
		event: ChangeEvent<HTMLInputElement>
	) => {
		const {value} = event.target;

		setQueryForm(prev => ({
			...prev,
			value
		}));
		onChange({
			...queryForm,
			value
		});
	};

	return (
		<section className={styles.fields}>
			<h1>{title}</h1>
			<p>
				If you would like to save your query for future use, fill in
				the field below to be able to easily identify it.
			</p>

			<div className={styles.field}>
				<label htmlFor='query' className={styles.label}>
					Query
				</label>
				<VSCodeTextField
					className={styles.input}
					type='text'
					name='query'
					value={queryForm.value ?? ''}
					onInput={event => {
						handleQueryValueChange(
							event as ChangeEvent<HTMLInputElement>
						);
					}}
				>
					<span slot='start' className={styles.icon}>
						<Database />
					</span>
				</VSCodeTextField>
				{error && <InputError text={error} />}
			</div>
			<CheckBox
				checked={isChecked}
				onClick={(event: any) => {
					setIsChecked(event?.target?.checked as boolean);
					onCheckboxChange(event?.target?.checked as boolean);
				}}
			>
				Save query even if there are errors
			</CheckBox>
			<div className={styles.field}>
				<label htmlFor='query-name' className={styles.label}>
					Query name
				</label>
				<VSCodeTextField
					className={styles.input}
					type='text'
					placeholder='Enter query name'
					name='query-name'
					value={queryForm.name ?? ''}
					onInput={event => {
						handleQueryNameChange(
							event as ChangeEvent<HTMLInputElement>
						);
					}}
				/>
			</div>
		</section>
	);
}
