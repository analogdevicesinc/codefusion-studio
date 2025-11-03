import AttributesList from './AttributesList';
import Metadata from '../../Metadata';

const noDataMessage = 'No heuristics information available.';

describe('Attributes list empty state', () => {
	beforeEach(() => {
		(window as any).__webview_localization_resources__ = {
			elf: {
				metadata: {}
			}
		};
	});

	it('Should mount component', () => {
		cy.mount(<AttributesList list={[]} i10n={undefined} />);
		cy.dataTest('metadata:list').should('exist');
	});

	it('Should display no data message', () => {
		cy.mount(
			<AttributesList
				list={[]}
				i10n={undefined}
				noDataMessage={noDataMessage}
			/>
		);
		cy.dataTest('metadata:list').should('exist');
		cy.dataTest('no-data:container').should(
			'have.text',
			noDataMessage
		);
	});
});

describe('Attributes list', () => {
	beforeEach(() => {
		cy.mockElfParser();

		(window as any).__webview_localization_resources__ = {
			elf: {
				metadata: {}
			}
		};
	});

	it('Should mount component', () => {
		cy.mount(<AttributesList list={[]} i10n={undefined} />);
		cy.dataTest('metadata:list').should('exist');
	});

	it('Should display data in both lists', () => {
		cy.mount(<Metadata />);

		cy.dataTest('metadata:list').should('exist');
		cy.dataTest('metadata:list:item')
			.should('exist')
			.and('have.length', 20);
	});
});
