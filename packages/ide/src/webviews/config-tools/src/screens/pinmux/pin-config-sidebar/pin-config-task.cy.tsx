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
import type {CfsConfig} from 'cfs-plugins-api';

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

describe('Pin Configuration Task', () => {
	beforeEach(() => {
		cy.viewport(262, 688);
	});

	it('Renders pin configuration form when project is not externally managed', () => {
		cy.fixture('32690-wlp-baremetal-pinconfig-controls.json').then(
			controls => {
				localStorage.setItem(
					'pluginControls:CM4-proj',
					JSON.stringify(controls)
				);
			}
		);

		const reduxStore = configurePreloadedStore(mock, configDictBase);

		reduxStore.dispatch(
			setSignalAssignment({
				peripheral: 'GPIO0',
				signalName: 'P0.7',
				projectId: 'CM4-proj'
			})
		);

		reduxStore.dispatch(setActivePeripheral('GPIO0'));

		reduxStore.dispatch(
			setActiveSignal({
				peripheral: 'GPIO0',
				signal: 'P0.7',
				keepActivePeripheral: true
			})
		);

		reduxStore.dispatch(
			setAppliedSignal({
				Pin: '7',
				Peripheral: 'GPIO0',
				Name: 'P0.7',
				PinCfg: {
					MODE: 'IN',
					PWR: 'VDDIO',
					PS: 'DIS'
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
			<PinConfigTask peripheral='GPIO0' signal='P0.7' />,
			reduxStore
		).then(() => {
			cy.dataTest('MODE-P0.7-control-dropdown').should('be.visible');

			cy.dataTest('config-sidebar:plugin-options')
				.should('exist')
				.within($ => {
					expect($.find('p').first()).to.have.text(
						'No plugin options available.'
					);
					cy.dataTest('plugin-info:firmware').should(
						'have.text',
						'MAX32690 Baremetal'
					);
					cy.dataTest('plugin-info:version').should(
						'have.text',
						'Version 1.0.0'
					);
				});
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

		const reduxStore = configurePreloadedStore(mock, configDict);

		reduxStore.dispatch(
			setSignalAssignment({
				peripheral: 'GPIO0',
				signalName: 'P0.7',
				projectId: 'CM4-proj'
			})
		);

		reduxStore.dispatch(setActivePeripheral('GPIO0'));

		reduxStore.dispatch(
			setActiveSignal({
				peripheral: 'GPIO0',
				signal: 'P0.7',
				keepActivePeripheral: true
			})
		);

		reduxStore.dispatch(
			setAppliedSignal({
				Pin: '7',
				Peripheral: 'GPIO0',
				Name: 'P0.7',
				PinCfg: {
					MODE: 'IN',
					PWR: 'VDDIO',
					PS: 'DIS'
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
			<PinConfigTask peripheral='GPIO0' signal='P0.7' />,
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
