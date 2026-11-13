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
	setManageFirewallsColumn,
	updateFirewallZone,
	updateResponderConfig
} from '../../../../state/slices/firewall/firewall.reducer';
import type {
	FirewallZone,
	FirewallZoneAccessModeId
} from '../../../../types/firewall';
import {
	getEntryKey,
	INITIATOR_GROUP_NAME,
	SUPPORTED_MODE_LABELS,
	SUPPORTED_MODES
} from '../../firewall-data';
import {
	initializeFirewallTestData,
	withFirewallTestData
} from '../../firewall-test-data';
import ManageFirewallTable from './manage-firewall-table';

const soc = withFirewallTestData(
	(await import('@socs/max32690-wlp.json')).default as unknown as Soc
);

initializeFirewallTestData();

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

const populatedZone: FirewallZone = {
	...testZone,
	selectedFirewalls: [
		`initiators::${INITIATOR_GROUP_NAME}::dma_dde_0`,
		`initiators::${INITIATOR_GROUP_NAME}::dma_dde_1`,
		`initiators::${INITIATOR_GROUP_NAME}::nss_hifi_dma`,
		'responders::M55_Itcm::m55_itcm_0'
	]
};

function TestManageFirewalls() {
	return (
		<LocalizationProvider namespace='cfgtools'>
			<ManageFirewallTable />
		</LocalizationProvider>
	);
}

