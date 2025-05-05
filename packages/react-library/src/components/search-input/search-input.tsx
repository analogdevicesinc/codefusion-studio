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

import {forwardRef, KeyboardEvent} from 'react';
import SearchIcon from '../icons/search-icon';
import CloseIcon from '../icons/close-icon';
import TextField from '../text-field/textfield';
import Button from '../button/button';

export type SearchInputProps = Readonly<{
	inputVal: string | undefined;
	label?: string;
	disabled?: boolean;
	dataTest?: string;
	placeholder?: string;
	onClear: () => void;
	onInputChange: (value: string) => void;
	onKeyUp?: (e: KeyboardEvent<HTMLInputElement>) => void;
	onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
	onFocus?: () => void;
}>;

const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
	function CfsSearchInput(
		{
			inputVal,
			label,
			disabled = false,
			dataTest,
			placeholder = 'Type to search...',
			onClear,
			onInputChange,
			onKeyUp,
			onKeyDown,
			onFocus
		},
		ref
	) {
		return (
			<TextField
				ref={ref}
				direction='vertical'
				inputVal={inputVal}
				label={label}
				placeholder={placeholder}
				isDisabled={disabled}
				dataTest={dataTest}
				onInputChange={onInputChange}
				onKeyUp={onKeyUp}
				onKeyDown={onKeyDown}
				onFocus={() => {
					onFocus && onFocus();
				}}
				startSlot={<SearchIcon />}
				endSlot={
					inputVal ? (
						<Button
							appearance='icon'
							onClick={onClear}
							disabled={disabled}
						>
							<CloseIcon />
						</Button>
					) : undefined
				}
			/>
		);
	}
);

export default SearchInput;
