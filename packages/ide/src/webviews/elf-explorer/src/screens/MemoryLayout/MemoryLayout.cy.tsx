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
});
