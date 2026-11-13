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
import {addFirewallZone} from '../../../../state/slices/firewall/firewall.reducer';
import type {FirewallZone} from '../../../../types/firewall';
import {FIREWALL_ZONE_ACCESS_MODE_IDS} from '../constants';
import ManageAccessModes from './manage-access-modes';

const soc = (await import('@socs/max32690-wlp.json'))
	.default as unknown as Soc;

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

function TestManageAccessModes() {
	return (
		<LocalizationProvider namespace='cfgtools'>
			<ManageAccessModes />
		</LocalizationProvider>
	);
}

describe('ManageAccessModes', () => {
	beforeEach(() => {
		cy.viewport(1920, 1080);
	});

	it('should render the manage access modes card', () => {
		const reduxStore = configurePreloadedStore(soc);
		reduxStore.dispatch(addFirewallZone(testZone));

		cy.mount(<TestManageAccessModes />, reduxStore);

		cy.dataTest('firewall-zones:manage-access-modes').should('exist');
		cy.dataTest(
			'firewall-zones:manage-access-modes:select-all'
		).should('exist');
		FIREWALL_ZONE_ACCESS_MODE_IDS.forEach(id => {
			cy.dataTest(`firewall-zones:manage-access-modes:${id}`).should(
				'exist'
			);
		});
	});

	it('should render the Open access mode badge when all modes are selected', () => {
		const reduxStore = configurePreloadedStore(soc);
		reduxStore.dispatch(addFirewallZone(testZone));

		cy.mount(<TestManageAccessModes />, reduxStore);

		cy.dataTest(
			'firewall-zones:manage-access-modes:access-mode'
		).should('contain.text', 'Open');
	});

	it('should render all modes checked and select-all checked when all modes are selected', () => {
		const reduxStore = configurePreloadedStore(soc);
		reduxStore.dispatch(addFirewallZone(testZone));

		cy.mount(<TestManageAccessModes />, reduxStore);

		cy.dataTest(
			'firewall-zones:manage-access-modes:select-all'
		).should('have.attr', 'current-checked', 'true');

		FIREWALL_ZONE_ACCESS_MODE_IDS.forEach(id => {
			cy.dataTest(`firewall-zones:manage-access-modes:${id}`).should(
				'have.attr',
				'current-checked',
				'true'
			);
		});
	});

	it('should render the Restricted badge when only some modes are selected', () => {
		const reduxStore = configurePreloadedStore(soc);
		reduxStore.dispatch(
			addFirewallZone({
				...testZone,
				accessMode: 'restricted',
				accessModes: {
					nonSecureNonPrivileged: true,
					nonSecurePrivileged: false,
					secureNonPrivileged: true,
					securePrivileged: false
				}
			})
		);

		cy.mount(<TestManageAccessModes />, reduxStore);

		cy.dataTest(
			'firewall-zones:manage-access-modes:access-mode'
		).should('contain.text', 'Restricted');
	});

	it('should render the Blocked badge when no modes are selected', () => {
		const reduxStore = configurePreloadedStore(soc);
		reduxStore.dispatch(
			addFirewallZone({
				...testZone,
				accessMode: 'blocked',
				accessModes: {
					nonSecureNonPrivileged: false,
					nonSecurePrivileged: false,
					secureNonPrivileged: false,
					securePrivileged: false
				}
			})
		);

		cy.mount(<TestManageAccessModes />, reduxStore);

		cy.dataTest(
			'firewall-zones:manage-access-modes:access-mode'
		).should('contain.text', 'Blocked');
	});

	it('should unselect a mode and update the access mode to Restricted when a checkbox is unchecked', () => {
		const reduxStore = configurePreloadedStore(soc);
		reduxStore.dispatch(addFirewallZone(testZone));

		cy.mount(<TestManageAccessModes />, reduxStore);

		cy.dataTest(
			'firewall-zones:manage-access-modes:nonSecureNonPrivileged'
		).click();

		cy.dataTest('firewall-zones:manage-access-modes:access-mode')
			.should('contain.text', 'Restricted')
			.then(() => {
				const zone =
					reduxStore.getState().firewallReducer.firewallZones[0];
				expect(zone.accessMode).to.equal('restricted');
				expect(zone.accessModes?.nonSecureNonPrivileged).to.equal(
					false
				);
			});
	});

	it('should deselect all modes and update the access mode to Blocked when select-all is toggled off', () => {
		const reduxStore = configurePreloadedStore(soc);
		reduxStore.dispatch(addFirewallZone(testZone));

		cy.mount(<TestManageAccessModes />, reduxStore);

		cy.dataTest(
			'firewall-zones:manage-access-modes:select-all'
		).click();

		cy.dataTest('firewall-zones:manage-access-modes:access-mode')
			.should('contain.text', 'Blocked')
			.then(() => {
				const zone =
					reduxStore.getState().firewallReducer.firewallZones[0];
				expect(zone.accessMode).to.equal('blocked');
				FIREWALL_ZONE_ACCESS_MODE_IDS.forEach(id => {
					expect(zone.accessModes?.[id]).to.equal(false);
				});
			});
	});

	it('should select all modes and update the access mode to Open when select-all is toggled on', () => {
		const reduxStore = configurePreloadedStore(soc);
		reduxStore.dispatch(
			addFirewallZone({
				...testZone,
				accessMode: 'blocked',
				accessModes: {
					nonSecureNonPrivileged: false,
					nonSecurePrivileged: false,
					secureNonPrivileged: false,
					securePrivileged: false
				}
			})
		);

		cy.mount(<TestManageAccessModes />, reduxStore);

		cy.dataTest(
			'firewall-zones:manage-access-modes:select-all'
		).click();

		cy.dataTest('firewall-zones:manage-access-modes:access-mode')
			.should('contain.text', 'Open')
			.then(() => {
				const zone =
					reduxStore.getState().firewallReducer.firewallZones[0];
				expect(zone.accessMode).to.equal('open');
				FIREWALL_ZONE_ACCESS_MODE_IDS.forEach(id => {
					expect(zone.accessModes?.[id]).to.equal(true);
				});
			});
	});
});
