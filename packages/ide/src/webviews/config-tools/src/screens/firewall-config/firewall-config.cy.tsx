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

import type {Soc} from '../../../../common/types/soc';
import {configurePreloadedStore} from '../../state/store';
import {LocalizationProvider} from '../../../../common/contexts/LocaleContext';
import {navigationItems} from '../../../../common/constants/navigation';
import type {NavigationItem} from '../../../../common/types/navigation';
import {getUnconfiguredFirewallCount} from './firewall-data';
import {FirewallConfig} from './firewall-config';

const soc = (await import('@socs/max32690-wlp.json'))
	.default as unknown as Soc;

function TestFirewallConfig({
	initialActiveScreenSubscreen
}: {
	readonly initialActiveScreenSubscreen?: NavigationItem;
}) {
	return (
		<LocalizationProvider namespace='cfgtools'>
			<FirewallConfig
				initialActiveScreenSubscreen={initialActiveScreenSubscreen}
			/>
		</LocalizationProvider>
	);
}

describe('FirewallConfig', () => {
	beforeEach(() => {
		cy.viewport(1920, 1080);
	});

	it('should render the container and firewall overview by default', () => {
		const reduxStore = configurePreloadedStore(soc);

		cy.mount(<TestFirewallConfig />, reduxStore);

		cy.dataTest('firewall-config:container').should('exist');
		cy.dataTest('firewall-overview').should('exist');
		cy.dataTest('firewall-overview-cards').should('exist');
	});

	it('should render the firewall zones subscreen when provided as the initial subscreen', () => {
		const reduxStore = configurePreloadedStore(soc);

		cy.mount(
			<TestFirewallConfig
				initialActiveScreenSubscreen={navigationItems.firewallZones}
			/>,
			reduxStore
		);

		cy.dataTest('firewall-zones:summary').should('exist');
		cy.dataTest('firewall-overview').should('not.exist');
	});

	it('should show the same unconfigured count in the overview cards and the unconfigured firewalls header', () => {
		const reduxStore = configurePreloadedStore(soc);

		cy.mount(<TestFirewallConfig />, reduxStore);

		cy.dataTest('firewall-overview-cards:unconfigured-count')
			.invoke('text')
			.then(cardText => {
				const count = cardText.trim();

				expect(count).to.equal(
					String(getUnconfiguredFirewallCount(new Set<string>()))
				);

				cy.dataTest('unconfigured-firewalls:total-count').should(
					'contain.text',
					count
				);
			});
	});

	it('should not display the warning banner when the firewall status is enabled', () => {
		const reduxStore = configurePreloadedStore(soc);

		cy.mount(<TestFirewallConfig />, reduxStore);

		cy.dataTest('firewall-overview:banner').should('not.exist');
	});

	it('should display the warning banner when "Override - All Blocked" is selected', () => {
		const reduxStore = configurePreloadedStore(soc);

		cy.mount(<TestFirewallConfig />, reduxStore);

		cy.dataTest('firewall-overview:banner').should('not.exist');

		cy.get('#firewall-status-controlDropdown')
			.should('be.visible')
			.click();
		cy.get('#firewall-status_overrideAllBlocked')
			.should('be.visible')
			.click();

		cy.dataTest('firewall-overview:banner')
			.should('exist')
			.then(() => {
				expect(
					reduxStore.getState().firewallReducer.firewallStatus
				).to.equal('overrideAllBlocked');
			});
	});

	it('should display the warning banner when "Override - All Open" is selected', () => {
		const reduxStore = configurePreloadedStore(soc);

		cy.mount(<TestFirewallConfig />, reduxStore);

		cy.dataTest('firewall-overview:banner').should('not.exist');

		cy.get('#firewall-status-controlDropdown')
			.should('be.visible')
			.click();
		cy.get('#firewall-status_overrideAllOpen')
			.should('be.visible')
			.click();

		cy.dataTest('firewall-overview:banner')
			.should('exist')
			.then(() => {
				expect(
					reduxStore.getState().firewallReducer.firewallStatus
				).to.equal('overrideAllOpen');
			});
	});

	it('should reset the firewall status to enabled when the banner enable button is clicked', () => {
		const reduxStore = configurePreloadedStore(soc);

		cy.mount(<TestFirewallConfig />, reduxStore);

		cy.get('#firewall-status-controlDropdown')
			.should('be.visible')
			.click();
		cy.get('#firewall-status_overrideAllBlocked')
			.should('be.visible')
			.click();

		cy.dataTest('firewall-overview:banner').should('exist');

		cy.dataTest('firewall-overview:banner-enable-button')
			.should('be.visible')
			.click();

		cy.dataTest('firewall-overview:banner')
			.should('not.exist')
			.then(() => {
				expect(
					reduxStore.getState().firewallReducer.firewallStatus
				).to.equal('enabled');
			});
	});
});
