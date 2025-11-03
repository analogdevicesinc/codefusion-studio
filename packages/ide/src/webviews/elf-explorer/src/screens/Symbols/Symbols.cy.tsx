import {AppProvider} from '../../common/contexts/AppContext';
import Symbols from './Symbols';

import {DEFAULT_QUERY} from '../../common/constants/symbols';

describe('Symbols without data', () => {
	beforeEach(() => {
		cy.mount(
			<AppProvider>
				<Symbols />
			</AppProvider>
		);
	});

	it('Should render no data message', () => {
		cy.dataTest('symbols:container').should('exist');
		cy.dataTest('symbols:header').should('exist');
		cy.dataTest('symbols:no-data').should('exist');
	});
});

describe('Symbols with data', () => {
	beforeEach(() => {
		cy.mockElfParser();
		cy.mount(
			<AppProvider>
				<Symbols />
			</AppProvider>
		);
	});

	it('Should mount component', () => {
		cy.dataTest('symbols:container').should('exist');
		cy.dataTest('symbols:header').should('exist');
		cy.dataTest('symbols:no-data').should('not.exist');
	});

	it('Should display default query value', () => {
		cy.dataTest('symbols:filter:query-input').should(
			'have.value',
			DEFAULT_QUERY
		);
	});

	it('Should open modal on Save query', () => {
		cy.dataTest('symbols:filter:on-query-save').click();
		cy.dataTest('inner-modal').should('be.visible');
	});

	it('Should display the edited query value in modal', () => {
		const newQuery = 'SELECT * FROM symbols WHERE size > 1';
		cy.dataTest('symbols:filter:on-query-clear').click();

		cy.dataTest('symbols:filter:query-input').should(
			'have.value',
			''
		);

		cy.dataTest('symbols:filter:query-input')
			.shadow()
			.find('input')
			.type(newQuery);

		cy.dataTest('symbols:filter:query-input').should(
			'have.value',
			newQuery
		);

		cy.dataTest('symbols:filter:on-query-save').click();
		cy.dataTest('inner-modal').should('be.visible');

		cy.dataTest('symbols:filter:save-query-modal:query-input')
			.shadow()
			.find('input')
			.should('have.value', '');
	});
});
