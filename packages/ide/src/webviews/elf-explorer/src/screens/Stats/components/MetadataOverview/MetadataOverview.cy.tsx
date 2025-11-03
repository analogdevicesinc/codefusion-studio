import MetadataOverview from './MetadataOverview';

describe('Metadata Overview', () => {
	beforeEach(() => {
		cy.viewport(1440, 900);
		cy.mockElfParser();
	});

	beforeEach(() => {
		const mockedData = JSON.parse(
			localStorage.getItem('ELFParser') ?? ''
		);

		const data = mockedData?.metadata?.header;
		const sections = mockedData?.sections;

		cy.mount(<MetadataOverview data={data} sections={sections} />);
	});

	it('Should display the correct file information', () => {
		const expectedTexts = [
			'ELF 32-bit',
			'LSB',
			'executable',
			'ARM',
			'UNIX - System V version 0',
			'statically linked',
			'with no debug_info',
			'stripped'
		];

		cy.dataTest('stats:overview-container')
			.children()
			.each(($el, idx) => {
				cy.wrap($el).should('include.text', expectedTexts[idx]);
			});
	});

	it('Should render the title', () => {
		cy.contains('File overview').should('be.visible');
	});

	it('Should render the correct number of metadata items', () => {
		cy.dataTest('stats:overview-container:item').should(
			'have.length',
			8
		);
	});

	it('Should display tooltips for metadata items', () => {
		cy.dataTest('stats:overview-container:item')
			.first()
			.trigger('mouseenter');
		cy.dataTest('tooltip:container').should('be.visible');
	});
});
