import Metadata from '../../Metadata';
import Charts from './Charts';

describe('Charts', () => {
	beforeEach(() => {
		(window as any).__webview_localization_resources__ = {
			elf: {
				metadata: {size: {}}
			}
		};
	});

	it('Should mount component', () => {
		cy.mount(<Charts sections={[]} />);
		cy.dataTest('metadata:chart').should('exist');
		cy.dataTest('metadata:chart:legend').should('exist');
	});

	it('Should display different buckets in the legend', () => {
		cy.mockElfParser();

		cy.mount(<Metadata />);
		cy.dataTest('metadata:chart:legend').should('exist');
		cy.dataTest('metadata:chart:legend:label-text')
			.should('exist')
			.and('have.text', 'text (408 B)');
		cy.dataTest('metadata:chart:legend:label-data')
			.should('exist')
			.and('have.text', 'data (480 B)');
		cy.dataTest('metadata:chart:legend:label-bss')
			.should('exist')
			.and('have.text', 'bss (3.31 KB)');
	});
});
