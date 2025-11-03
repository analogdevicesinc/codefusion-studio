import SymbolTypes from './SymbolTypes';

describe('Symbol Types', () => {
	beforeEach(() => {
		cy.mockElfParser();
	});

	beforeEach(() => {
		const mockedData = JSON.parse(
			localStorage.getItem('ELFParser') ?? ''
		);

		cy.mount(<SymbolTypes symbols={mockedData?.symbols || []} />);
	});

	it('Should mount component', () => {
		cy.dataTest('stats:symbol-types-container').should('exist');
	});

	it('Should render the title and the tables', () => {
		cy.contains('Functions by binding').should('exist');
		cy.contains('Variables by binding').should('exist');
		cy.dataTest('stats:symbol-types-table')
			.should('exist')
			.and('have.length', 2);
	});

	it('Should update the filter', () => {
		cy.dataTest('stats:badge-filters-all').should(
			'have.attr',
			'appearance',
			'primary'
		);

		cy.dataTest('stats:badge-filters-text').click();

		cy.dataTest('stats:badge-filters-text').should(
			'have.attr',
			'appearance',
			'primary'
		);
	});
});
