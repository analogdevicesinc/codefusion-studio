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
	setManageFirewallsColumn
} from '../../../../state/slices/firewall/firewall.reducer';
import type {FirewallZone} from '../../../../types/firewall';
import {
	getDefaultResponderStartAddress,
	INITIATOR_GROUP_NAME
} from '../../firewall-data';
import {
	initializeFirewallTestData,
	withFirewallTestData
} from '../../firewall-test-data';
import ManageFirewallConfig from './manage-firewall-config';

const soc = withFirewallTestData(
	(await import('@socs/max32690-wlp.json')).default as unknown as Soc
);

initializeFirewallTestData();

const VIEW = 'firewall-zones:manage-firewall-view';
const TABLE = `${VIEW}:initiator-responder-table`;

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

// Configuration state is derived from saved zone selections, so dma_dde_1 and
// dma_dde_3 are configured by virtue of being selected in this zone.
const configuredZone: FirewallZone = {
	...testZone,
	selectedFirewalls: [
		`initiators::${INITIATOR_GROUP_NAME}::dma_dde_1`,
		`initiators::${INITIATOR_GROUP_NAME}::dma_dde_3`
	]
};

function TestManageFirewallConfig() {
	return (
		<LocalizationProvider namespace='cfgtools'>
			<ManageFirewallConfig />
		</LocalizationProvider>
	);
}

