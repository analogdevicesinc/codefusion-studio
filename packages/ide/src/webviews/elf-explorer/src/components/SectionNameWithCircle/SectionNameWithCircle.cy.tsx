import SectionNameWithCircle from './SectionNameWithCircle';

describe('SectionNameWithCircle', () => {
	beforeEach(() => {
		cy.mockElfParser();
	});

	it('Should mount component', () => {
		cy.mount(
			<SectionNameWithCircle value='test value' bucket='Text' />
		);

		cy.dataTest('section-name-with-circle:container').should('exist');
		cy.dataTest('section-name-with-circle:style').should('exist');

		cy.dataTest('section-name-with-circle:style')
			.invoke('attr', 'class')
			.then(classList => {
				expect(classList).to.include('color');
			});

		cy.contains('test value').should('be.visible');
	});

	it('Should not display circle if wrong value', () => {
		cy.mount(
			<SectionNameWithCircle value='test value' bucket='text' />
		);

		cy.dataTest('section-name-with-circle:container').should('exist');

		cy.dataTest('section-name-with-circle:style')
			.invoke('attr', 'class')
			.then(classList => {
				expect(classList).to.not.include('color');
			});
	});
});
