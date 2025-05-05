/**
 *
 * Copyright (c) 2024-2025 Analog Devices, Inc.
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

import {useDispatch} from 'react-redux';
import {setActiveSearchString} from '../../state/slices/app-context/appContext.reducer';
import {useSearchString} from '../../state/slices/app-context/appContext.selector';
import {SearchInput} from 'cfs-react-library';

type ContextSearchInputProps = {
	readonly searchContext: 'register' | 'pinconfig';
};

export default function ContextSearchInput({
	searchContext
}: ContextSearchInputProps) {
	const dispatch = useDispatch();
	const searchString = useSearchString(searchContext);

	const handleInput = (value: string) => {
		dispatch(
			setActiveSearchString({
				searchContext,
				value
			})
		);
	};

	const handleInputClear = () => {
		dispatch(setActiveSearchString({searchContext, value: ''}));
	};

	return (
		<SearchInput
			placeholder='Search'
			inputVal={searchString}
			dataTest='search'
			onInputChange={handleInput}
			onClear={handleInputClear}
		/>
	);
}
