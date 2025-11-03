/* eslint-disable max-nested-callbacks */
import type {Soc} from '@common/types/soc';
import {configurePreloadedStore} from '../../../state/store';
import PinmuxSideContainer from './Side';
import {
	removeAppliedSignal,
	setAppliedSignal,
	setPinDetailsTargetPin
} from '../../../state/slices/pins/pins.reducer';
import {setActiveSearchString} from '../../../state/slices/app-context/appContext.reducer';

const mock = (await import('@socs/max32690-wlp.json'))
	.default as unknown as Soc;

describe('Pin mux side component', () => {
	it('Displays a conflict icon when pins are conflicting in peripheral navigation', () => {
		const reduxStore = configurePreloadedStore(mock);

		reduxStore.dispatch(
			setAppliedSignal({
				Pin: 'A2',
				Peripheral: 'GPIO1',
				Name: 'P1.8'
			})
		);

		reduxStore.dispatch(
			setAppliedSignal({
				Pin: 'A2',
				Peripheral: 'I2C2',
				Name: 'SCL'
			})
		);

		cy.mount(<PinmuxSideContainer />, reduxStore);

		cy.dataTest('accordion:conflict:GPIO1').should('exist');

		cy.dataTest('accordion:conflict:I2C2').should('exist');

		cy.dataTest('accordion:conflict:PT2').should('not.exist');

		cy.dataTest('accordion:conflict:UART2').should('not.exist');
	});

	it('Displays a conflict icon when pins are conflicting in pin details', () => {
		const reduxStore = configurePreloadedStore(mock);

		reduxStore.dispatch(
			setAppliedSignal({
				Pin: 'A2',
				Peripheral: 'GPIO1',
				Name: 'P1.8'
			})
		);

		reduxStore.dispatch(
			setAppliedSignal({
				Pin: 'A2',
				Peripheral: 'I2C2',
				Name: 'SCL'
			})
		);

		reduxStore.dispatch(setPinDetailsTargetPin('A2'));

		cy.mount(<PinmuxSideContainer />, reduxStore);

		cy.dataTest('pin:tooltip:conflictMarker').should('exist');
	});

	it('Displays a conflict icon when pins are conflicting in pin search', () => {
		const reduxStore = configurePreloadedStore(mock);

		reduxStore.dispatch(
			setAppliedSignal({
				Pin: 'A2',
				Peripheral: 'GPIO1',
				Name: 'P1.8'
			})
		);

		reduxStore.dispatch(
			setAppliedSignal({
				Pin: 'A2',
				Peripheral: 'I2C2',
				Name: 'SCL'
			})
		);

		reduxStore.dispatch(setPinDetailsTargetPin(undefined));

		reduxStore.dispatch(
			setActiveSearchString({
				searchContext: 'pinconfig',
				value: 'P1.8'
			})
		);

		cy.mount(<PinmuxSideContainer />, reduxStore).then(() => {
			cy.dataTest('pin:tooltip:conflictMarker')
				.should('exist')
				.then(() => {
					cy.wrap(
						reduxStore.dispatch(
							removeAppliedSignal({
								Pin: 'A2',
								Peripheral: 'I2C2',
								Name: 'SCL'
							})
						)
					).then(() => {
						cy.dataTest('pin:tooltip:conflictMarker').should(
							'not.exist'
						);
					});
				});
		});
	});
});
