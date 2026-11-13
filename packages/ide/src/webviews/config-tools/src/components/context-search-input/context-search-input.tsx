/**
 *
 * Copyright (c) 2024-2026 Analog Devices, Inc.
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

import {type KeyboardEvent} from 'react';
import {useDispatch} from 'react-redux';
import {setActiveSearchString} from '../../state/slices/app-context/appContext.reducer';
import {useSearchString} from '../../state/slices/app-context/appContext.selector';
import {SearchInput} from 'cfs-react-library';
import {useLocaleContext} from '@common/contexts/LocaleContext';

type ContextSearchInputProps = {
	readonly searchContext: 'register' | 'pinconfig';
	readonly onKeyDown?: (
		event: KeyboardEvent<HTMLInputElement>
	) => void;
};

export default function ContextSearchInput({
	searchContext,
	onKeyDown
}: ContextSearchInputProps) {
	const dispatch = useDispatch();
	const searchString = useSearchString(searchContext);
	const l10nCtx = useLocaleContext();
	const l10n = (
		searchContext === 'register'
			? l10nCtx?.registersScreen
			: l10nCtx?.pinConfig
	) as Record<string, string> | undefined;

	const handleInput = (value: string) => {
		dispatch(
			setActiveSearchString({
				searchContext,
				value: value.trim()
			})
		);
	};

	const handleInputClear = () => {
		dispatch(setActiveSearchString({searchContext, value: ''}));
	};

	return (
		<SearchInput
			placeholder={l10n?.search ?? 'Search'}
			inputVal={searchString}
			dataTest='search'
			onInputChange={handleInput}
			onClear={handleInputClear}
			onKeyDown={onKeyDown}
		/>
	);
}
