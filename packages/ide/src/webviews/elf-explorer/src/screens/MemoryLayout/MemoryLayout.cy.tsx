import {LocalizationProvider} from '../../../../common/contexts/LocaleContext';
import {AppProvider} from '../../common/contexts/AppContext';
import MemoryLayout from './MemoryLayout';

describe('MemoryLayout', () => {
	beforeEach(() => {
		cy.viewport(1280, 1000);
		cy.mockElfParser();

		cy.mount(
			<AppProvider>
				<LocalizationProvider namespace='elf'>
					<MemoryLayout />
				</LocalizationProvider>
			</AppProvider>
		);
	});

	it('Should mount all components', () => {
		cy.dataTest('memory-layout:container').should('exist');
		cy.dataTest('memory-layout:visual-container:segments').should(
			'exist'
		);
		cy.dataTest('memory-layout:table-container').should('exist');
	});

	it('Should display context menu on right-clicking a column', () => {
		cy.get('[title="0x10000000"]').rightclick();
		cy.dataTest('context-menu:memory-table')
			.should('be.visible')
			.should('contain', 'Show column as decimal');

		cy.dataTest('memory-table:footer').click();

		cy.get('[title="16,528"]').rightclick();
		cy.dataTest('context-menu:memory-table')
			.should('be.visible')
			.should('contain', 'Show column as hexadecimal');

		cy.dataTest('memory-table:footer').click();

		cy.get('[title="RWX"]').rightclick();
		cy.dataTest('context-menu:memory-table')
			.should('be.visible')
			.should('contain', 'Help - Flags');
	});

	it('Should go from Segments to Sections and to Symbols by clicking on memory visual block', () => {
		cy.dataTest('memory-layout:visual-container:segments').should(
			'exist'
		);
		cy.dataTest('memory-layout:visual-container:sections').should(
			'not.exist'
		);
		cy.dataTest('main-stack:item:LOAD-1').click();

		cy.dataTest('memory-layout:visual-container:sections').should(
			'exist'
		);

		cy.dataTest('main-stack:item:rom_start-1').click();
		cy.dataTest('memory-list:about:container').should('exist');
	});

	it('Should go from Segments to Sections and to Symbols by clicking on table row', () => {
		cy.dataTest('memory-layout:visual-container:sections').should(
			'not.exist'
		);
		cy.dataTest('memory-table:row:1').click();
		cy.dataTest('memory-layout:visual-container:sections').should(
			'exist'
		);
		cy.dataTest('memory-table:row:1').click();
		cy.dataTest('memory-list:about:container').should('exist');
	});

	it('Should display correct count of Segments, Sections, and Symbols', () => {
		cy.dataTest('memory-layout:visual-container:sections').should(
			'not.exist'
		);
		cy.dataTest('memory-table:footer').contains('6 Segments');

		cy.dataTest('memory-table:row:0').click();
		cy.dataTest('memory-layout:visual-container:sections').should(
			'exist'
		);
		cy.dataTest('memory-table:footer').contains('1 Sections');

		cy.dataTest('memory-table:row:3').click();
		cy.dataTest('memory-list:about:container').should('exist');
		cy.dataTest('memory-table:footer').contains('4 Symbols');
	});

	it('Should confirm content and title of columns on the Segment view', () => {
		cy.dataTest('memory-layout:visual-container:sections').should(
			'not.exist'
		);

		cy.dataTest('memory-table:row:1:column:id')
			.should('contain', '1')
			.and('have.attr', 'title', '1');
		cy.dataTest('memory-table:row:1:column:type')
			.should('contain', 'LOAD')
			.and('have.attr', 'title', 'LOAD');
		cy.dataTest('memory-table:row:1:column:address')
			.should('contain', '0x10000000')
			.and('have.attr', 'title', '0x10000000');
		cy.dataTest('memory-table:row:1:column:size')
			.should('contain', '16,528')
			.should('have.attr', 'title', '16,528');
		cy.dataTest('memory-table:row:1:column:size')
			.should('contain', '16,528')
			.and('have.attr', 'title', '16,528');
		cy.dataTest('memory-table:row:1:column:flags')
			.should('contain', 'RWX')
			.should('have.attr', 'title', 'RWX');
		cy.dataTest('memory-table:row:1:column:align')
			.should('contain', '4')
			.and('have.attr', 'title', '4');
	});

	it('Should confirm content and title of columns on the Sections view', () => {
		cy.dataTest('memory-layout:visual-container:sections').should(
			'not.exist'
		);

		cy.dataTest('memory-table:row:1').click();

		cy.dataTest('memory-table:row:1:column:id')
			.should('contain', '1')
			.and('have.attr', 'title', '1');
		cy.dataTest('memory-table:row:1:column:name')
			.should('contain', 'rom_start')
			.and('have.attr', 'title', 'rom_start');
		cy.dataTest('memory-table:row:1:column:address')
			.should('contain', '0x10000000')
			.and('have.attr', 'title', '0x10000000');
		cy.dataTest('memory-table:row:1:column:size')
			.should('contain', '304')
			.and('have.attr', 'title', '304');
		cy.dataTest('memory-table:row:1:column:flags')
			.should('contain', 'WAX')
			.should('have.attr', 'title', 'WAX');
		cy.dataTest('memory-table:row:1:column:type')
			.should('contain', 'PROGBITS')
			.and('have.attr', 'title', 'PROGBITS');
	});

	it('Should confirm content and title of columns on the Symbols view', () => {
		cy.dataTest('memory-layout:visual-container:sections').should(
			'not.exist'
		);

		cy.dataTest('memory-table:row:0').click();
		cy.dataTest('memory-table:row:3').click();

		cy.dataTest('memory-table:row:37:column:id')
			.should('contain', '37')
			.and('have.attr', 'title', '37');
		cy.dataTest('memory-table:row:37:column:name')
			.should('contain', '$d')
			.and('have.attr', 'title', '$d');
		cy.dataTest('memory-table:row:37:column:address')
			.should('contain', '0x10003B30')
			.and('have.attr', 'title', '0x10003B30');
		cy.dataTest('memory-table:row:37:column:size')
			.should('contain', '0')
			.and('have.attr', 'title', '0');
		cy.dataTest('memory-table:row:37:column:bind')
			.should('contain', 'LOCAL')
			.should('have.attr', 'title', 'LOCAL');
		cy.dataTest('memory-table:row:37:column:visibility')
			.should('contain', 'DEFAULT')
			.and('have.attr', 'title', 'DEFAULT');
	});
});
