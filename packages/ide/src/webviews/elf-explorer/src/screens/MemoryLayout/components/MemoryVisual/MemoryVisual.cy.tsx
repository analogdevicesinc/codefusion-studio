import MemoryVisual from './MemoryVisual';

describe('MemoryVisual', () => {
	before(() => {
		cy.viewport(1280, 720);
		cy.mount(
			<MemoryVisual
				segments={[]}
				hoveredItem={undefined}
				hoverSource={undefined}
				onClick={cy.stub()}
				onHover={cy.stub()}
				onMouseLeave={cy.stub()}
			/>
		);
	});

	it('Should display no data message when segments are empty', () => {
		cy.contains('No visual representation available.').should(
			'exist'
		);
	});
});
