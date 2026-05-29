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
import PinAssignmentStatusFilter from '../pin-assignment-status-filter/pin-assignment-status-filter';
import ContextSearchInput from '../../../components/context-search-input/context-search-input';

import style from './PinmuxHeader.module.scss';
import SearchScopePicker from '../search-scope-picker/search-scope-picker';
import {useSearchString} from '../../../state/slices/app-context/appContext.selector';

export default function PinmuxHeader() {
	const pickerOpened = useSearchString('pinconfig').length > 0;

	return (
		<div className={style.headerContainer}>
			<div className={style.inputWrapper}>
				<ContextSearchInput searchContext='pinconfig' />
				{pickerOpened && <SearchScopePicker />}
			</div>
			<PinAssignmentStatusFilter />
		</div>
	);
}
