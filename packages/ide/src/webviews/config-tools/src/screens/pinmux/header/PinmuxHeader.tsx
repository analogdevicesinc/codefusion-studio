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
import FilterControls from '../../../components/filter-controls/FilterControls';
import ContextSearchInput from '../../../components/context-search-input/context-search-input';

import style from './PinmuxHeader.module.scss';

export default function PinmuxHeader() {
	return (
		<div className={style.headerContainer}>
			<div className={style.inputWrapper}>
				<ContextSearchInput searchContext='pinconfig' />
			</div>
			<FilterControls />
		</div>
	);
}
