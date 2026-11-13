/**
 *
 * Copyright (c) 2026 Analog Devices, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import type {Soc} from '@common/types/soc';
import {configurePreloadedStore} from '../../../state/store';
import {
	setActivePeripheral,
	setActiveSignal,
	setSignalAssignment
} from '../../../state/slices/peripherals/peripherals.reducer';
import {setActiveConfiguredSignal} from '../../../state/slices/app-context/appContext.reducer';
import {setAppliedSignal} from '../../../state/slices/pins/pins.reducer';
import PinConfigTask from './pin-config-task';
import {LocalizationProvider} from '@common/contexts/LocaleContext';
import type {CfsConfig} from 'cfs-types';
import l10n from '../../../../../../../l10n/bundle.l10n.en.json';

(window as any).__webview_localization_resources__ = l10n;

const mock = (await import(`@socs/max32690-tqfn.json`).then(
	module => module.default
)) as unknown as Soc;

const configDictBase = {
	BoardName: '',
	Package: 'WLP',
	Soc: 'MAX32690',
	Projects: [
		{
			Description: 'ARM Cortex-M4',
			FirmwarePlatform: 'baremetal',
			CoreId: 'CM4',
			Name: 'ARM Cortex-M4',
			PluginId: 'registers',
			PluginVersion: '1.0.0',
			ProjectId: 'CM4-proj',
			ExternallyManaged: false
		}
	]
} as unknown as CfsConfig;

type ConfigurePinOptions = {
	readonly config?: CfsConfig;
	readonly peripheral?: string;
	readonly signal?: string;
	readonly pinId?: string;
	readonly pinConfig?: Record<string, string>;
};

const configurePin = ({
	config = configDictBase,
	peripheral = 'GPIO0',
	signal = 'P0.7',
	pinId = '7',
	pinConfig = {
		MODE: 'IN',
		PWR: 'VDDIO',
		PS: 'DIS'
	}
}: ConfigurePinOptions = {}) => {
	const reduxStore = configurePreloadedStore(mock, config);

	reduxStore.dispatch(
		setSignalAssignment({
			peripheral,
			signalName: signal,
			projectId: 'CM4-proj'
		})
	);
	reduxStore.dispatch(setActivePeripheral(peripheral));
	reduxStore.dispatch(
		setActiveSignal({
			peripheral,
			signal,
			keepActivePeripheral: true
		})
	);
	reduxStore.dispatch(
		setAppliedSignal({
			Pin: pinId,
			Peripheral: peripheral,
			Name: signal,
			PinCfg: pinConfig
		})
	);
	reduxStore.dispatch(
		setActiveConfiguredSignal({
			peripheralName: peripheral,
			signalName: signal,
			pinId
		})
	);

	return reduxStore;
};

describe('Pin Configuration Task', () => {
	beforeEach(() => {
		cy.viewport(262, 688);
	});

	it('Renders pin configuration and pin details and hides unavailable plugin options', () => {
		cy.fixture('32690-wlp-baremetal-pinconfig-controls.json').then(
			controls => {
				localStorage.setItem(
					'pluginControls:CM4-proj',
					JSON.stringify(controls)
				);
			}
		);

		const reduxStore = configurePin();

		cy.mount(
			<LocalizationProvider namespace='cfgtools'>
				<PinConfigTask peripheral='GPIO0' signal='P0.7' />
			</LocalizationProvider>,
			reduxStore
		).then(() => {
			cy.dataTest('config-section:configuration').should('exist');
			cy.dataTest('MODE-P0.7-control-dropdown').should('be.visible');
			cy.dataTest('config-sidebar:pin-details').should('exist');
			cy.dataTest('config-sidebar:plugin-options').should(
				'not.exist'
			);
			cy.dataTest('plugin-info:firmware').should('not.exist');
		});
	});

	it('Renders code generation plugin options when available', () => {
		cy.fixture('32690-wlp-baremetal-pinconfig-controls.json').then(
			controls => {
				controls.PinConfig.push({
					Id: 'ALIAS',
					Description: 'Alias',
					Type: 'text',
					PluginOption: true
				});
				localStorage.setItem(
					'pluginControls:CM4-proj',
					JSON.stringify(controls)
				);
			}
		);

		cy.mount(
			<LocalizationProvider namespace='cfgtools'>
				<PinConfigTask peripheral='GPIO0' signal='P0.7' />
			</LocalizationProvider>,
			configurePin()
		);

		cy.dataTest('config-sidebar:plugin-options').should('exist');
		cy.dataTest('ALIAS-P0.7-control-input').should('exist');
		cy.dataTest('plugin-info:firmware').should(
			'have.text',
			'MAX32690 Baremetal'
		);
	});

	it('Hides configuration when only plugin controls apply', () => {
		localStorage.setItem(
			'pluginControls:CM4-proj',
			JSON.stringify({
				PinConfig: [
					{
						Id: 'ALIAS',
						Description: 'Alias',
						Type: 'text',
						PluginOption: true
					}
				]
			})
		);

		cy.mount(
			<LocalizationProvider namespace='cfgtools'>
				<PinConfigTask peripheral='HYP' signal='CLKP' />
			</LocalizationProvider>,
			configurePin({
				peripheral: 'HYP',
				signal: 'CLKP',
				pinId: '29',
				pinConfig: {}
			})
		);

		cy.dataTest('config-section:configuration').should('not.exist');
		cy.dataTest('config-sidebar:plugin-options').should('exist');
		cy.dataTest('ALIAS-CLKP-control-input').should('exist');
	});

	it('Hides standard and plugin controls with false conditions', () => {
		localStorage.setItem(
			'pluginControls:CM4-proj',
			JSON.stringify({
				PinConfig: [
					{
						Id: 'MODE',
						Description: 'Mode',
						Type: 'enum',
						Condition: `\${String:HIDDEN} \${String:VISIBLE} =`
					},
					{
						Id: 'HIDDEN_ALIAS',
						Description: 'Hidden alias',
						Type: 'text',
						PluginOption: true,
						Condition: `\${String:HIDDEN} \${String:VISIBLE} =`
					}
				]
			})
		);

		cy.mount(
			<LocalizationProvider namespace='cfgtools'>
				<PinConfigTask peripheral='GPIO0' signal='P0.7' />
			</LocalizationProvider>,
			configurePin()
		);

		cy.dataTest('config-section:configuration').should('not.exist');
		cy.dataTest('config-sidebar:plugin-options').should('not.exist');
		cy.dataTest('MODE-P0.7-control-dropdown').should('not.exist');
		cy.dataTest('HIDDEN_ALIAS-P0.7-control-input').should(
			'not.exist'
		);
	});

	it('Hides sections when non-empty controls do not apply', () => {
		cy.fixture('32690-wlp-baremetal-pinconfig-controls.json').then(
			controls => {
				controls.PinConfig.push({
					Id: 'HIDDEN_ALIAS',
					Description: 'Hidden alias',
					Type: 'text',
					PluginOption: true,
					Condition: `\${String:HIDDEN} \${String:VISIBLE} =`
				});
				localStorage.setItem(
					'pluginControls:CM4-proj',
					JSON.stringify(controls)
				);
			}
		);

		const reduxStore = configurePin({
			peripheral: 'HYP',
			signal: 'CLKP',
			pinId: '29',
			pinConfig: {MODE: 'IN'}
		});

		cy.mount(
			<LocalizationProvider namespace='cfgtools'>
				<PinConfigTask peripheral='HYP' signal='CLKP' />
			</LocalizationProvider>,
			reduxStore
		);

		cy.dataTest('config-section:configuration').should('not.exist');
		cy.dataTest('config-sidebar:plugin-options').should('not.exist');
		cy.dataTest('HIDDEN_ALIAS-CLKP-control-input').should(
			'not.exist'
		);
		cy.wrap(null).should(() => {
			const configuredSignal = reduxStore
				.getState()
				.pinsReducer.pins['29']?.appliedSignals.find(
					signal =>
						signal.Peripheral === 'HYP' && signal.Name === 'CLKP'
				);

			expect(configuredSignal?.PinCfg).to.deep.equal({});
		});
	});

	it('Does not render pin configuration form and shows externally managed message', () => {
		const configDict = {
			...configDictBase,
			Projects: [
				{
					...configDictBase.Projects[0],
					ExternallyManaged: true
				}
			]
		} as unknown as CfsConfig;

		const reduxStore = configurePin({config: configDict});

		cy.mount(
			<LocalizationProvider namespace='cfgtools'>
				<PinConfigTask peripheral='GPIO0' signal='P0.7' />
			</LocalizationProvider>,
			reduxStore
		);
		cy.dataTest('package-display-info').should('not.exist');

		cy.dataTest('config-unavailable:message')
			.should('exist')
			.contains(
				'This signal is allocated to a project that is externally managed'
			);

		cy.dataTest('config-sidebar:plugin-options').should('not.exist');

		cy.dataTest('plugin-info:firmware').should('not.exist');

		cy.dataTest('plugin-info:version').should('not.exist');
	});
});
