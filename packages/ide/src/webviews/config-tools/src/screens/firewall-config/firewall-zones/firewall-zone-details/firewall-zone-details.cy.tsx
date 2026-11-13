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
import {configurePreloadedStore} from '../../../../state/store';
import {LocalizationProvider} from '../../../../../../common/contexts/LocaleContext';
import {
	addFirewallZone,
	setActiveResponderConfig,
	setActiveZoneId,
	updateFirewallZone,
	updateResponderConfig
} from '../../../../state/slices/firewall/firewall.reducer';
import type {
	FirewallZone,
	FirewallZoneAccessModeId
} from '../../../../types/firewall';
import {getEntryKey, INITIATOR_GROUP_NAME} from '../../firewall-data';
import {
	initializeFirewallTestData,
	withFirewallTestData
} from '../../firewall-test-data';
import FirewallZoneDetails from './firewall-zone-details';

const soc = withFirewallTestData(
	(await import('@socs/max32690-wlp.json')).default as unknown as Soc
);

initializeFirewallTestData();

const SECURE_ONLY: Record<FirewallZoneAccessModeId, boolean> = {
	nonSecureNonPrivileged: false,
	nonSecurePrivileged: false,
	secureNonPrivileged: true,
	securePrivileged: true
};

const initiatorKey = getEntryKey(
	'initiators',
	INITIATOR_GROUP_NAME,
	'dma_dde_0'
);

const programmableKeys = [
	getEntryKey('responders', 'D2D_Dd_Mem', 'd2d_dd_mem_0'),
	getEntryKey('responders', 'D2D_Dd_Mem', 'd2d_dd_mem_1')
];

