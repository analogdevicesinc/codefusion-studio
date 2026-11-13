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

import type {Soc} from '../../../../../../common/types/soc';
import {LocalizationProvider} from '../../../../../../common/contexts/LocaleContext';
import {configurePreloadedStore} from '../../../../state/store';
import {
	setActiveResponderConfig,
	addFirewallZone,
	updateFirewallZone,
	updateResponderConfig
} from '../../../../state/slices/firewall/firewall.reducer';
import type {
	FirewallZone,
	ResponderConfigTarget
} from '../../../../types/firewall';
import {getEntryKey} from '../../firewall-data';
import {
	initializeFirewallTestData,
	withFirewallTestData
} from '../../firewall-test-data';
import FirewallConfigSidebar from './firewall-config-sidebar';

const soc = withFirewallTestData(
	(await import('@socs/max32690-wlp.json')).default as unknown as Soc
);

initializeFirewallTestData();

const PANEL = 'firewall-zones:responder-config';

// A responder whose data-model type is `ProgrammableRegion`, which makes the
// configuration sidebar editable.
const editableTarget: ResponderConfigTarget = {
	parent: 'D2D_Dd_Mem',
	child: 'd2d_dd_mem_0'
};

// A responder without a memory-region type, which renders the sidebar as
// read-only.
const readOnlyTarget: ResponderConfigTarget = {
	parent: 'M55_Itcm',
	child: 'm55_itcm_0'
};

const programmableKeys = [
	getEntryKey('responders', 'D2D_Dd_Mem', 'd2d_dd_mem_0'),
	getEntryKey('responders', 'D2D_Dd_Mem', 'd2d_dd_mem_1')
];

const overlappingZone: FirewallZone = {
	id: 'zone-1',
	name: 'Test Zone',
	description: '',
	accessMode: 'open',
	accessModes: {
		nonSecureNonPrivileged: true,
		nonSecurePrivileged: true,
		secureNonPrivileged: true,
		securePrivileged: true
	}
};

/**
 * Seeds a zone holding both programmable regions. Seeding gives them the same
 * default address, so they overlap until one is moved.
 */
function storeWithOverlappingRegions() {
	const reduxStore = configurePreloadedStore(soc);
	reduxStore.dispatch(addFirewallZone(overlappingZone));
	reduxStore.dispatch(
		updateFirewallZone({
			id: overlappingZone.id,
			updates: {selectedFirewalls: programmableKeys}
		})
	);

	return reduxStore;
}

function TestFirewallConfigSidebar() {
	return (
		<LocalizationProvider namespace='cfgtools'>
			<FirewallConfigSidebar />
		</LocalizationProvider>
	);
}

