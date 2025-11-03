import HeaderInfo from './HeaderInfo';
import {LocalizationProvider} from '../../../../../../common/contexts/LocaleContext';
import './HeaderInfo.module.scss';

import mockedParserJSON from '../../../../../../../../cypress/fixtures/mockedParser.json';

describe('HeaderInfo component', () => {
	beforeEach(() => {
		(window as any).__webview_localization_resources__ = {
			elf: {
				metadata: {
					header: {
						title: 'Header Info',
						tooltips: {
							title: 'Header Info',
							description:
								'Contains essential metadata that the operating system needs to execute the file.</br>It enables the OS to correctly interpret and run the binary.'
						}
					}
				}
			}
		};

		cy.mount(
			<LocalizationProvider namespace='elf'>
				<HeaderInfo data={mockedParserJSON?.metadata?.header || []} />
			</LocalizationProvider>
		);
	});

	it('Should mount', () => {
		cy.dataTest('header-info:container').should('exist');
	});

	it('Should show icon on hover', () => {
		cy.dataTest('header-tooltip:icon').should('not.exist');
		cy.dataTest('header-tooltip:container')
			.trigger('mouseover')
			.trigger('mousemove')
			.trigger('mouseenter');

		cy.dataTest('header-tooltip:icon').should('exist');

		cy.dataTest('header-tooltip:container')
			.trigger('mouseout')
			.trigger('mouseleave');
		cy.dataTest('header-tooltip:icon').should('not.exist');
	});
});
