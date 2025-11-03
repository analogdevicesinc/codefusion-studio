import SymbolsFilters from './SymbolsFilters';

describe('Symbols Filters', () => {
	beforeEach(() => {
		cy.mount(
			<SymbolsFilters
				queryToSet='SELECT * FROM symbols'
				error={undefined}
				emitQuery={cy.stub()}
			/>
		);
	});

	it('Should mount component', () => {
		cy.dataTest('symbols:filters-container').should('exist');
		cy.dataTest('symbols:filter:query-input').should('exist');
		cy.dataTest('symbols:dropdown-container').should('exist');
	});

	it('should update the query value and trigger emitQuery on Enter', () => {
		const emitQueryStub = cy.stub();

		cy.mount(
			<SymbolsFilters
				queryToSet='SELECT * FROM symbols'
				error={undefined}
				emitQuery={emitQueryStub}
			/>
		);
		cy.dataTest('symbols:filter:on-query-clear').click();

		cy.dataTest('symbols:filter:query-input')
			.shadow()
			.find('input')
			.type('SELECT * FROM symbols WHERE size > 100');

		cy.dataTest('symbols:filter:query-input')
			.shadow()
			.find('input')
			.type('{enter}');

		cy.wrap(emitQueryStub).should(
			'have.been.calledWith',
			'SELECT * FROM symbols WHERE size > 100'
		);
	});
});