describe('FirewallConfigSidebar', () => {
	beforeEach(() => {
		cy.viewport(1920, 1080);
	});

	it('should not render the config fields when no responder is active', () => {
		const reduxStore = configurePreloadedStore(soc);

		cy.mount(<TestFirewallConfigSidebar />, reduxStore);

		cy.dataTest(PANEL).should('exist');
		cy.dataTest(`${PANEL}:name:trigger`).should('not.exist');
		cy.dataTest(`${PANEL}:description:trigger`).should('not.exist');
		cy.dataTest(`${PANEL}:start-address`).should('not.exist');
	});

	describe('read-only responder', () => {
		it('should render the responder name as a read-only title', () => {
			const reduxStore = configurePreloadedStore(soc);
			reduxStore.dispatch(setActiveResponderConfig(readOnlyTarget));

			cy.mount(<TestFirewallConfigSidebar />, reduxStore);

			cy.dataTest(PANEL).should('contain.text', 'M55_ITCM_0');
			cy.dataTest(`${PANEL}:name:trigger`).should('not.exist');
		});

		it('should not render editable controls for a read-only responder', () => {
			const reduxStore = configurePreloadedStore(soc);
			reduxStore.dispatch(setActiveResponderConfig(readOnlyTarget));

			cy.mount(<TestFirewallConfigSidebar />, reduxStore);

			cy.dataTest(`${PANEL}:description:trigger`).should('not.exist');
			cy.dataTest(`${PANEL}:start-address`).should('not.exist');
		});

		it('should render the data-model description when no override is set', () => {
			const reduxStore = configurePreloadedStore(soc);
			reduxStore.dispatch(setActiveResponderConfig(readOnlyTarget));

			cy.mount(<TestFirewallConfigSidebar />, reduxStore);

			cy.dataTest(PANEL).should(
				'contain.text',
				'Access Block for M55_Itcm (Local Region: 0)'
			);
		});

		it('should prefer a persisted description override over the data-model value', () => {
			const reduxStore = configurePreloadedStore(soc);
			reduxStore.dispatch(
				updateResponderConfig({
					parent: readOnlyTarget.parent,
					child: readOnlyTarget.child,
					updates: {description: 'Seeded description'}
				})
			);
			reduxStore.dispatch(setActiveResponderConfig(readOnlyTarget));

			cy.mount(<TestFirewallConfigSidebar />, reduxStore);

			cy.dataTest(PANEL).should('contain.text', 'Seeded description');
		});
	});

	describe('editable responder', () => {
		it('should render the editable name, description and start address controls', () => {
			const reduxStore = configurePreloadedStore(soc);
			reduxStore.dispatch(setActiveResponderConfig(editableTarget));

			cy.mount(<TestFirewallConfigSidebar />, reduxStore);

			cy.dataTest(`${PANEL}:name:trigger`).should('exist');
			cy.dataTest(`${PANEL}:description:trigger`).should('exist');
			cy.dataTest(`${PANEL}:start-address`).should('exist');
		});

		it('should persist the name to the responder config on confirm', () => {
			const reduxStore = configurePreloadedStore(soc);
			reduxStore.dispatch(setActiveResponderConfig(editableTarget));

			cy.mount(<TestFirewallConfigSidebar />, reduxStore);

			cy.dataTest(`${PANEL}:name:trigger`).click();

			cy.dataTest(`${PANEL}:name:edit-control-input`)
				.shadow()
				.within(() => {
					cy.get('#control').clear().type('Region A');
				});

			cy.dataTest('edit-input-confirm-btn').first().click();

			cy.then(() => {
				const config =
					reduxStore.getState().firewallReducer.responderConfigs[
						'responders::D2D_Dd_Mem::d2d_dd_mem_0'
					];
				expect(config?.name).to.equal('Region A');
			});

			cy.dataTest(`${PANEL}:name:trigger`).should(
				'contain.text',
				'Region A'
			);
		});

		it('should persist the description to the responder config on confirm', () => {
			const reduxStore = configurePreloadedStore(soc);
			reduxStore.dispatch(setActiveResponderConfig(editableTarget));

			cy.mount(<TestFirewallConfigSidebar />, reduxStore);

			cy.dataTest(`${PANEL}:description:trigger`).click();

			cy.dataTest(`${PANEL}:description:edit-control-input`)
				.shadow()
				.within(() => {
					cy.get('#control').clear().type('Updated description');
				});

			cy.dataTest('edit-input-confirm-btn').first().click();

			cy.then(() => {
				const config =
					reduxStore.getState().firewallReducer.responderConfigs[
						'responders::D2D_Dd_Mem::d2d_dd_mem_0'
					];
				expect(config?.description).to.equal('Updated description');
			});
		});

		it('should persist the start address to the responder config', () => {
			const reduxStore = configurePreloadedStore(soc);
			reduxStore.dispatch(setActiveResponderConfig(editableTarget));

			cy.mount(<TestFirewallConfigSidebar />, reduxStore);

			cy.dataTest(`${PANEL}:start-address`).click();
			cy.dataTest(`${PANEL}:start-address:0x20410000`).click();

			cy.then(() => {
				const config =
					reduxStore.getState().firewallReducer.responderConfigs[
						'responders::D2D_Dd_Mem::d2d_dd_mem_0'
					];
				expect(config?.startAddress).to.equal('0x20410000');
			});
		});

		it('should discard name changes on cancel', () => {
			const reduxStore = configurePreloadedStore(soc);
			reduxStore.dispatch(setActiveResponderConfig(editableTarget));

			cy.mount(<TestFirewallConfigSidebar />, reduxStore);

			cy.dataTest(`${PANEL}:name:trigger`).click();

			cy.dataTest(`${PANEL}:name:edit-control-input`)
				.shadow()
				.within(() => {
					cy.get('#control').clear().type('Discarded');
				});

			cy.dataTest('edit-input-cancel-btn').first().click();

			cy.then(() => {
				const config =
					reduxStore.getState().firewallReducer.responderConfigs[
						'responders::D2D_Dd_Mem::d2d_dd_mem_0'
					];
				expect(config?.name).to.equal(undefined);
			});
		});
	});

	it('should clear the active responder config when closed with Escape', () => {
		const reduxStore = configurePreloadedStore(soc);
		reduxStore.dispatch(setActiveResponderConfig(editableTarget));

		cy.mount(<TestFirewallConfigSidebar />, reduxStore);

		cy.dataTest(`${PANEL}:name:trigger`).should('exist');

		cy.dataTest(PANEL).trigger('keydown', {key: 'Escape'});

		cy.then(() => {
			expect(
				reduxStore.getState().firewallReducer.activeResponderConfig
			).to.equal(undefined);
		});

		cy.dataTest(`${PANEL}:name:trigger`).should('not.exist');
	});

	describe('address overlap', () => {
		it('should flag the start address when another region shares it', () => {
			const reduxStore = storeWithOverlappingRegions();
			reduxStore.dispatch(setActiveResponderConfig(editableTarget));

			cy.mount(<TestFirewallConfigSidebar />, reduxStore);

			cy.dataTest(`${PANEL}:start-address-error`).should('exist');
			cy.dataTest(`${PANEL}:conflict-banner`).should('exist');
		});

		it('should flag the other region as well', () => {
			const reduxStore = storeWithOverlappingRegions();
			reduxStore.dispatch(
				setActiveResponderConfig({
					parent: 'D2D_Dd_Mem',
					child: 'd2d_dd_mem_1'
				})
			);

			cy.mount(<TestFirewallConfigSidebar />, reduxStore);

			cy.dataTest(`${PANEL}:start-address-error`).should('exist');
		});

		it('should clear the error once the addresses differ', () => {
			const reduxStore = storeWithOverlappingRegions();
			reduxStore.dispatch(
				updateResponderConfig({
					parent: 'D2D_Dd_Mem',
					child: 'd2d_dd_mem_1',
					updates: {startAddress: '0x20410000'}
				})
			);
			reduxStore.dispatch(setActiveResponderConfig(editableTarget));

			cy.mount(<TestFirewallConfigSidebar />, reduxStore);

			cy.dataTest(`${PANEL}:start-address-error`).should('not.exist');
			cy.dataTest(`${PANEL}:conflict-banner`).should('not.exist');
		});

		it('should clear the error when the user picks a free address', () => {
			const reduxStore = storeWithOverlappingRegions();
			reduxStore.dispatch(setActiveResponderConfig(editableTarget));

			cy.mount(<TestFirewallConfigSidebar />, reduxStore);

			cy.dataTest(`${PANEL}:start-address-error`).should('exist');

			cy.dataTest(`${PANEL}:start-address`).click();
			cy.dataTest(`${PANEL}:start-address:0x20418000`).click();

			cy.dataTest(`${PANEL}:start-address-error`).should('not.exist');
		});

		it('should not flag a region that is alone in the zone', () => {
			const reduxStore = configurePreloadedStore(soc);
			reduxStore.dispatch(addFirewallZone(overlappingZone));
			reduxStore.dispatch(
				updateFirewallZone({
					id: overlappingZone.id,
					updates: {selectedFirewalls: [programmableKeys[0]]}
				})
			);
			reduxStore.dispatch(setActiveResponderConfig(editableTarget));

			cy.mount(<TestFirewallConfigSidebar />, reduxStore);

			cy.dataTest(`${PANEL}:start-address-error`).should('not.exist');
		});
	});
});
