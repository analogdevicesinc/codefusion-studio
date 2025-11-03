import {LocalizationProvider} from '../../../../common/contexts/LocaleContext';
import Metadata from './Metadata';

describe('Metadata', () => {
	beforeEach(() => {
		cy.mockElfParser();

		(window as any).__webview_localization_resources__ = {
			elf: {
				metadata: {
					header: {}
				}
			}
		};

		cy.mount(
			<LocalizationProvider namespace='elf'>
				<Metadata />
			</LocalizationProvider>
		);
	});

	it('Should mount all components', () => {
		cy.mount(<Metadata />);
		cy.dataTest('metadata:container').should('exist');
		cy.dataTest('metadata:chart').should('exist');
		cy.dataTest('header-info:container').should('exist');
		cy.dataTest('metadata:list').should('exist');
	});
});
