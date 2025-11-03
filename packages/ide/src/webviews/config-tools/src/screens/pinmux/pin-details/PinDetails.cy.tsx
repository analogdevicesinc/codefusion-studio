import type {Soc} from '@common/types/soc';
import PinDetails from './PinDetails';
import {configurePreloadedStore} from '../../../state/store';
import {
	setAppliedSignal,
	setPinDetailsTargetPin
} from '../../../state/slices/pins/pins.reducer';

const mock = (await import('@socs/max32690-wlp.json'))
	.default as unknown as Soc;

describe('PinDetails component', () => {
	it('Should solve the pin conflict from PinDetails by changing the pin for a signal', () => {
		const reduxStore = configurePreloadedStore(mock);
		reduxStore.dispatch(
			setAppliedSignal({
				Pin: 'G9',
				Peripheral: 'CAN0',
				Name: 'RX'
			})
		);
		reduxStore.dispatch(
			setAppliedSignal({
				Pin: 'G9',
				Peripheral: 'GPIO2',
				Name: 'P2.22'
			})
		);
		reduxStore.dispatch(setPinDetailsTargetPin('G9'));

		cy.mount(<PinDetails />, reduxStore);

		cy.dataTest('CAN0-RX').should('exist');
		cy.dataTest('pin:tooltip:conflictMarker').should('exist');

		cy.dataTest('CAN0-RX').find('> vscode-dropdown').click();
		cy.dataTest('CAN0-RX')
			.find('> vscode-dropdown')
			.find('> vscode-option')
			.contains('J7')
			.click();

		cy.dataTest('pin:tooltip:conflictMarker').should('not.exist');
	});
});
