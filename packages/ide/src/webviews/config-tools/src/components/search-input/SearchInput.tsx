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
import SearchIcon from '@common/icons/Search';
import type {ChangeEvent} from 'react';

import styles from './searchInput.module.scss';
import {useDispatch} from 'react-redux';
import {setActiveSearchString} from '../../state/slices/app-context/appContext.reducer';
import {useSearchString} from '../../state/slices/app-context/appContext.selector';
import CloseIcon from '@common/components/icons/CloseIcon';

type SearchInputProps = {
	readonly searchContext: 'register' | 'pinconfig';
};

export default function SearchInput({
	searchContext
}: SearchInputProps) {
	const dispatch = useDispatch();
	const searchString = useSearchString(searchContext);

	const handleInput = (e: ChangeEvent<HTMLInputElement>) => {
		dispatch(
			setActiveSearchString({
				searchContext,
				value: e.target.value
			})
		);
	};

	const handleInputClear = () => {
		dispatch(setActiveSearchString({searchContext, value: ''}));
	};

	return (
		<VSCodeTextField
			type='text'
			placeholder='Search'
			className={styles.root}
			value={searchString}
			data-test='search-input'
			onInput={e => {
				handleInput(e as ChangeEvent<HTMLInputElement>);
			}}
		>
			<span slot='start' style={{height: '100%'}}>
				<SearchIcon />
			</span>
			<span
				slot='end'
				style={{height: '100%', cursor: 'pointer'}}
				onClick={handleInputClear}
			>
				<CloseIcon />
			</span>
		</VSCodeTextField>
	);
}
