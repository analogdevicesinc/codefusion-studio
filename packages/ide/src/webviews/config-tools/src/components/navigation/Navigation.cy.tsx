import type {Soc} from '@common/types/soc';
import Navigation from './Navigation';
import {type CfsConfig} from 'cfs-types';
import {configurePreloadedStore} from '../../state/store';
import {resetClockNodes} from '../../utils/clock-nodes';
import {resetCoreMemoryDictionary} from '../../utils/memory';
import {resetPinDictionary} from '../../utils/soc-pins';
import {resetDfg} from '../../utils/dfg';

const socMax = await import('@socs/max32690-wlp.json').then(
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
});