describe('ManageFirewallConfig', () => {
	beforeEach(() => {
		cy.viewport(1920, 1080);
	});

	it('should render the manage firewall view with its controls', () => {
		const reduxStore = configurePreloadedStore(soc);
		reduxStore.dispatch(addFirewallZone(testZone));

		cy.mount(<TestManageFirewallConfig />, reduxStore);

		cy.dataTest(VIEW).should('exist');
		cy.dataTest(`${VIEW}:breadcrumb`).should('exist');
		cy.dataTest(`${VIEW}:content`).should('exist');
		cy.dataTest(`${VIEW}:search-control-input`).should('exist');
		cy.dataTest(`${VIEW}:filter-unconfigured`).should('exist');
		cy.dataTest(`${VIEW}:filter-configured`).should('exist');
		cy.dataTest(`${VIEW}:footer`).should('exist');
		cy.dataTest(`${VIEW}:cancel-btn`).should('exist');
		cy.dataTest(`${VIEW}:apply-btn`).should('exist');
		cy.dataTest(TABLE).should('exist');
	});

	it('should exit the manage firewalls view when the breadcrumb back link is clicked', () => {
		const reduxStore = configurePreloadedStore(soc);
		reduxStore.dispatch(addFirewallZone(testZone));

		cy.mount(<TestManageFirewallConfig />, reduxStore);

		cy.dataTest(`${VIEW}:back`)
			.click()
			.then(() => {
				expect(
					reduxStore.getState().firewallReducer.manageFirewallsView
				).to.equal(false);
			});
	});

	it('should exit the manage firewalls view when cancel is clicked', () => {
		const reduxStore = configurePreloadedStore(soc);
		reduxStore.dispatch(addFirewallZone(testZone));

		cy.mount(<TestManageFirewallConfig />, reduxStore);

		cy.dataTest(`${VIEW}:cancel-btn`)
			.click()
			.then(() => {
				expect(
					reduxStore.getState().firewallReducer.manageFirewallsView
				).to.equal(false);
			});
	});

	it('should keep apply disabled until a selection changes', () => {
		const reduxStore = configurePreloadedStore(soc);
		reduxStore.dispatch(addFirewallZone(testZone));

		cy.mount(<TestManageFirewallConfig />, reduxStore);

		cy.dataTest(`${VIEW}:apply-btn`).should('have.attr', 'disabled');

		cy.dataTest(
			`${TABLE}:select-${INITIATOR_GROUP_NAME}-dma_dde_0`
		).click();

		cy.dataTest(`${VIEW}:apply-btn`).should(
			'not.have.attr',
			'disabled'
		);
	});

	it('should persist the selected entries to the zone when apply is clicked', () => {
		const reduxStore = configurePreloadedStore(soc);
		reduxStore.dispatch(addFirewallZone(testZone));

		cy.mount(<TestManageFirewallConfig />, reduxStore);

		cy.dataTest(
			`${TABLE}:select-${INITIATOR_GROUP_NAME}-dma_dde_0`
		).click();
		cy.dataTest(`${VIEW}:apply-btn`)
			.click()
			.then(() => {
				const zone =
					reduxStore.getState().firewallReducer.firewallZones[0];
				expect(zone.selectedFirewalls).to.include(
					`initiators::${INITIATOR_GROUP_NAME}::dma_dde_0`
				);
				expect(
					reduxStore.getState().firewallReducer.manageFirewallsView
				).to.equal(false);
			});
	});

	it('should seed the default start address for a programmable region responder on apply', () => {
		const reduxStore = configurePreloadedStore(soc);
		reduxStore.dispatch(addFirewallZone(testZone));
		reduxStore.dispatch(setManageFirewallsColumn('responders'));

		cy.mount(<TestManageFirewallConfig />, reduxStore);

		cy.dataTest(`${TABLE}:select-D2D_Dd_Mem-d2d_dd_mem_0`).click();
		cy.dataTest(`${VIEW}:apply-btn`)
			.click()
			.then(() => {
				expect(
					reduxStore.getState().firewallReducer.responderConfigs[
						'responders::D2D_Dd_Mem::d2d_dd_mem_0'
					]?.startAddress
				).to.equal(getDefaultResponderStartAddress());
			});
	});

	it('should filter the rows by the search query', () => {
		const reduxStore = configurePreloadedStore(soc);
		reduxStore.dispatch(addFirewallZone(testZone));

		cy.mount(<TestManageFirewallConfig />, reduxStore);

		cy.dataTest(`${VIEW}:search-control-input`)
			.shadow()
			.find('input')
			.type('NSS');

		cy.dataTest(`${TABLE}:select-${INITIATOR_GROUP_NAME}`).should(
			'exist'
		);
		cy.dataTest(
			`${TABLE}:select-${INITIATOR_GROUP_NAME}-nss_hifi_dma`
		).should('exist');
		cy.dataTest(
			`${TABLE}:select-${INITIATOR_GROUP_NAME}-dma_dde_0`
		).should('not.exist');
		cy.dataTest(`${TABLE}:no-results`).should('not.exist');
	});

	it('should show the no-results state when the search matches nothing', () => {
		const reduxStore = configurePreloadedStore(soc);
		reduxStore.dispatch(addFirewallZone(testZone));

		cy.mount(<TestManageFirewallConfig />, reduxStore);

		cy.dataTest(`${VIEW}:search-control-input`)
			.shadow()
			.find('input')
			.type('ZZZ');

		cy.dataTest(`${TABLE}:no-results`).should('exist');
	});

	it('should show only unconfigured children when the unconfigured chip is active', () => {
		const reduxStore = configurePreloadedStore(soc);
		reduxStore.dispatch(addFirewallZone(configuredZone));

		cy.mount(<TestManageFirewallConfig />, reduxStore);

		cy.dataTest(`${VIEW}:filter-unconfigured`).click();

		// dma_dde_0 and dma_dde_2 are unconfigured; dma_dde_1 and dma_dde_3 are
		// configured.
		cy.dataTest(
			`${TABLE}:select-${INITIATOR_GROUP_NAME}-dma_dde_0`
		).should('exist');
		cy.dataTest(
			`${TABLE}:select-${INITIATOR_GROUP_NAME}-dma_dde_2`
		).should('exist');
		cy.dataTest(
			`${TABLE}:select-${INITIATOR_GROUP_NAME}-dma_dde_1`
		).should('not.exist');
		cy.dataTest(
			`${TABLE}:select-${INITIATOR_GROUP_NAME}-dma_dde_3`
		).should('not.exist');
	});

	it('should show only configured children when the configured chip is active', () => {
		const reduxStore = configurePreloadedStore(soc);
		reduxStore.dispatch(addFirewallZone(configuredZone));

		cy.mount(<TestManageFirewallConfig />, reduxStore);

		cy.dataTest(`${VIEW}:filter-configured`).click();

		// dma_dde_1 and dma_dde_3 are configured; dma_dde_0 and dma_dde_2 are
		// unconfigured.
		cy.dataTest(
			`${TABLE}:select-${INITIATOR_GROUP_NAME}-dma_dde_1`
		).should('exist');
		cy.dataTest(
			`${TABLE}:select-${INITIATOR_GROUP_NAME}-dma_dde_3`
		).should('exist');
		cy.dataTest(
			`${TABLE}:select-${INITIATOR_GROUP_NAME}-dma_dde_0`
		).should('not.exist');
		cy.dataTest(
			`${TABLE}:select-${INITIATOR_GROUP_NAME}-dma_dde_2`
		).should('not.exist');
	});

	it('should ignore config filtering when both chips are active', () => {
		const reduxStore = configurePreloadedStore(soc);
		reduxStore.dispatch(addFirewallZone(testZone));

		cy.mount(<TestManageFirewallConfig />, reduxStore);

		cy.dataTest(`${VIEW}:filter-unconfigured`).click();
		cy.dataTest(`${VIEW}:filter-configured`).click();

		// With both filters active every initiator remains visible.
		cy.dataTest(
			`${TABLE}:select-${INITIATOR_GROUP_NAME}-dma_dde_0`
		).should('exist');
		cy.dataTest(
			`${TABLE}:select-${INITIATOR_GROUP_NAME}-dma_dde_1`
		).should('exist');
		cy.dataTest(
			`${TABLE}:select-${INITIATOR_GROUP_NAME}-dma_dde_2`
		).should('exist');
		cy.dataTest(
			`${TABLE}:select-${INITIATOR_GROUP_NAME}-dma_dde_3`
		).should('exist');
	});

	it('should scroll the final initiator fully above the fixed footer in a constrained viewport', () => {
		// A short viewport forces the list to overflow behind the fixed footer,
		// so the flex/padding rules must leave room to scroll the last row clear.
		cy.viewport(1920, 500);

		const reduxStore = configurePreloadedStore(soc);
		reduxStore.dispatch(addFirewallZone(testZone));

		// A fixed-height wrapper lets the container's overflow-y scroll engage.
		cy.mount(
			<div style={{height: '100vh'}}>
				<TestManageFirewallConfig />
			</div>,
			reduxStore
		);

		// The data model lists initiators as one group, so the last row is its
		// final child, nss_hifi_core.
		const finalInitiator = `${TABLE}:select-${INITIATOR_GROUP_NAME}-nss_hifi_core`;

		cy.dataTest(VIEW).scrollTo('bottom');

		cy.dataTest(finalInitiator).then($row => {
			const rowBottom = $row[0].getBoundingClientRect().bottom;

			// The wrapping element carries the fixed footer positioning.
			cy.dataTest(`${VIEW}:footer`)
				.parent()
				.then($footer => {
					const footerTop = $footer[0].getBoundingClientRect().top;
					expect(rowBottom).to.be.lessThan(footerTop);
				});
		});
	});
});