const testZone: FirewallZone = {
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

const responderKey = getEntryKey(
	'responders',
	'M55_Itcm',
	'm55_itcm_0'
);

const populatedZone: FirewallZone = {
	...testZone,
	selectedFirewalls: [responderKey]
};

function TestFirewallZoneDetails() {
	return (
		<LocalizationProvider namespace='cfgtools'>
			<FirewallZoneDetails />
		</LocalizationProvider>
	);
}

describe('FirewallZoneDetails', () => {
	beforeEach(() => {
		cy.viewport(1920, 1080);
	});

	it('should render nothing when there is no active zone', () => {
		const reduxStore = configurePreloadedStore(soc);

		cy.mount(<TestFirewallZoneDetails />, reduxStore);

		cy.dataTest(`firewall-zones:details:${testZone.id}`).should(
			'not.exist'
		);
	});

	it('should render the active zone details', () => {
		const reduxStore = configurePreloadedStore(soc);
		reduxStore.dispatch(addFirewallZone(testZone));

		cy.mount(<TestFirewallZoneDetails />, reduxStore);

		cy.dataTest(`firewall-zones:details:${testZone.id}`).should(
			'exist'
		);
		cy.contains('Test Zone').should('exist');
		cy.dataTest('firewall-zones:details:delete').should('exist');
		cy.dataTest('firewall-zones:manage-access-modes').should('exist');
	});

	it('should clear the responder override when the last referencing zone is deleted', () => {
		const reduxStore = configurePreloadedStore(soc);
		reduxStore.dispatch(addFirewallZone(populatedZone));
		reduxStore.dispatch(setActiveZoneId('zone-1'));
		reduxStore.dispatch(
			setActiveResponderConfig({
				parent: 'M55_Itcm',
				child: 'm55_itcm_0'
			})
		);
		reduxStore.dispatch(
			updateResponderConfig({
				parent: 'M55_Itcm',
				child: 'm55_itcm_0',
				updates: {name: 'Custom name'}
			})
		);

		cy.mount(<TestFirewallZoneDetails />, reduxStore);

		cy.dataTest('firewall-zones:details:delete').click();

		cy.dataTest('firewall-zones:details:delete-warning:confirm-btn')
			.click()
			.then(() => {
				const {responderConfigs, activeResponderConfig} =
					reduxStore.getState().firewallReducer;
				expect(responderConfigs[responderKey]).to.equal(undefined);
				expect(activeResponderConfig).to.equal(undefined);
			});
	});

	it('should keep the responder override when another zone still references it', () => {
		const secondZone: FirewallZone = {
			...testZone,
			id: 'zone-2',
			name: 'Second Zone',
			selectedFirewalls: [responderKey]
		};
		const reduxStore = configurePreloadedStore(soc);
		reduxStore.dispatch(addFirewallZone(populatedZone));
		reduxStore.dispatch(addFirewallZone(secondZone));
		reduxStore.dispatch(setActiveZoneId('zone-1'));
		reduxStore.dispatch(
			updateResponderConfig({
				parent: 'M55_Itcm',
				child: 'm55_itcm_0',
				updates: {name: 'Custom name'}
			})
		);

		cy.mount(<TestFirewallZoneDetails />, reduxStore);

		cy.dataTest('firewall-zones:details:delete').click();

		cy.dataTest('firewall-zones:details:delete-warning:confirm-btn')
			.click()
			.then(() => {
				const {responderConfigs} =
					reduxStore.getState().firewallReducer;
				expect(responderConfigs[responderKey]).to.deep.equal({
					name: 'Custom name'
				});
			});
	});

	describe('conflict banners', () => {
		it('should not render a banner when the zone has no conflicts', () => {
			const reduxStore = configurePreloadedStore(soc);
			reduxStore.dispatch(addFirewallZone(populatedZone));
			reduxStore.dispatch(setActiveZoneId('zone-1'));

			cy.mount(<TestFirewallZoneDetails />, reduxStore);

			cy.dataTest('firewall-zones:details:conflict-banner').should(
				'not.exist'
			);
		});

		it('should render the overlap banner when two regions share an address', () => {
			const reduxStore = configurePreloadedStore(soc);
			reduxStore.dispatch(addFirewallZone(testZone));
			reduxStore.dispatch(setActiveZoneId('zone-1'));
			// Going through updateFirewallZone seeds both regions with the same
			// default address, which is what creates the overlap.
			reduxStore.dispatch(
				updateFirewallZone({
					id: 'zone-1',
					updates: {selectedFirewalls: programmableKeys}
				})
			);

			cy.mount(<TestFirewallZoneDetails />, reduxStore);

			cy.dataTest('firewall-zones:details:conflict-banner').should(
				'exist'
			);
		});

		it('should clear the overlap banner once the addresses differ', () => {
			const reduxStore = configurePreloadedStore(soc);
			reduxStore.dispatch(addFirewallZone(testZone));
			reduxStore.dispatch(setActiveZoneId('zone-1'));
			reduxStore.dispatch(
				updateFirewallZone({
					id: 'zone-1',
					updates: {selectedFirewalls: programmableKeys}
				})
			);
			reduxStore.dispatch(
				updateResponderConfig({
					parent: 'D2D_Dd_Mem',
					child: 'd2d_dd_mem_1',
					updates: {startAddress: '0x20410000'}
				})
			);

			cy.mount(<TestFirewallZoneDetails />, reduxStore);

			cy.dataTest('firewall-zones:details:conflict-banner').should(
				'not.exist'
			);
		});

		it('should render an access mode banner naming the initiator, responder and zone', () => {
			const reduxStore = configurePreloadedStore(soc);
			reduxStore.dispatch(
				addFirewallZone({
					...testZone,
					selectedFirewalls: [initiatorKey, responderKey]
				})
			);
			reduxStore.dispatch(
				addFirewallZone({
					...testZone,
					id: 'zone-2',
					name: 'Secure Zone',
					accessModes: SECURE_ONLY,
					selectedFirewalls: [initiatorKey, responderKey]
				})
			);
			reduxStore.dispatch(setActiveZoneId('zone-1'));

			cy.mount(<TestFirewallZoneDetails />, reduxStore);

			cy.dataTest(
				'firewall-zones:details:access-mode-conflict-dma_dde_0-m55_itcm_0'
			).should('exist');
		});

		it('should not render an access mode banner when the zones share no responder', () => {
			const reduxStore = configurePreloadedStore(soc);
			reduxStore.dispatch(
				addFirewallZone({
					...testZone,
					selectedFirewalls: [initiatorKey, responderKey]
				})
			);
			reduxStore.dispatch(
				addFirewallZone({
					...testZone,
					id: 'zone-2',
					name: 'Secure Zone',
					accessModes: SECURE_ONLY,
					selectedFirewalls: [initiatorKey, programmableKeys[0]]
				})
			);
			reduxStore.dispatch(setActiveZoneId('zone-1'));

			cy.mount(<TestFirewallZoneDetails />, reduxStore);

			cy.dataTest('firewall-zones:details:conflict-banner').should(
				'not.exist'
			);
			cy.get(
				'[data-test^="firewall-zones:details:access-mode-conflict"]'
			).should('not.exist');
		});
	});

	describe('duplicate zone name', () => {
		const mountWithTwoZones = () => {
			const reduxStore = configurePreloadedStore(soc);
			reduxStore.dispatch(addFirewallZone(testZone));
			reduxStore.dispatch(
				addFirewallZone({
					...testZone,
					id: 'zone-2',
					name: 'Second Zone'
				})
			);
			reduxStore.dispatch(setActiveZoneId('zone-1'));

			cy.mount(<TestFirewallZoneDetails />, reduxStore);
			cy.dataTest('firewall-zones:details:edit-name-trigger').click();

			return reduxStore;
		};

		const typeName = (value: string) => {
			cy.dataTest('firewall-zones:details:edit-name-control-input')
				.shadow()
				.within(() => {
					// Waiting on the cleared value keeps the controlled input from
					// restoring the previous name mid-type.
					cy.get('input')
						.clear()
						.should('have.value', '')
						.type(value);
				});
		};

		const confirmName = () => {
			cy.dataTest(
				'firewall-zones:details:edit-name-control-input'
			).within(() => {
				cy.dataTest('edit-input-confirm-btn').click();
			});
		};

		it('should show an error when the name is already used by another zone', () => {
			mountWithTwoZones();

			typeName('Second Zone');

			cy.dataTest('firewall-zones:details:edit-name-error').should(
				'exist'
			);
		});

		it('should render the error below the input rather than beside it', () => {
			mountWithTwoZones();

			typeName('Second Zone');

			cy.dataTest(
				'firewall-zones:details:edit-name-control-input'
			).then($input => {
				const inputBottom = $input[0].getBoundingClientRect().bottom;

				cy.dataTest('firewall-zones:details:edit-name-error').then(
					$error => {
						expect(
							$error[0].getBoundingClientRect().top
						).to.be.at.least(inputBottom);
					}
				);
			});
		});

		it('should match the existing name regardless of case and padding', () => {
			mountWithTwoZones();

			typeName('  second zone  ');

			cy.dataTest('firewall-zones:details:edit-name-error').should(
				'exist'
			);
		});

		it('should block the rename and stay in edit mode on confirm', () => {
			const reduxStore = mountWithTwoZones();

			typeName('Second Zone');
			confirmName();

			cy.then(() => {
				const zone = reduxStore
					.getState()
					.firewallReducer.firewallZones.find(
						entry => entry.id === 'zone-1'
					);
				expect(zone?.name).to.equal('Test Zone');
			});

			cy.dataTest(
				'firewall-zones:details:edit-name-control-input'
			).should('exist');
		});

		it('should allow a unique name', () => {
			const reduxStore = mountWithTwoZones();

			typeName('Third Zone');

			cy.dataTest('firewall-zones:details:edit-name-error').should(
				'not.exist'
			);

			confirmName();

			cy.then(() => {
				const zone = reduxStore
					.getState()
					.firewallReducer.firewallZones.find(
						entry => entry.id === 'zone-1'
					);
				expect(zone?.name).to.equal('Third Zone');
			});
		});

		it('should not flag the zone for keeping its own name', () => {
			mountWithTwoZones();

			cy.dataTest('firewall-zones:details:edit-name-error').should(
				'not.exist'
			);
		});
	});
});
