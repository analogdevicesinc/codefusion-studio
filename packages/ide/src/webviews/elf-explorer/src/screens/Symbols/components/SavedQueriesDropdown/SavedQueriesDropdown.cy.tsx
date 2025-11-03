import SavedQueriesDropdown from './SavedQueriesDropdown';

describe('SavedQueriesDropdown', () => {
	beforeEach(() => {
		const queries = [
			{id: 1, name: 'Test Query', value: 'SELECT * FROM symbols'}
		];

		cy.mount(
			<SavedQueriesDropdown
				queries={queries}
				onEdit={cy.stub()}
				onDelete={cy.stub()}
				onClick={cy.stub()}
			/>
		);
	});

	it('Should mount component', () => {
		cy.dataTest('symbols:dropdown-container');
		cy.contains('Saved queries').should('exist');
	});

	it('Should open the delete modal on button click', () => {
		cy.get('#saved-queries').click();
		cy.dataTest('symbols:saved-query-container:delete-query').click();
		cy.dataTest('inner-modal').should('exist');
		cy.contains('Confirm delete').should('exist');

		cy.contains('Cancel').click();
	});

	it('Should open the edit modal on button click', () => {
		cy.get('#saved-queries').click();
		cy.dataTest('symbols:saved-query-container:edit-query').click();
		cy.dataTest('inner-modal').should('exist');

		cy.contains('Edit query Test Query').should('exist');
	});
});
