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
	useCallback,
	useEffect,
	useState
} from 'react';
import {VSCodeTextField} from '@vscode/webview-ui-toolkit/react';

import SearchIcon from '@common/icons/Search';
import styles from './SymbolsSearch.module.scss';

type TSymbolsSearchProps = {
	readonly emitValue: (value: string) => void;
	readonly queryChangedBy: 'search' | 'filter';
};

export default function SymbolsSearch({
	emitValue,
	queryChangedBy
}: TSymbolsSearchProps) {
	const [value, setValue] = useState<string>('');

	const handleOnInput = useCallback(
		(event: ChangeEvent<HTMLInputElement>) => {
			setValue(event?.target?.value);
		},
		[]
	);

	const handleOnEnter = useCallback(
		(event: React.KeyboardEvent<HTMLInputElement>) => {
			if (event.code === 'Enter' && (value || value === '0')) {
				emitValue(value.trim());
			}
		},
		[value, emitValue]
	);

	useEffect(() => {
		if (queryChangedBy === 'filter') {
			setValue('');
		}
	}, [queryChangedBy]);

	return (
		<VSCodeTextField
			className={styles.container}
			type='text'
			placeholder='Search by name or address'
			name='search-by-symbol'
			value={value}
			onInput={event => {
				handleOnInput(event as ChangeEvent<HTMLInputElement>);
			}}
			onKeyUp={event => {
				handleOnEnter(event as React.KeyboardEvent<HTMLInputElement>);
			}}
		>
			<span slot='start' className={styles.icon}>
				<SearchIcon />
			</span>
		</VSCodeTextField>
	);
}
