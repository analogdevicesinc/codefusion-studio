/**
 *
 * Copyright (c) 2026 Analog Devices, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import type {CfsConfig} from 'cfs-types';
import type {Soc} from '@common/types/soc';
import {CONTROL_SCOPES} from '../../../constants/scopes';
import {setActiveConfiguredSignal} from '../../../state/slices/app-context/appContext.reducer';
import {
	removeAppliedSignal,
	setAppliedSignal
} from '../../../state/slices/pins/pins.reducer';
import {
	removePeripheralAssignment,
	setActivePeripheral,
	setSignalAssignment,
	setSignalGroupAssignment
} from '../../../state/slices/peripherals/peripherals.reducer';
import {configurePreloadedStore} from '../../../state/store';
import {createScopeConflictDictionary} from '../../../test-utils/scope-conflict-test-utils';
import PinFunction from './Function';

const mock = (await import(`@socs/max32690-tqfn.json`))
	.default as unknown as Soc;

const configDict = {
	BoardName: '',
	Package: 'TQFN',
	Soc: 'MAX32690',
	Projects: [
		{
			Description: 'ARM Cortex-M4',
			ExternallyManaged: false,
			FirmwarePlatform: 'zephyr',
			CoreId: 'CM4',
			Name: 'ARM Cortex-M4',
			PluginId: '',
			ProjectId: 'CM4-proj'
		}
	]
} as unknown as CfsConfig;

describe('Pinmux Function', () => {
	it('should render a conflict icon for assigned signals with scope conflicts', () => {
		const reduxStore = configurePreloadedStore(
			mock,
			configDict,
			undefined,
			createScopeConflictDictionary({
				scopeKey: 'CM4-proj zephyr dtnames IN',
				value: 'shared_gpio',
				controlScope: CONTROL_SCOPES.PIN_CONFIG,
				controlId: 'DT_NAME',
				projectId: 'CM4-proj',
				coreId: 'CM4',
				groupId: 'PinConfig',
				itemIds: ['P0.7', 'P0.8']
			})
		);
		const pin = mock.Packages[0].Pins.find(
			item => item.Name === '7'
		)!;

		reduxStore.dispatch(
			setSignalAssignment({
				peripheral: 'GPIO0',
				signalName: 'P0.7',
				projectId: 'CM4-proj'
			})
		);
		reduxStore.dispatch(setActivePeripheral('GPIO0'));
		reduxStore.dispatch(
			setAppliedSignal({
				Pin: '7',
				Peripheral: 'GPIO0',
				Name: 'P0.7',
				PinCfg: {
					MODE: 'IN',
					DT_NAME: 'shared_gpio'
				}
			})
		);
		reduxStore.dispatch(
			setActiveConfiguredSignal({
				peripheralName: 'GPIO0',
				signalName: 'P0.7',
				pinId: '7'
			})
		);

		cy.mount(
			<PinFunction
				peripheralGroup='GPIO0'
				name='P0.7'
				pins={[pin]}
			/>,
			reduxStore
		);

		cy.get('#signal-P0\\.7-conflict').should('exist');
	});

	it('correctly allocates a signal group', () => {
		const store = configurePreloadedStore(mock, configDict);

		store.dispatch(
			setSignalGroupAssignment({
				peripheral: 'MISC',
				projectId: 'CM4-proj',
				config: {}
			})
		);
		store.dispatch(
			setAppliedSignal({
				Pin: '13',
				Peripheral: 'MISC',
				Name: 'CLKEXT',
				PinCfg: {}
			})
		);

		const state = store.getState();
		const appliedSignals = Object.values(
			state.pinsReducer.pins
		).flatMap(pinState => pinState.appliedSignals);

		expect(
			state.peripheralsReducer.assignments.MISC?.projectId
		).to.equal('CM4-proj');
		expect(
			appliedSignals.some(
				signal =>
					signal.Pin === '13' &&
					signal.Peripheral === 'MISC' &&
					signal.Name === 'CLKEXT'
			)
		).to.equal(true);
	});

	it('correctly deallocates a signal group', () => {
		const store = configurePreloadedStore(mock, configDict);

		store.dispatch(
			setSignalGroupAssignment({
				peripheral: 'MISC',
				projectId: 'CM4-proj',
				config: {}
			})
		);
		store.dispatch(
			setAppliedSignal({
				Pin: '13',
				Peripheral: 'MISC',
				Name: 'CLKEXT',
				PinCfg: {}
			})
		);
		store.dispatch(
			removeAppliedSignal({
				Pin: '13',
				Peripheral: 'MISC',
				Name: 'CLKEXT'
			})
		);
		store.dispatch(removePeripheralAssignment({peripheral: 'MISC'}));

		const state = store.getState();
		const appliedSignals = Object.values(
			state.pinsReducer.pins
		).flatMap(pinState => pinState.appliedSignals);

		expect(state.peripheralsReducer.assignments.MISC).to.equal(
			undefined
		);
		expect(
			appliedSignals.some(
				signal =>
					signal.Pin === '13' &&
					signal.Peripheral === 'MISC' &&
					signal.Name === 'CLKEXT'
			)
		).to.equal(false);
	});
});
