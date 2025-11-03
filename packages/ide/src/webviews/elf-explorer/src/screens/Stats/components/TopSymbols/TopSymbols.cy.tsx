import {LocalizationProvider} from '../../../../../../common/contexts/LocaleContext';
import TopSymbols from './TopSymbols';

describe('TopSymbols', () => {
	beforeEach(() => {
		cy.mockElfParser();
	});

	beforeEach(() => {
		const mockedData = JSON.parse(
			localStorage.getItem('ELFParser') ?? ''
		);

		(window as any).__webview_localization_resources__ = {
			elf: {
				stats: {
					topSymbols: {
						title: 'Largest Symbols',
						tooltips: {
							title: 'tooltip title'
						}
					}
				}
			}
		};

		cy.mount(
			<LocalizationProvider namespace='elf'>
				<TopSymbols
					symbols={mockedData?.symbols || []}
					savedOptions={mockedData?.savedOptions}
					onUpdateOptions={cy.stub()}
				/>
			</LocalizationProvider>
		);
	});

	it('Should mount component', () => {
		cy.dataTest('stats:top-symbols-container').should('exist');
	});

	it('should render the title and table', () => {
		cy.contains('Largest Symbols').should('exist');
		cy.dataTest('stats:top-symbols-table').should('exist');
		cy.dataTest('section-name-with-circle:container').should('exist');
	});
});
