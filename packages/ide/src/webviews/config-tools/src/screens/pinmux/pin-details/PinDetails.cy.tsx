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

	it('Should correctly switch active peripheral', () => {
		const reduxStore = configurePreloadedStore(mock);

		const signals = [
			{Peripheral: 'GPIO1', Name: 'P1.8'},
			{Peripheral: 'I2C2', Name: 'SCL'},
			{Peripheral: 'PT2', Name: 'PT2'},
			{Peripheral: 'UART2', Name: 'RTS'}
		];

		signals.forEach(({Peripheral, Name}) => {
			reduxStore.dispatch(
				setAppliedSignal({
					Pin: 'A2',
					Peripheral,
					Name
				})
			);
		});

		reduxStore.dispatch(setPinDetailsTargetPin('A2'));

		cy.mount(<PinDetails />, reduxStore);

		// Each signal should have a configure button that, when clicked,
		// sets the active peripheral and signal in the state
		signals.forEach(({Peripheral, Name}) => {
			cy.dataTest(`configure-${Peripheral}-${Name}-button`)
				.click()
				.then(() => {
					const state = reduxStore.getState().peripheralsReducer;

					expect(state.activePeripheral).to.equal(Peripheral);
					expect(state.activeSignal).to.equal(
						`${Peripheral} ${Name}`
					);
				});
		});
	});
});
