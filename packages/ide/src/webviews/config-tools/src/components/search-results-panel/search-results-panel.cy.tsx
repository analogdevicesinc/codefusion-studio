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
import SearchResultsPanel from './search-results-panel';
import {type FormattedSearchSection} from './types';

const FLAT_SECTIONS: FormattedSearchSection[] = [
	{
		items: [
			{sourceIndex: 0, key: 'alpha', displayName: 'Alpha'},
			{
				sourceIndex: 1,
				key: 'beta',
				displayName: 'Beta',
				subDisplayName: '(B2)'
			}
		]
	}
];

const CAPTIONED_SECTIONS: FormattedSearchSection[] = [
	{
		caption: 'Peripherals',
		items: [{sourceIndex: 7, key: 'gamma', displayName: 'Gamma'}]
	},
	{
		caption: 'Groups',
		items: [{sourceIndex: 9, key: 'delta', displayName: 'Delta'}]
	}
];

const SCOPE_CONTROLS = (
	<div data-test='scope-controls'>scope controls</div>
);

describe('SearchResultsPanel', () => {
	it('renders the injected scope controls', () => {
		cy.mount(
			<SearchResultsPanel
				scopeControls={SCOPE_CONTROLS}
				sections={FLAT_SECTIONS}
				matchedTerm=''
				resultLayout='inline'
				resetKey='pins'
				onResultSelect={() => undefined}
			/>
		);

		cy.dataTest('scope-controls').should('exist');
	});

	it('renders every item of an uncaptioned section without a caption', () => {
		cy.mount(
			<SearchResultsPanel
				scopeControls={SCOPE_CONTROLS}
				sections={FLAT_SECTIONS}
				matchedTerm=''
				resultLayout='inline'
				resetKey='pins'
				onResultSelect={() => undefined}
			/>
		);

		cy.dataTest('search-result-Alpha').should('exist');
		cy.dataTest('search-result-Beta-(B2)').should('exist');
		cy.get('[data-test^="search-section-caption-"]').should(
			'not.exist'
		);
	});

	it('renders a caption above each captioned section', () => {
		cy.mount(
			<SearchResultsPanel
				scopeControls={SCOPE_CONTROLS}
				sections={CAPTIONED_SECTIONS}
				matchedTerm=''
				resultLayout='stacked'
				resetKey='peripherals'
				onResultSelect={() => undefined}
			/>
		);

		cy.dataTest('search-section-caption-Peripherals').should(
			'have.text',
			'Peripherals'
		);
		cy.dataTest('search-section-caption-Groups').should(
			'have.text',
			'Groups'
		);
		cy.dataTest('search-result-Gamma').should('exist');
		cy.dataTest('search-result-Delta').should('exist');
	});

	it('omits the subtitle when a result has none', () => {
		cy.mount(
			<SearchResultsPanel
				scopeControls={SCOPE_CONTROLS}
				sections={FLAT_SECTIONS}
				matchedTerm=''
				resultLayout='inline'
				resetKey='pins'
				onResultSelect={() => undefined}
			/>
		);

		cy.dataTest('search-result-Alpha')
			.find('[data-test="search-result-subtitle"]')
			.should('not.exist');

		cy.dataTest('search-result-Beta-(B2)')
			.find('[data-test="search-result-subtitle"]')
			.should('have.text', '(B2)');
	});

	it('highlights the matched term in the result title', () => {
		cy.mount(
			<SearchResultsPanel
				scopeControls={SCOPE_CONTROLS}
				sections={FLAT_SECTIONS}
				matchedTerm='alph'
				resultLayout='inline'
				resetKey='pins'
				onResultSelect={() => undefined}
			/>
		);

		cy.dataTest('search-result-Alpha')
			.find('mark')
			.should('have.text', 'Alph');
	});

	it('lays results out in a row when inline', () => {
		cy.mount(
			<SearchResultsPanel
				scopeControls={SCOPE_CONTROLS}
				sections={FLAT_SECTIONS}
				matchedTerm=''
				resultLayout='inline'
				resetKey='pins'
				onResultSelect={() => undefined}
			/>
		);

		cy.dataTest('search-result-Beta-(B2)').should($el => {
			expect(getComputedStyle($el[0]).flexDirection).to.equal('row');
		});
	});

	it('lays results out in a column when stacked', () => {
		cy.mount(
			<SearchResultsPanel
				scopeControls={SCOPE_CONTROLS}
				sections={FLAT_SECTIONS}
				matchedTerm=''
				resultLayout='stacked'
				resetKey='pins'
				onResultSelect={() => undefined}
			/>
		);

		cy.dataTest('search-result-Beta-(B2)').should($el => {
			expect(getComputedStyle($el[0]).flexDirection).to.equal(
				'column'
			);
		});
	});

	it('passes the selected result source index to onResultSelect', () => {
		const onResultSelect = cy.stub().as('onResultSelect');

		cy.mount(
			<SearchResultsPanel
				scopeControls={SCOPE_CONTROLS}
				sections={CAPTIONED_SECTIONS}
				matchedTerm=''
				resultLayout='stacked'
				resetKey='peripherals'
				onResultSelect={onResultSelect}
			/>
		);

		cy.dataTest('search-result-Delta').click();

		cy.get('@onResultSelect').should('have.been.calledOnceWith', 9);
	});

	it('shows the minimum length message instead of results', () => {
		cy.mount(
			<SearchResultsPanel
				scopeControls={SCOPE_CONTROLS}
				sections={FLAT_SECTIONS}
				matchedTerm=''
				resultLayout='inline'
				resetKey='pins'
				emptyState={{
					kind: 'minLength',
					message: 'A minimum of 2 characters is required'
				}}
				onResultSelect={() => undefined}
			/>
		);

		cy.dataTest('min-characters').should(
			'have.text',
			'A minimum of 2 characters is required'
		);
		cy.dataTest('no-results').should('not.exist');
		cy.dataTest('search-result-Alpha').should('not.exist');
	});

	it('shows the no results message instead of results', () => {
		cy.mount(
			<SearchResultsPanel
				scopeControls={SCOPE_CONTROLS}
				sections={FLAT_SECTIONS}
				matchedTerm=''
				resultLayout='inline'
				resetKey='pins'
				emptyState={{kind: 'noResults', message: 'No results found.'}}
				onResultSelect={() => undefined}
			/>
		);

		cy.dataTest('no-results').should(
			'have.text',
			'No results found.'
		);
		cy.dataTest('min-characters').should('not.exist');
		cy.dataTest('search-result-Alpha').should('not.exist');
	});
});
