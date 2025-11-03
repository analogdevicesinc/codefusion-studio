import Stats from './Stats';

describe('Stats', () => {
	beforeEach(() => {
		cy.viewport(1440, 900);
		cy.mockElfParser();

		cy.mount(<Stats />);
	});

	it('Should mount components', () => {
		cy.dataTest('stats:overview-container').should('exist');
		cy.dataTest('stats:container').should('exist');
		cy.dataTest('stats:chart-container').should('exist');
		cy.dataTest('stats:symbol-types-container').should('exist');
		cy.dataTest('stats:sections-container').should('exist');
		cy.dataTest('stats:top-symbols-container').should('exist');
	});
});
