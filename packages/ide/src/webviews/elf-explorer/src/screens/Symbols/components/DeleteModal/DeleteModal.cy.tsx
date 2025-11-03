import DeleteQueryModal from './DeleteQueryModal';

describe('Delete query modal', () => {
	beforeEach(() => {
		cy.mount(
			<DeleteQueryModal
				query={{
					id: 1,
					name: 'Query name',
					value: 'SELECT * FROM symbols'
				}}
			/>
		);
	});

	it('Should mount component', () => {
		cy.dataTest('symbols:delete-modal-container').should('exist');
	});

	it('should display "<no name>" when query name is undefined', () => {
		const mockedQuery = {
			id: 1,
			name: '',
			value: 'SELECT * FROM symbols'
		};

		cy.mount(<DeleteQueryModal query={mockedQuery} />);

		cy.contains(
			'Please confirm you wish to delete "<no name>".'
		).should('exist');
	});
});
