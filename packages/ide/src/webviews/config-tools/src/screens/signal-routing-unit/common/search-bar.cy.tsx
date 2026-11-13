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
import {LocalizationProvider} from '@common/contexts/LocaleContext';
import {type FilterOption, SearchBar} from './search-bar';

function mountSearchBar(
	props: Readonly<{
		onSearchChange?: (value: string) => void;
		onFilterChange?: (option: FilterOption) => void;
		isDefaultDisabled?: boolean;
		isModifiedDisabled?: boolean;
	}> = {}
) {
	cy.mount(
		<LocalizationProvider namespace='cfgtools'>
			<SearchBar
				isDefaultDisabled={props.isDefaultDisabled ?? false}
				isModifiedDisabled={props.isModifiedDisabled ?? false}
				onSearchChange={props.onSearchChange ?? cy.stub()}
				onFilterChange={props.onFilterChange ?? cy.stub()}
			/>
		</LocalizationProvider>
	);
}

describe('SearchBar', () => {
	it('"All" filter chip is active by default', () => {
		mountSearchBar();

		cy.dataTest('filter-chip-all').should(
			'have.attr',
			'appearance',
			'primary'
		);
		cy.dataTest('filter-chip-default').should(
			'have.attr',
			'appearance',
			'secondary'
		);
		cy.dataTest('filter-chip-modified').should(
			'have.attr',
			'appearance',
			'secondary'
		);
	});

	it('switches to "Default" filter chip when clicked', () => {
		mountSearchBar();

		cy.dataTest('filter-chip-default').click();

		cy.dataTest('filter-chip-default').should(
			'have.attr',
			'appearance',
			'primary'
		);
		cy.dataTest('filter-chip-all').should(
			'have.attr',
			'appearance',
			'secondary'
		);
	});

	it('switches to "Modified" filter chip when clicked', () => {
		mountSearchBar();

		cy.dataTest('filter-chip-modified').click();

		cy.dataTest('filter-chip-modified').should(
			'have.attr',
			'appearance',
			'primary'
		);
		cy.dataTest('filter-chip-all').should(
			'have.attr',
			'appearance',
			'secondary'
		);
	});

	it('switches back to "All" filter chip after another selection', () => {
		mountSearchBar();

		cy.dataTest('filter-chip-default').click();
		cy.dataTest('filter-chip-all').click();

		cy.dataTest('filter-chip-all').should(
			'have.attr',
			'appearance',
			'primary'
		);
		cy.dataTest('filter-chip-default').should(
			'have.attr',
			'appearance',
			'secondary'
		);
	});

	it('accepts text in search input', () => {
		mountSearchBar();

		cy.dataTest('search-bar-control-input')
			.shadow()
			.find('input')
			.type('DAI0');

		cy.dataTest('search-bar-control-input')
			.shadow()
			.find('input')
			.should('have.value', 'DAI0');
	});

	it('clears search input when clear button is clicked', () => {
		mountSearchBar();

		cy.dataTest('search-bar-control-input')
			.shadow()
			.find('input')
			.type('UART');

		cy.dataTest('search-bar-control-input')
			.find('vscode-button[appearance="icon"]')
			.click();

		cy.dataTest('search-bar-control-input')
			.shadow()
			.find('input')
			.should('have.value', '');
	});

	it('disables the Default filter chip when requested', () => {
		mountSearchBar({
			isDefaultDisabled: true
		});

		cy.dataTest('filter-chip-default').should(
			'have.attr',
			'disabled'
		);

		cy.dataTest('filter-chip-modified').should(
			'not.have.attr',
			'disabled'
		);

		cy.dataTest('filter-chip-all').should(
			'not.have.attr',
			'disabled'
		);
	});

	it('disables the Modified filter chip when requested', () => {
		mountSearchBar({
			isModifiedDisabled: true
		});

		cy.dataTest('filter-chip-modified').should(
			'have.attr',
			'disabled'
		);

		cy.dataTest('filter-chip-default').should(
			'not.have.attr',
			'disabled'
		);

		cy.dataTest('filter-chip-all').should(
			'not.have.attr',
			'disabled'
		);
	});
});
