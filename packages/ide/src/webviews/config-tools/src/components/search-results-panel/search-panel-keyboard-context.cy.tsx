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
import {useState} from 'react';
import SearchResultsPanel from './search-results-panel';
import {SearchPanelKeyboardProvider} from './search-panel-keyboard-context';
import {
	useRegisterScopeControls,
	useSearchPanelKeyboard
} from './search-panel-keyboard';
import {type FormattedSearchSection} from './types';

const FLAT_SECTIONS: FormattedSearchSection[] = [
	{
		items: [
			{sourceIndex: 0, key: 'alpha', displayName: 'Alpha'},
			{sourceIndex: 1, key: 'beta', displayName: 'Beta'}
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

const SCOPES = ['pins', 'peripherals', 'signals'] as const;

type HarnessProps = Readonly<{
	sections?: FormattedSearchSection[];
	onResultSelect?: (sourceIndex: number) => void;
}>;

/**
 * Mirrors how the screens wire the provider: a search field owning the
 * query, the floating panel rendered while the provider says it is open,
 * and a scope row registered from inside the panel. The button lives
 * outside the wrapper so focusing it produces a genuine outside blur, and
 * is rendered ahead of the field so the absolutely-positioned panel never
 * floats over it.
 */
function Harness({
	sections = FLAT_SECTIONS,
	onResultSelect = () => undefined
}: HarnessProps) {
	const [searchText, setSearchText] = useState('');

	return (
		<>
			<button type='button' data-test='harness-outside'>
				Outside
			</button>
			<SearchPanelKeyboardProvider searchText={searchText}>
				<HarnessField
					searchText={searchText}
					sections={sections}
					onSearchTextChange={setSearchText}
					onResultSelect={onResultSelect}
				/>
			</SearchPanelKeyboardProvider>
		</>
	);
}

function HarnessField({
	searchText,
	sections,
	onSearchTextChange,
	onResultSelect
}: Readonly<{
	searchText: string;
	sections: FormattedSearchSection[];
	onSearchTextChange: (value: string) => void;
	onResultSelect: (sourceIndex: number) => void;
}>) {
	const {isOpen, handleKeyDown, handleBlur} =
		useSearchPanelKeyboard();
	const [scope, setScope] = useState<string>(SCOPES[0]);

	return (
		<div onBlur={handleBlur}>
			<input
				data-test='harness-input'
				value={searchText}
				onKeyDown={handleKeyDown}
				onChange={event => {
					onSearchTextChange(event.target.value);
				}}
			/>

			{isOpen && (
				<SearchResultsPanel
					scopeControls={
						<HarnessScopeControls
							scope={scope}
							onScopeChange={setScope}
						/>
					}
					sections={sections}
					matchedTerm={searchText}
					resultLayout='inline'
					resetKey={scope}
					onResultSelect={onResultSelect}
				/>
			)}
		</div>
	);
}

function HarnessScopeControls({
	scope,
	onScopeChange
}: Readonly<{
	scope: string;
	onScopeChange: (scope: string) => void;
}>) {
	useRegisterScopeControls({
		availableScopes: SCOPES,
		effectiveScope: scope,
		onScopeChange
	});

	return <div data-test='harness-scope'>{scope}</div>;
}

/**
 * Types the query and waits for the list to mount, so the arrow keys that
 * follow are never dispatched before the panel has registered itself.
 */
function typeSearch(query: string) {
	cy.dataTest('harness-input').type(query);
	cy.get('[role="listbox"]').should('exist');
}

function pressKeys(keys: string) {
	cy.dataTest('harness-input').type(keys);
}

/** Asserts exactly which row carries the virtual focus, if any. */
function expectHighlighted(displayName?: string) {
	for (const name of ['Alpha', 'Beta']) {
		cy.dataTest(`search-result-${name}`).should(
			'have.attr',
			'aria-selected',
			String(name === displayName)
		);
	}
}

describe('SearchPanelKeyboardProvider', () => {
	it('opens the panel once the query is non-empty', () => {
		cy.mount(<Harness />);

		cy.dataTest('search-result-Alpha').should('not.exist');

		cy.dataTest('harness-input').type('al');

		cy.dataTest('search-result-Alpha').should('exist');
		expectHighlighted();
	});

	it('moves from the input into the list and clamps at the last row', () => {
		cy.mount(<Harness />);

		typeSearch('a');
		expectHighlighted();

		pressKeys('{downarrow}');
		expectHighlighted('Alpha');

		pressKeys('{downarrow}');
		expectHighlighted('Beta');

		pressKeys('{downarrow}');
		expectHighlighted('Beta');
	});

	it('walks back out of the list and returns to the input', () => {
		cy.mount(<Harness />);

		typeSearch('a');
		pressKeys('{downarrow}{downarrow}');
		expectHighlighted('Beta');

		pressKeys('{uparrow}');
		expectHighlighted('Alpha');

		pressKeys('{uparrow}');
		expectHighlighted();
	});

	it('selects the highlighted row on Enter', () => {
		const onResultSelect = cy.stub().as('onResultSelect');

		cy.mount(
			<Harness
				sections={CAPTIONED_SECTIONS}
				onResultSelect={onResultSelect}
			/>
		);

		typeSearch('a');
		pressKeys('{downarrow}{downarrow}{enter}');

		cy.get('@onResultSelect').should('have.been.calledOnceWith', 9);
	});

	it('ignores Enter while the caret is still in the input', () => {
		const onResultSelect = cy.stub().as('onResultSelect');

		cy.mount(
			<Harness
				sections={CAPTIONED_SECTIONS}
				onResultSelect={onResultSelect}
			/>
		);

		typeSearch('a');
		pressKeys('{enter}');

		cy.get('@onResultSelect').should('not.have.been.called');
		cy.dataTest('search-result-Gamma').should('exist');
	});

	it('cycles the scope chips with Left/Right once a row is highlighted', () => {
		cy.mount(<Harness />);

		typeSearch('a');
		pressKeys('{downarrow}{rightarrow}');
		cy.dataTest('harness-scope').should('have.text', 'peripherals');

		pressKeys('{leftarrow}');
		cy.dataTest('harness-scope').should('have.text', 'pins');

		pressKeys('{leftarrow}');
		cy.dataTest('harness-scope').should('have.text', 'signals');
	});

	it('leaves Left/Right to the caret while in input mode', () => {
		cy.mount(<Harness />);

		typeSearch('ab');
		pressKeys('{leftarrow}{rightarrow}');

		cy.dataTest('harness-scope').should('have.text', 'pins');
		expectHighlighted();
	});

	it('resets the highlight to the first row when the scope changes', () => {
		cy.mount(<Harness />);

		typeSearch('a');
		pressKeys('{downarrow}{downarrow}');
		expectHighlighted('Beta');

		pressKeys('{rightarrow}');

		cy.dataTest('harness-scope').should('have.text', 'peripherals');
		expectHighlighted('Alpha');
	});

	it('resets the highlight when the query changes', () => {
		cy.mount(<Harness />);

		typeSearch('a');
		pressKeys('{downarrow}{downarrow}');
		expectHighlighted('Beta');

		pressKeys('b');
		expectHighlighted();
	});

	it('claims the highlight for the hovered row', () => {
		cy.mount(<Harness />);

		typeSearch('a');
		cy.dataTest('search-result-Beta').realHover();

		expectHighlighted('Beta');
	});

	it('dismisses on Escape but keeps the typed query', () => {
		cy.mount(<Harness />);

		typeSearch('al');
		pressKeys('{esc}');

		cy.dataTest('search-result-Alpha').should('not.exist');
		cy.dataTest('harness-input').should('have.value', 'al');

		pressKeys('p');

		cy.dataTest('search-result-Alpha').should('exist');
	});

	it('dismisses on Tab', () => {
		cy.mount(<Harness />);

		typeSearch('al');

		cy.dataTest('harness-input').trigger('keydown', {key: 'Tab'});

		cy.dataTest('search-result-Alpha').should('not.exist');
	});

	it('dismisses when focus moves outside the search field', () => {
		cy.mount(<Harness />);

		typeSearch('al');

		cy.dataTest('harness-outside').click();

		cy.dataTest('search-result-Alpha').should('not.exist');
	});
});
