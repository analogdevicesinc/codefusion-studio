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

import type {Soc} from '@common/types/soc';
import Navigation from './Navigation';
import {type CfsConfig} from 'cfs-types';
import {configurePreloadedStore} from '../../state/store';
import {resetClockNodes} from '../../utils/clock-nodes';
import {resetCoreMemoryDictionary} from '../../utils/memory';
import {resetPinDictionary} from '../../utils/soc-pins';
import {resetDfg} from '../../utils/dfg';
import {withFirewallTestData} from '../../screens/firewall-config/firewall-test-data';

const socMax = await import('@socs/max32690-wlp.json').then(
	module => module.default as unknown as Soc
);

const socAdsp = await import('@socs/adsp-sc834w-bga_ed.json').then(
	module => module.default as unknown as Soc
);

const configDict = {
	BoardName: '',
	Package: 'WLP',
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

const configDictWithMsdkFirmware = {
	BoardName: '',
	Package: 'WLP',
	Soc: 'MAX32690',
	Projects: [
		{
			Description: 'ARM Cortex-M4',
			ExternallyManaged: false,
			FirmwarePlatform: 'msdk',
			CoreId: 'CM4',
			Name: 'ARM Cortex-M4',
			PluginId: '',
			ProjectId: 'CM4-proj'
		}
	]
} as unknown as CfsConfig;

describe('Navigation', () => {
	beforeEach(() => {
		cy.clearLocalStorage();
	});

	describe('in MAX32690', () => {
		beforeEach(() => {
			resetClockNodes();
			resetCoreMemoryDictionary();
			resetDfg();
			resetPinDictionary();
		});

		it('should not render DFG tab when the Gaskets is not present in the config, or gaskets is empty', () => {
			const reduxStore = configurePreloadedStore(
				socMax,
				{} as CfsConfig
			);
			cy.mount(<Navigation />, reduxStore);

			cy.get('[data-test="nav-item:dfg"]').should('not.exist');
		});

		it('should render Clock Config tab when the ClockNodes is present in the config', () => {
			const reduxStore = configurePreloadedStore(
				socMax,
				{} as CfsConfig
			);
			cy.mount(<Navigation />, reduxStore);

			cy.get('[data-test="nav-item:clockconfig"]').should('exist');
		});

		it('should render Memory tab when the Memory is present in the config', () => {
			const reduxStore = configurePreloadedStore(
				socMax,
				{} as CfsConfig
			);
			cy.mount(<Navigation />, reduxStore);

			cy.get('[data-test="nav-item:memory"]').should('exist');
		});

		it('should render Pinmux tab when the Pins are present in the config', () => {
			const reduxStore = configurePreloadedStore(
				socMax,
				{} as CfsConfig
			);
			cy.mount(<Navigation />, reduxStore);

			cy.get('[data-test="nav-item:pinmux"]').should('exist');
		});

		it('should render MCU Boot Config tab when SOC is ADAU2042 and Zephyr project exists', () => {
			const configWithGranite = {
				Soc: 'ADAU2042',
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

			const socWithMcuboot = {
				...socMax,
				supportsMCUboot: true
			} as unknown as Soc;
			const reduxStore = configurePreloadedStore(
				socWithMcuboot,
				configWithGranite
			);
			cy.mount(<Navigation />, reduxStore);

			cy.get('[data-test="nav-item:mcubootConfig"]').should('exist');
		});

		it('should not render MCU Boot Config tab when its unsupported SOC and no Zephyr projects', () => {
			const reduxStore = configurePreloadedStore(
				socMax,
				configDictWithMsdkFirmware
			);
			cy.mount(<Navigation />, reduxStore);

			cy.get('[data-test="nav-item:mcubootConfig"]').should(
				'not.exist'
			);
		});

		it('should render Settings tab when SOC is ADAU2042 and Zephyr project exists', () => {
			const configWithGranite = {
				Soc: 'ADAU2042',
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

			const socWithMcuboot = {
				...socMax,
				supportsMCUboot: true
			} as unknown as Soc;
			const reduxStore = configurePreloadedStore(
				socWithMcuboot,
				configWithGranite
			);
			cy.mount(<Navigation />, reduxStore);

			cy.get('[data-test="nav-item:settings"]').should('exist');
		});

		it('should render Settings tab when the SOC supports Firewall even without MCUboot support', () => {
			const configWithFirewallSupport = {
				Soc: 'ADAU2042',
				Projects: [
					{
						Description: 'ARM Cortex-M55',
						ExternallyManaged: false,
						FirmwarePlatform: 'zephyr',
						CoreId: 'CM55',
						Name: 'ARM Cortex-M55',
						PluginId: '',
						ProjectId: 'CM55-proj'
					}
				]
			} as unknown as CfsConfig;

			const reduxStore = configurePreloadedStore(
				withFirewallTestData(socMax),
				configWithFirewallSupport
			);
			cy.mount(<Navigation />, reduxStore);

			cy.get('[data-test="nav-item:settings"]').should('exist');
		});

		it('should not render Settings tab when SOC is unsupported and no Zephyr projects', () => {
			const reduxStore = configurePreloadedStore(
				socMax,
				configDictWithMsdkFirmware
			);
			cy.mount(<Navigation />, reduxStore);

			cy.get('[data-test="nav-item:settings"]').should('not.exist');
		});

		it('should not render Settings tab when SOC is supported but no Zephyr projects', () => {
			const configWithSupportedSocNoZephyr = {
				Soc: 'AD71270',
				Projects: [
					{
						Description: 'ARM Cortex-M4',
						ExternallyManaged: false,
						FirmwarePlatform: 'msdk',
						CoreId: 'CM4',
						Name: 'ARM Cortex-M4',
						PluginId: '',
						ProjectId: 'CM4-proj'
					}
				]
			} as unknown as CfsConfig;

			const reduxStore = configurePreloadedStore(
				socMax,
				configWithSupportedSocNoZephyr
			);
			cy.mount(<Navigation />, reduxStore);

			cy.get('[data-test="nav-item:settings"]').should('not.exist');
		});

		it('should not render Settings tab when SOC is unsupported but Zephyr project exists', () => {
			const reduxStore = configurePreloadedStore(socMax, configDict);
			cy.mount(<Navigation />, reduxStore);

			cy.get('[data-test="nav-item:settings"]').should('not.exist');
		});
	});

	describe('Firewall Navigation', () => {
		it('should render Firewall Config navigation tab when the SOC supports Firewall', () => {
			const configWithFirewallSupport = {
				Soc: 'ADAU2042',
				Projects: [
					{
						Description: 'M55',
						ExternallyManaged: false,
						FirmwarePlatform: 'zephyr',
						CoreId: 'CM55',
						Name: 'ARM Cortex-M55',
						PluginId: '',
						ProjectId: 'CM55-proj'
					}
				]
			} as unknown as CfsConfig;

			const reduxStore = configurePreloadedStore(
				withFirewallTestData(socMax),
				configWithFirewallSupport
			);
			cy.mount(<Navigation />, reduxStore);

			cy.get('[data-test="nav-item:firewallConfig"]').should('exist');
		});

		it('should not render Firewall Config navigation tab when the SOC does not support Firewall', () => {
			const configWithoutFirewallSupport = {
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

			const reduxStore = configurePreloadedStore(
				socMax,
				configWithoutFirewallSupport
			);
			cy.mount(<Navigation />, reduxStore);

			cy.get('[data-test="nav-item:firewallConfig"]').should(
				'not.exist'
			);
		});
	});

	describe('Signal Routing Unit Navigation', () => {
		it('should render Signal Routing Unit navigation tab when the models peripherals contain SRU', () => {
			const configWithSharcFxCore = {
				Soc: 'ADSP-SC834W',
				Projects: [
					{
						Description: 'SHARC-FX',
						ExternallyManaged: false,
						FirmwarePlatform: 'msdk',
						CoreId: 'FX',
						Name: 'SHARC-FX',
						PluginId: '',
						ProjectId: 'FX-proj'
					}
				]
			} as unknown as CfsConfig;

			const reduxStore = configurePreloadedStore(
				socAdsp,
				configWithSharcFxCore
			);
			cy.mount(<Navigation />, reduxStore);

			cy.get('[data-test="nav-item:signalRoutingUnit"]').should(
				'exist'
			);
		});

		it('should not render Signal Routing Unit navigation tab when the SoC is not ADSP', () => {
			const reduxStore = configurePreloadedStore(
				socMax,
				{} as CfsConfig
			);
			cy.mount(<Navigation />, reduxStore);

			cy.get('[data-test="nav-item:signalRoutingUnit"]').should(
				'not.exist'
			);
		});
	});
});
