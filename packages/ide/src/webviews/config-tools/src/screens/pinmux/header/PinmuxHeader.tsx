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
import PinAssignmentStatusFilter from '../pin-assignment-status-filter/pin-assignment-status-filter';
import ContextSearchInput from '../../../components/context-search-input/context-search-input';

import style from './PinmuxHeader.module.scss';
import SearchScopePicker from '../search-scope-picker/search-scope-picker';
import {useSearchString} from '../../../state/slices/app-context/appContext.selector';
import {SearchPanelKeyboardProvider} from '../../../components/search-results-panel/search-panel-keyboard-context';
import {useSearchPanelKeyboard} from '../../../components/search-results-panel/search-panel-keyboard';

export default function PinmuxHeader() {
	const searchString = useSearchString('pinconfig');

	return (
		<div className={style.headerContainer}>
			<SearchPanelKeyboardProvider searchText={searchString}>
				<PinmuxSearchField />
			</SearchPanelKeyboardProvider>
			<PinAssignmentStatusFilter />
		</div>
	);
}

function PinmuxSearchField() {
	const {isOpen, handleKeyDown, handleBlur} =
		useSearchPanelKeyboard();

	return (
		<div className={style.inputWrapper} onBlur={handleBlur}>
			<ContextSearchInput
				searchContext='pinconfig'
				onKeyDown={handleKeyDown}
			/>
			{isOpen && <SearchScopePicker />}
		</div>
	);
}
