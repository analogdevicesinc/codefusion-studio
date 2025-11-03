import {configurePreloadedStore} from '../../state/store';
import PinMUX from './PinMux';
import type {Soc} from '@common/types/soc';

const mock = (await import('@socs/max32690-wlp.json'))
	.default as unknown as Soc;

describe('PinMUX component', () => {
	beforeEach(() => {
		cy.viewport(1280, 800);
	});

	it('Should display the correct pins after filtering with the correct pin list for the peripheral - signal', () => {
		const reduxStore = configurePreloadedStore(mock);

		const canPeripheralResults = [
			{id: 'CAN0-TX', selectedPin: 'F9'},
			{id: 'CAN1-TX', selectedPin: 'G3'},
			{id: 'CAN0-RX', selectedPin: 'G9'},
			{id: 'CAN1-RX', selectedPin: 'L4'}
		];

		cy.mount(<PinMUX />, reduxStore);

		cy.dataTest('pinmux:header').should('exist');
		cy.dataTest('pinmux:peripheral-navigation').should('exist');
		cy.dataTest('pinmux:header').within(() => {
			cy.dataTest('search-control-input').should('exist');
			cy.dataTest('search-control-input')
				.shadow()
				.find('input')
				.type('CAN');
		});

		cy.dataTest('details-view:container').should('exist');
		cy.dataTest('details-view:container').within(() => {
			canPeripheralResults.forEach(item => {
				cy.dataTest(`${item.id}`)
					.should('exist')
					.find('> vscode-dropdown')
					.should(
						'have.attr',
						'current-value',
						`${item.selectedPin}`
					);
			});
		});
	});
});