describe('ManageFirewallTable', () => {
	beforeEach(() => {
		cy.viewport(1920, 1080);
	});

	it('should render the initiators empty state by default', () => {
		const reduxStore = configurePreloadedStore(soc);

		cy.mount(<TestManageFirewalls />, reduxStore);

		cy.dataTest('firewall-zones:manage-firewalls').should('exist');
		cy.dataTest(
			'firewall-zones:manage-firewalls:empty-initiators'
		).should('exist');
		cy.dataTest(
			'firewall-zones:manage-firewalls:add-initiators'
		).should('exist');
	});

	it('should render the responders empty state when the responders tab is selected', () => {
		const reduxStore = configurePreloadedStore(soc);

		cy.mount(<TestManageFirewalls />, reduxStore);

		cy.dataTest(
			'firewall-zones:manage-firewalls:tab-responders'
		).click();

		cy.dataTest(
			'firewall-zones:manage-firewalls:empty-responders'
		).should('exist');
		cy.dataTest(
			'firewall-zones:manage-firewalls:add-responders'
		).should('exist');
	});

	it('should render the selected initiator groups with counts', () => {
		const reduxStore = configurePreloadedStore(soc);
		reduxStore.dispatch(addFirewallZone(populatedZone));

		cy.mount(<TestManageFirewalls />, reduxStore);

		cy.dataTest(
			'firewall-zones:manage-firewalls:count-initiators'
		).should('contain.text', '3');
		cy.dataTest(
			'firewall-zones:manage-firewalls:count-responders'
		).should('contain.text', '1');

		cy.dataTest(
			'firewall-zones:manage-firewalls:list-initiators'
		).should('exist');
		cy.dataTest(
			'firewall-zones:manage-firewalls:column-header'
		).should('exist');

		cy.dataTest(
			`firewall-zones:manage-firewalls:child-count-${INITIATOR_GROUP_NAME}`
		).should('contain.text', '3');

		cy.contains('dma_dde_0').should('exist');
		cy.contains('dma_dde_1').should('exist');
		cy.contains('nss_hifi_dma').should('exist');
	});

	it('should render the supported mode badges for a selected initiator', () => {
		const reduxStore = configurePreloadedStore(soc);
		reduxStore.dispatch(addFirewallZone(populatedZone));

		cy.mount(<TestManageFirewalls />, reduxStore);

		SUPPORTED_MODE_LABELS.forEach(mode => {
			cy.dataTest(
				`firewall-zones:manage-firewalls:mode-${INITIATOR_GROUP_NAME}-dma_dde_0-${mode}`
			)
				.should('exist')
				.and('contain.text', mode);
		});
	});

	it('should reflect the zone access modes in the supported mode badge appearance', () => {
		const reduxStore = configurePreloadedStore(soc);
		reduxStore.dispatch(
			addFirewallZone({
				...populatedZone,
				accessModes: {
					nonSecureNonPrivileged: true,
					nonSecurePrivileged: false,
					secureNonPrivileged: false,
					securePrivileged: false
				}
			})
		);

		cy.mount(<TestManageFirewalls />, reduxStore);

		SUPPORTED_MODES.forEach(({id, label}) => {
			const assertion = cy
				.dataTest(
					`firewall-zones:manage-firewalls:mode-${INITIATOR_GROUP_NAME}-dma_dde_0-${label}`
				)
				.invoke('attr', 'class');

			// Checked modes render the 'secondary' appearance; unchecked modes
			// render the 'active' appearance.
			if (id === 'nonSecureNonPrivileged') {
				assertion
					.should('contain', 'secondary')
					.and('not.contain', 'active');
			} else {
				assertion
					.should('contain', 'active')
					.and('not.contain', 'secondary');
			}
		});
	});

	it('should render the selected responder groups when the responders tab is selected', () => {
		const reduxStore = configurePreloadedStore(soc);
		reduxStore.dispatch(addFirewallZone(populatedZone));

		cy.mount(<TestManageFirewalls />, reduxStore);

		cy.dataTest(
			'firewall-zones:manage-firewalls:tab-responders'
		).click();

		cy.dataTest(
			'firewall-zones:manage-firewalls:list-responders'
		).should('exist');
		cy.dataTest(
			'firewall-zones:manage-firewalls:child-count-M55_Itcm'
		).should('contain.text', '1');
		cy.contains('m55_itcm_0').should('exist');
	});

	it('should switch to the manage firewalls view when the add icon is clicked', () => {
		const reduxStore = configurePreloadedStore(soc);
		reduxStore.dispatch(addFirewallZone(populatedZone));

		cy.mount(<TestManageFirewalls />, reduxStore);

		cy.dataTest('firewall-zones:manage-firewalls:add-icon')
			.click()
			.then(() => {
				expect(
					reduxStore.getState().firewallReducer.manageFirewallsView
				).to.equal(true);
			});
	});

	it('should switch to the manage firewalls view when the empty-state add button is clicked', () => {
		const reduxStore = configurePreloadedStore(soc);
		reduxStore.dispatch(addFirewallZone(testZone));

		cy.mount(<TestManageFirewalls />, reduxStore);

		cy.dataTest('firewall-zones:manage-firewalls:add-initiators')
			.click()
			.then(() => {
				expect(
					reduxStore.getState().firewallReducer.manageFirewallsView
				).to.equal(true);
			});
	});

	it('should open the warning modal and remove the entry on confirm', () => {
		const reduxStore = configurePreloadedStore(soc);
		reduxStore.dispatch(addFirewallZone(populatedZone));

		cy.mount(<TestManageFirewalls />, reduxStore);

		cy.dataTest(
			`firewall-zones:manage-firewalls:delete-${INITIATOR_GROUP_NAME}-dma_dde_0`
		).click();

		cy.dataTest(
			'firewall-zones:manage-firewalls:delete-warning'
		).should('be.visible');

		cy.dataTest(
			'firewall-zones:manage-firewalls:delete-warning:confirm-btn'
		)
			.click()
			.then(() => {
				const zone =
					reduxStore.getState().firewallReducer.firewallZones[0];
				expect(zone.selectedFirewalls).to.not.include(
					`initiators::${INITIATOR_GROUP_NAME}::dma_dde_0`
				);
				expect(zone.selectedFirewalls).to.include(
					`initiators::${INITIATOR_GROUP_NAME}::dma_dde_1`
				);
			});
	});

	it('should close the responder sidebar and discard its override when the configured responder is removed', () => {
		const responderKey = getEntryKey(
			'responders',
			'M55_Itcm',
			'm55_itcm_0'
		);
		const reduxStore = configurePreloadedStore(soc);
		reduxStore.dispatch(addFirewallZone(populatedZone));
		reduxStore.dispatch(
			updateResponderConfig({
				parent: 'M55_Itcm',
				child: 'm55_itcm_0',
				updates: {name: 'Custom name'}
			})
		);
		reduxStore.dispatch(
			setActiveResponderConfig({
				parent: 'M55_Itcm',
				child: 'm55_itcm_0'
			})
		);

		cy.mount(<TestManageFirewalls />, reduxStore);

		cy.dataTest(
			'firewall-zones:manage-firewalls:tab-responders'
		).click();

		cy.dataTest(
			'firewall-zones:manage-firewalls:delete-M55_Itcm-m55_itcm_0'
		).click();

		cy.dataTest(
			'firewall-zones:manage-firewalls:delete-warning:confirm-btn'
		)
			.click()
			.then(() => {
				const {
					activeResponderConfig,
					responderConfigs,
					firewallZones
				} = reduxStore.getState().firewallReducer;
				expect(activeResponderConfig).to.equal(undefined);
				expect(responderConfigs[responderKey]).to.equal(undefined);
				expect(firewallZones[0].selectedFirewalls).to.not.include(
					responderKey
				);
			});
	});

	it('should show the configured responder name in the removal confirmation dialog', () => {
		const reduxStore = configurePreloadedStore(soc);
		reduxStore.dispatch(addFirewallZone(populatedZone));
		reduxStore.dispatch(
			updateResponderConfig({
				parent: 'M55_Itcm',
				child: 'm55_itcm_0',
				updates: {name: 'Custom name'}
			})
		);

		cy.mount(<TestManageFirewalls />, reduxStore);

		cy.dataTest(
			'firewall-zones:manage-firewalls:tab-responders'
		).click();

		cy.dataTest(
			'firewall-zones:manage-firewalls:delete-M55_Itcm-m55_itcm_0'
		).click();

		cy.dataTest('firewall-zones:manage-firewalls:delete-warning')
			.find('h1')
			.should('have.text', 'Remove CUSTOM NAME ?');
	});

	it('should show the upper-cased initiator name in the removal confirmation dialog', () => {
		const reduxStore = configurePreloadedStore(soc);
		reduxStore.dispatch(addFirewallZone(populatedZone));

		cy.mount(<TestManageFirewalls />, reduxStore);

		cy.dataTest(
			`firewall-zones:manage-firewalls:delete-${INITIATOR_GROUP_NAME}-dma_dde_0`
		).click();

		cy.dataTest('firewall-zones:manage-firewalls:delete-warning')
			.find('h1')
			.should('have.text', 'Remove DMA_DDE_0 ?');
	});

	it('should keep the responder override when another zone still references it', () => {
		const responderKey = getEntryKey(
			'responders',
			'M55_Itcm',
			'm55_itcm_0'
		);
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

		cy.mount(<TestManageFirewalls />, reduxStore);

		cy.dataTest(
			'firewall-zones:manage-firewalls:tab-responders'
		).click();

		cy.dataTest(
			'firewall-zones:manage-firewalls:delete-M55_Itcm-m55_itcm_0'
		).click();

		cy.dataTest(
			'firewall-zones:manage-firewalls:delete-warning:confirm-btn'
		)
			.click()
			.then(() => {
				const {firewallZones, responderConfigs} =
					reduxStore.getState().firewallReducer;
				expect(firewallZones[0].selectedFirewalls).to.not.include(
					responderKey
				);
				expect(responderConfigs[responderKey]).to.deep.equal({
					name: 'Custom name'
				});
			});
	});

	describe('conflict indicators', () => {
		const SECURE_ONLY: Record<FirewallZoneAccessModeId, boolean> = {
			nonSecureNonPrivileged: false,
			nonSecurePrivileged: false,
			secureNonPrivileged: true,
			securePrivileged: true
		};

		const programmableKeys = [
			getEntryKey('responders', 'D2D_Dd_Mem', 'd2d_dd_mem_0'),
			getEntryKey('responders', 'D2D_Dd_Mem', 'd2d_dd_mem_1')
		];

		const sharedEntries = [
			getEntryKey('initiators', INITIATOR_GROUP_NAME, 'dma_dde_0'),
			getEntryKey('responders', 'M55_Itcm', 'm55_itcm_0')
		];

		it('should not render any conflict indicator for a valid zone', () => {
			const reduxStore = configurePreloadedStore(soc);
			reduxStore.dispatch(addFirewallZone(populatedZone));

			cy.mount(<TestManageFirewalls />, reduxStore);

			cy.get(
				'[data-test^="firewall-zones:manage-firewalls:conflict-"]'
			).should('not.exist');
			cy.get(
				'[data-test^="firewall-zones:manage-firewalls:tab-conflict-"]'
			).should('not.exist');
		});

		it('should flag both overlapping responder rows', () => {
			const reduxStore = configurePreloadedStore(soc);
			reduxStore.dispatch(addFirewallZone(testZone));
			// Seeding through updateFirewallZone gives both regions the same
			// default address.
			reduxStore.dispatch(
				updateFirewallZone({
					id: testZone.id,
					updates: {selectedFirewalls: programmableKeys}
				})
			);
			reduxStore.dispatch(setManageFirewallsColumn('responders'));

			cy.mount(<TestManageFirewalls />, reduxStore);

			cy.dataTest(
				'firewall-zones:manage-firewalls:conflict-D2D_Dd_Mem-d2d_dd_mem_0'
			).should('exist');
			cy.dataTest(
				'firewall-zones:manage-firewalls:conflict-D2D_Dd_Mem-d2d_dd_mem_1'
			).should('exist');
		});

		it('should flag the group header and the responders tab on an overlap', () => {
			const reduxStore = configurePreloadedStore(soc);
			reduxStore.dispatch(addFirewallZone(testZone));
			reduxStore.dispatch(
				updateFirewallZone({
					id: testZone.id,
					updates: {selectedFirewalls: programmableKeys}
				})
			);
			reduxStore.dispatch(setManageFirewallsColumn('responders'));

			cy.mount(<TestManageFirewalls />, reduxStore);

			cy.dataTest(
				'firewall-zones:manage-firewalls:group-conflict-D2D_Dd_Mem'
			).should('exist');
			cy.dataTest(
				'firewall-zones:manage-firewalls:tab-conflict-responders'
			).should('exist');
		});

		it('should clear the indicators once the addresses differ', () => {
			const reduxStore = configurePreloadedStore(soc);
			reduxStore.dispatch(addFirewallZone(testZone));
			reduxStore.dispatch(
				updateFirewallZone({
					id: testZone.id,
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
			reduxStore.dispatch(setManageFirewallsColumn('responders'));

			cy.mount(<TestManageFirewalls />, reduxStore);

			cy.get(
				'[data-test^="firewall-zones:manage-firewalls:conflict-"]'
			).should('not.exist');
		});

		it('should flag the initiator row and both tabs on an access mode conflict', () => {
			const reduxStore = configurePreloadedStore(soc);
			reduxStore.dispatch(
				addFirewallZone({
					...testZone,
					selectedFirewalls: sharedEntries
				})
			);
			reduxStore.dispatch(
				addFirewallZone({
					...testZone,
					id: 'zone-2',
					name: 'Secure Zone',
					accessModes: SECURE_ONLY,
					selectedFirewalls: sharedEntries
				})
			);
			reduxStore.dispatch(setActiveZoneId(testZone.id));

			cy.mount(<TestManageFirewalls />, reduxStore);

			cy.dataTest(
				`firewall-zones:manage-firewalls:conflict-${INITIATOR_GROUP_NAME}-dma_dde_0`
			).should('exist');
			cy.dataTest(
				'firewall-zones:manage-firewalls:tab-conflict-initiators'
			).should('exist');
			cy.dataTest(
				'firewall-zones:manage-firewalls:tab-conflict-responders'
			).should('exist');
		});

		it('should flag the shared responder row on an access mode conflict', () => {
			const reduxStore = configurePreloadedStore(soc);
			reduxStore.dispatch(
				addFirewallZone({
					...testZone,
					selectedFirewalls: sharedEntries
				})
			);
			reduxStore.dispatch(
				addFirewallZone({
					...testZone,
					id: 'zone-2',
					name: 'Secure Zone',
					accessModes: SECURE_ONLY,
					selectedFirewalls: sharedEntries
				})
			);
			reduxStore.dispatch(setActiveZoneId(testZone.id));
			reduxStore.dispatch(setManageFirewallsColumn('responders'));

			cy.mount(<TestManageFirewalls />, reduxStore);

			cy.dataTest(
				'firewall-zones:manage-firewalls:conflict-M55_Itcm-m55_itcm_0'
			).should('exist');
		});
	});
});
