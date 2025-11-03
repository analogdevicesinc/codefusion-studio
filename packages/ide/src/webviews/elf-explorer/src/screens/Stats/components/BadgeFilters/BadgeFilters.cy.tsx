import BadgeFilter from './BadgeFilters';

describe('BadgeFilter', () => {
	it('Should render all badges', () => {
		cy.mount(
			<BadgeFilter selectedFilter='All' onFilterClick={cy.stub()} />
		);

		cy.contains('All').should('exist');
		cy.contains('Text').should('exist');
		cy.contains('Data').should('exist');
		cy.contains('Bss').should('exist');
	});

	it('Should trigger onFilterClick when a badge is clicked', () => {
		const onFilterClick = cy.stub().as('onFilterClick');

		cy.mount(
			<BadgeFilter
				selectedFilter='All'
				onFilterClick={onFilterClick}
			/>
		);
		cy.contains('Text').click();
		cy.get('@onFilterClick').should(
			'have.been.calledOnceWith',
			'Text'
		);

		cy.contains('Data').click();
		cy.get('@onFilterClick').should('have.been.calledWith', 'Data');

		cy.contains('Bss').click();
		cy.get('@onFilterClick').should('have.been.calledWith', 'Bss');
	});

	it('Should apply the selected style to the active badge', () => {
		cy.mount(
			<BadgeFilter selectedFilter='Text' onFilterClick={cy.stub()} />
		);

		cy.dataTest('stats:badge-filters-text').should(
			'have.attr',
			'appearance',
			'primary'
		);

		cy.dataTest('stats:badge-filters-all').should(
			'have.attr',
			'appearance',
			'secondary'
		);

		cy.dataTest('stats:badge-filters-data').should(
			'have.attr',
			'appearance',
			'secondary'
		);

		cy.dataTest('stats:badge-filters-bss').should(
			'have.attr',
			'appearance',
			'secondary'
		);
	});
});
