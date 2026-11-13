/**
 *
 * Copyright (c) 2026 Analog Devices, Inc.
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
import {SearchBar, type FilterOption} from '../common/search-bar';
import SearchScopePicker from './search-scope-picker/search-scope-picker';
import {SearchPanelKeyboardProvider} from '../../../components/search-results-panel/search-panel-keyboard-context';
import {useSearchPanelKeyboard} from '../../../components/search-results-panel/search-panel-keyboard';
import styles from './connections-search.module.scss';
import {
	useDisableDefaultFilter,
	useDisableModifiedFilter,
	useDisableAllFilter
} from '../../../hooks/use-sru-search-results';

type ConnectionsSearchProps = Readonly<{
	searchText: string;
	statusFilter: FilterOption;
	onSearchChange: (value: string) => void;
	onFilterChange: (option: FilterOption) => void;
}>;

/**
 * The Connections search field and its floating scope/results panel,
 * wrapped in the keyboard-navigation provider both need to share.
 */
export function ConnectionsSearch(props: ConnectionsSearchProps) {
	return (
		<SearchPanelKeyboardProvider searchText={props.searchText}>
			<ConnectionsSearchField {...props} />
		</SearchPanelKeyboardProvider>
	);
}

function ConnectionsSearchField({
	searchText,
	statusFilter,
	onSearchChange,
	onFilterChange
}: ConnectionsSearchProps) {
	const {isOpen, handleKeyDown, handleBlur} =
		useSearchPanelKeyboard();

	const isAllDisabled = useDisableAllFilter();
	const isDefaultDisabled = useDisableDefaultFilter();
	const isModifiedDisabled = useDisableModifiedFilter();

	return (
		<div className={styles.searchInputWrapper} onBlur={handleBlur}>
			<SearchBar
				initialSearchValue={searchText}
				initialFilterOption={statusFilter}
				isAllDisabled={isAllDisabled}
				isDefaultDisabled={isDefaultDisabled}
				isModifiedDisabled={isModifiedDisabled}
				onSearchChange={onSearchChange}
				onFilterChange={onFilterChange}
				onKeyDown={handleKeyDown}
			/>
			{isOpen && <SearchScopePicker />}
		</div>
	);
}
