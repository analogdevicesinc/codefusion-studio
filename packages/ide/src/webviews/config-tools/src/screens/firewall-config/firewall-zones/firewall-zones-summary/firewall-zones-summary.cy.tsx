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
import FirewallZonesSummary from './firewall-zones-summary';
import FirewallZonesSidebar from '../firewall-zones-sidebar/firewall-zones-sidebar';

const soc = (await import('@socs/max32690-wlp.json'))
	.default as unknown as Soc;

function TestFirewallZonesSummary() {
	return (
		<LocalizationProvider namespace='cfgtools'>
			<FirewallZonesSummary />
		</LocalizationProvider>
	);
}

function TestFirewallZonesLayout() {
	return (
		<LocalizationProvider namespace='cfgtools'>
			<FirewallZonesSidebar />
			<FirewallZonesSummary />
		</LocalizationProvider>
	);
}

describe('FirewallZonesSummary', () => {
	beforeEach(() => {
		cy.viewport(1920, 1080);
	});

	it('should render the empty firewall zones state when there are no zones', () => {
		const reduxStore = configurePreloadedStore(soc);

		cy.mount(<TestFirewallZonesSummary />, reduxStore);

		cy.dataTest('firewall-zones:summary').should('exist');
		cy.dataTest('firewall-zones:empty-firewall-zones').should(
			'exist'
		);
	});

	it('should render the zone details after adding a zone from the empty state', () => {
		const reduxStore = configurePreloadedStore(soc);

		cy.mount(<TestFirewallZonesSummary />, reduxStore);

		cy.dataTest('empty-firewall-zones:add-zone').click();

		cy.dataTest('firewall-zones:empty-firewall-zones').should(
			'not.exist'
		);
		cy.dataTest('firewall-zones:manage-access-modes').should('exist');
		cy.contains('New Zone 1').should('exist');
	});

	describe('search', () => {
		it('should keep showing the active zone details when the search yields no matches', () => {
			const reduxStore = configurePreloadedStore(soc);

			cy.mount(<TestFirewallZonesLayout />, reduxStore);

			cy.dataTest('firewall-zones:sidebar:add-zone').click();

			cy.dataTest('firewall-zones:sidebar:search-control-input')
				.shadow()
				.find('input')
				.type('does not exist');

			cy.dataTest('firewall-zones:summary:no-search-results').should(
				'not.exist'
			);
			cy.dataTest('firewall-zones:manage-access-modes').should(
				'exist'
			);
			cy.dataTest('firewall-zones:details:edit-name-trigger').should(
				'contain.text',
				'New Zone 1'
			);
		});

		it('should keep showing the active zone details when the search matches a zone', () => {
			const reduxStore = configurePreloadedStore(soc);

			cy.mount(<TestFirewallZonesLayout />, reduxStore);

			cy.dataTest('firewall-zones:sidebar:add-zone').click();
			cy.dataTest('firewall-zones:sidebar:add-zone').click();

			cy.dataTest('firewall-zones:sidebar:search-control-input')
				.shadow()
				.find('input')
				.type('New Zone');

			cy.dataTest('firewall-zones:summary:no-search-results').should(
				'not.exist'
			);
			cy.dataTest('firewall-zones:manage-access-modes').should(
				'exist'
			);
		});

		it('should preserve the active selection in the summary when it is filtered out by search', () => {
			const reduxStore = configurePreloadedStore(soc);

			cy.mount(<TestFirewallZonesLayout />, reduxStore);

			// Add two zones. "New Zone 2" is added last, so it becomes the active selection.
			cy.dataTest('firewall-zones:sidebar:add-zone').click();
			cy.dataTest('firewall-zones:sidebar:add-zone').click();

			// Search for the zone that is NOT the active selection.
			cy.dataTest('firewall-zones:sidebar:search-control-input')
				.shadow()
				.find('input')
				.type('New Zone 1');

			// The active selection must be preserved; the summary continues to
			// show the previously active zone rather than switching to the
			// search match.
			cy.dataTest('firewall-zones:details:edit-name-trigger').should(
				'contain.text',
				'New Zone 2'
			);
		});

		it('should restore zone details in the summary after clearing the search', () => {
			const reduxStore = configurePreloadedStore(soc);

			cy.mount(<TestFirewallZonesLayout />, reduxStore);

			cy.dataTest('firewall-zones:sidebar:add-zone').click();

			cy.dataTest('firewall-zones:sidebar:search-control-input')
				.shadow()
				.find('input')
				.type('does not exist');

			cy.dataTest('firewall-zones:manage-access-modes').should(
				'exist'
			);

			cy.dataTest('firewall-zones:sidebar:search-control-input')
				.shadow()
				.find('input')
				.clear();

			cy.dataTest('firewall-zones:summary:no-search-results').should(
				'not.exist'
			);
			cy.dataTest('firewall-zones:manage-access-modes').should(
				'exist'
			);
		});
	});

	describe('access mode badge', () => {
		it('should show the Open badge for a newly added zone', () => {
			const reduxStore = configurePreloadedStore(soc);

			cy.mount(<TestFirewallZonesSummary />, reduxStore);

			cy.dataTest('empty-firewall-zones:add-zone').click();

			cy.dataTest(
				'firewall-zones:manage-access-modes:access-mode'
			).should('contain.text', 'Open');
		});

		it('should switch the badge to Restricted when a single access mode is unchecked', () => {
			const reduxStore = configurePreloadedStore(soc);

			cy.mount(<TestFirewallZonesSummary />, reduxStore);

			cy.dataTest('empty-firewall-zones:add-zone').click();

			cy.dataTest(
				'firewall-zones:manage-access-modes:nonSecureNonPrivileged'
			).click();

			cy.dataTest('firewall-zones:manage-access-modes:access-mode')
				.should('contain.text', 'Restricted')
				.then(() => {
					expect(
						reduxStore.getState().firewallReducer.firewallZones[0]
							.accessMode
					).to.equal('restricted');
				});
		});

		it('should switch the badge to Blocked when all access modes are unchecked', () => {
			const reduxStore = configurePreloadedStore(soc);

			cy.mount(<TestFirewallZonesSummary />, reduxStore);

			cy.dataTest('empty-firewall-zones:add-zone').click();

			cy.dataTest(
				'firewall-zones:manage-access-modes:select-all'
			).click();

			cy.dataTest('firewall-zones:manage-access-modes:access-mode')
				.should('contain.text', 'Blocked')
				.then(() => {
					expect(
						reduxStore.getState().firewallReducer.firewallZones[0]
							.accessMode
					).to.equal('blocked');
				});
		});

		it('should switch the badge back to Open when all access modes are re-selected', () => {
			const reduxStore = configurePreloadedStore(soc);

			cy.mount(<TestFirewallZonesSummary />, reduxStore);

			cy.dataTest('empty-firewall-zones:add-zone').click();

			// Uncheck everything to reach the Blocked state.
			cy.dataTest(
				'firewall-zones:manage-access-modes:select-all'
			).click();

			cy.dataTest(
				'firewall-zones:manage-access-modes:access-mode'
			).should('contain.text', 'Blocked');

			// Re-select everything to return to the Open state.
			cy.dataTest(
				'firewall-zones:manage-access-modes:select-all'
			).click();

			cy.dataTest('firewall-zones:manage-access-modes:access-mode')
				.should('contain.text', 'Open')
				.then(() => {
					expect(
						reduxStore.getState().firewallReducer.firewallZones[0]
							.accessMode
					).to.equal('open');
				});
		});

		it('should update the sidebar zone badge to match the summary access mode change', () => {
			const reduxStore = configurePreloadedStore(soc);

			cy.mount(<TestFirewallZonesLayout />, reduxStore);

			cy.dataTest('firewall-zones:sidebar:add-zone').click();

			cy.dataTest(
				'firewall-zones:manage-access-modes:nonSecureNonPrivileged'
			).click();

			cy.dataTest('firewall-zones:manage-access-modes:access-mode')
				.should('contain.text', 'Restricted')
				.then(() => {
					const zoneId =
						reduxStore.getState().firewallReducer.firewallZones[0].id;

					cy.dataTest(
						`firewall-zones:sidebar:zone:${zoneId}:access-mode`
					).should('contain.text', 'Restricted');
				});
		});
	});
});
