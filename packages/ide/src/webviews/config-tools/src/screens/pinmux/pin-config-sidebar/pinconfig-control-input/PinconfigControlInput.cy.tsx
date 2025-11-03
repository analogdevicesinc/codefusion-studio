/* eslint-disable no-template-curly-in-string */
import type {Soc} from '@common/types/soc';
import {configurePreloadedStore} from '../../../../state/store';
import PinconfigControlInput from './PinconfigControlInput';
import {setAppliedSignal} from '../../../../state/slices/pins/pins.reducer';
import {setActiveConfiguredSignal} from '../../../../state/slices/app-context/appContext.reducer';
import {
	setActivePeripheral,
	setActiveSignal
} from '../../../../state/slices/peripherals/peripherals.reducer';

import type {CfsConfig} from 'cfs-plugins-api';
const wlp = (await import('@socs/max32690-wlp.json'))
	.default as unknown as Soc;

const configDict = {
	BoardName: '',
	Package: 'WLP',
	Soc: 'MAX32690',
	Projects: [
		{
			Description: 'ARM Cortex-M4',
			ExternallyManaged: false,
			FirmwarePlatform: '',
			CoreId: 'CM4',
			Name: 'ARM Cortex-M4',
			PluginId: '',
			ProjectId: 'CM4-proj'
		}
	]
} as unknown as CfsConfig;

describe('Pinconfig Input Field', () => {
	it('Should display an error message when an invalid text is provided.', () => {
		const store = configurePreloadedStore(wlp, configDict);

		store.dispatch(setActivePeripheral('GPIO0'));
		store.dispatch(
			setActiveSignal({
				peripheral: 'GPIO0',
				signal: 'P0.11',
				keepActivePeripheral: true
			})
		);

		store.dispatch(
			setAppliedSignal({
				Pin: 'F2',
				Peripheral: 'GPIO0',
				Name: 'P0.11'
			})
		);

		store.dispatch(
			setActiveConfiguredSignal({
				peripheralName: 'GPIO0',
				signalName: 'P0.11',
				pinId: 'F2'
			})
		);

		cy.mount(
			<PinconfigControlInput
				pinId='F2'
				peripheral='GPIO0'
				signal='P0.11'
				controlCfg={{
					Id: 'DT_NAME',
					Description: 'Devicetree Identifier',
					Hint: '${String:gpio_} ${Node:Name} + lwr',
					Type: 'text',
					Condition: '${Node:Name} ${String:P[0-9]\\.[0-9]+} match',
					Pattern: '[a-zA-Z_][a-zA-Z0-9_]*'
				}}
			/>,
			store
		);

		cy.dataTest('DT_NAME-P0.11-control-input')
			.shadow()
			.find('input')
			.clear();

		cy.dataTest('DT_NAME-P0.11-control-input').realTouch();

		// Valid pattern for C identifiers are strings that start with a letter followed by letters, digits, or underscores
		cy.realType('011-gpio').then(() => {
			cy.wait(1000);

			cy.dataTest('DT_NAME-P0.11-error').should(
				'contain.text',
				'Invalid format for field'
			);

			cy.dataTest('DT_NAME-P0.11-control-input')
				.shadow()
				.find('input')
				.clear();

			cy.dataTest('DT_NAME-P0.11-control-input').realTouch();

			cy.realType('fd-34&').then(() => {
				cy.wait(1000);

				cy.dataTest('DT_NAME-P0.11-error').should(
					'contain.text',
					'Invalid format for field'
				);
			});
		});
	});

	it('Should not display an error message when there is no pattern provided.', () => {
		const store = configurePreloadedStore(wlp, configDict);

		store.dispatch(setActivePeripheral('GPIO0'));
		store.dispatch(
			setActiveSignal({
				peripheral: 'GPIO0',
				signal: 'P0.11',
				keepActivePeripheral: true
			})
		);

		store.dispatch(
			setAppliedSignal({
				Pin: 'F2',
				Peripheral: 'GPIO0',
				Name: 'P0.11'
			})
		);

		store.dispatch(
			setActiveConfiguredSignal({
				peripheralName: 'GPIO0',
				signalName: 'P0.11',
				pinId: 'F2'
			})
		);

		cy.mount(
			<PinconfigControlInput
				pinId='F2'
				peripheral='GPIO0'
				signal='P0.11'
				controlCfg={{
					Id: 'DT_NAME',
					Description: 'Devicetree Identifier',
					Hint: '${String:gpio_} ${Node:Name} + lwr',
					Type: 'text',
					Condition: '${Node:Name} ${String:P[0-9]\\.[0-9]+} match'
				}}
			/>,
			store
		);

		cy.dataTest('DT_NAME-P0.11-control-input')
			.shadow()
			.find('input')
			.clear();

		cy.dataTest('DT_NAME-P0.11-control-input').realTouch();

		// Valid pattern for C identifiers are strings that start with a letter followed by letters, digits, or underscores
		cy.realType('011-gpio').then(() => {
			cy.dataTest('DT_NAME-P0.11-error').should('not.exist');
		});
	});
});
