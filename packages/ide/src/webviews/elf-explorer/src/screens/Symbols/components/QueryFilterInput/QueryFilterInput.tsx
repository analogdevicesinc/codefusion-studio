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
import {Button} from 'cfs-react-library';

import InputError from '../InputErrorMessage/InputError';

// Icons
import Database from '@common/icons/Database';
import CloseIcon from '@common/components/icons/CloseIcon';
import SaveIcon from '@common/icons/Save';

import styles from './QueryFilterInput.module.scss';

type TQueryFilterInputProps = {
	readonly error: string | undefined;
	readonly query: string;
	readonly onInput: (event: ChangeEvent<HTMLInputElement>) => void;
	readonly onEnter: (
		event: React.KeyboardEvent<HTMLInputElement>
	) => void;
	readonly onClear: () => void;
	readonly onSave: () => void;
};

export default function QueryFilterInput({
	error,
	query,
	onInput,
	onEnter,
	onClear,
	onSave
}: TQueryFilterInputProps) {
	return (
		<div className={styles.container}>
			<VSCodeTextField
				className={styles.input}
				type='text'
				placeholder='Filter using SQL query. eg: SELECT * FROM symbols WHERE size > 0'
				name='query-filter'
				value={query}
				data-test='symbols:filter:query-input'
				onInput={event => {
					onInput(event as ChangeEvent<HTMLInputElement>);
				}}
				onKeyUp={event => {
					onEnter(event as React.KeyboardEvent<HTMLInputElement>);
				}}
			>
				<span slot='start' className={styles.icon}>
					<Database />
				</span>

				<div slot='end' className={styles['slot-end-container']}>
					<Button
						appearance='icon'
						className={styles.icon}
						dataTest='symbols:filter:on-query-clear'
						onClick={onClear}
					>
						<CloseIcon />
					</Button>
					<Button
						appearance='icon'
						className={styles.icon}
						dataTest='symbols:filter:on-query-save'
						onClick={onSave}
					>
						<SaveIcon />
					</Button>
				</div>
			</VSCodeTextField>

			{error && <InputError text={error} />}
		</div>
	);
}
