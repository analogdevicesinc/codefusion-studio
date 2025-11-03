import HeaderInfoListItem from './HeaderInfoListItem';
import type {THeaderInfo} from '../../../../common/types/metadata';
import {LocalizationProvider} from '../../../../../../common/contexts/LocaleContext';

describe('HeaderInfoListItem component', () => {
	const mockedItem: THeaderInfo = {
		label: 'Flags',
		value: '0x05000200, Version5 EABI, soft-float ABI'
	};

	it('Should mount', () => {
		cy.mount(<HeaderInfoListItem item={mockedItem} />);
		cy.get('li').should('exist');
	});

	it('Should display value as it is', () => {
		cy.mount(<HeaderInfoListItem item={mockedItem} />);
		cy.dataTest('list-item:value').should(
			'have.text',
			'0x05000200, Version5 EABI, soft-float ABI'
		);
	});

	it('Should display value with added suffix', () => {
		const mockedItem: THeaderInfo = {
			label: 'Section headers start',
			value: '622644'
		};
		cy.mount(<HeaderInfoListItem item={mockedItem} />);

		cy.dataTest('list-item:value').should(
			'have.text',
			'622644 (bytes into file)'
		);
	});

	it('Should handle multiple items correctly', () => {
		const items = [
			{label: 'Flags', value: '0x05000200, Version5 EABI'},
			{label: 'Section headers start', value: '622644'}
		];

		items.forEach(item => {
			cy.mount(<HeaderInfoListItem item={item} />);
			cy.get('li').should('contain.text', item.value);
		});
	});

	it('Should show info icon on hover', () => {
		const mockedItem: THeaderInfo = {
			label: 'Class',
			value: 'ELF32'
		};

		(window as any).__webview_localization_resources__ = {
			elf: {
				metadata: {
					header: {
						tooltips: {
							list: {
								Class: {
									title:
										'Indicates the file type, either ELF32 or ELF64'
								}
							}
						}
					}
				}
			}
		};

		cy.mount(
			<LocalizationProvider namespace='elf'>
				<HeaderInfoListItem item={mockedItem} />
			</LocalizationProvider>
		);

		cy.dataTest('list-item:button').should('not.exist');
		cy.get('li')
			.trigger('mouseover')
			.trigger('mousemove')
			.trigger('mouseenter');

		cy.dataTest('list-item:button').should('exist');

		cy.get('li').trigger('mouseout').trigger('mouseleave');
		cy.dataTest('list-item:button').should('not.exist');
	});

	it('Should show tooltip on hover with the correct title ', () => {
		const mockedItem: THeaderInfo = {
			label: 'Class',
			value: 'ELF32'
		};

		(window as any).__webview_localization_resources__ = {
			elf: {
				metadata: {
					header: {
						tooltips: {
							list: {
								Class: {
									title:
										'Indicates the file type, either ELF32 or ELF64'
								}
							}
						}
					}
				}
			}
		};

		cy.mount(
			<LocalizationProvider namespace='elf'>
				<HeaderInfoListItem item={mockedItem} />
			</LocalizationProvider>
		);

		cy.get('li')
			.trigger('mouseover')
			.trigger('mousemove')
			.trigger('mouseenter');

		cy.dataTest('list-item:button')
			.trigger('mouseover')
			.trigger('mousemove')
			.trigger('mouseenter');

		cy.dataTest('tooltip:title')
			.should('exist')
			.should(
				'have.text',
				'Indicates the file type, either ELF32 or ELF64'
			);

		cy.get('li').trigger('mouseout').trigger('mouseleave');
		cy.dataTest('list-item:button').should('not.exist');
	});
});
