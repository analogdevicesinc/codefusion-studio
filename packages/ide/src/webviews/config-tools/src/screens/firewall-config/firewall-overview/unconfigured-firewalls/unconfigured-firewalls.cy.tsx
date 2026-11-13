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
	initializeFirewallTestData,
	withFirewallTestData
} from '../../firewall-test-data';
import {
	getChildCount,
	getFirewallInitiators,
	getFirewallResponders,
	getUnconfiguredNodes
} from '../../firewall-data';
import {UnconfiguredFirewalls} from './unconfigured-firewalls';

const soc = withFirewallTestData(
	(await import('@socs/max32690-wlp.json')).default as unknown as Soc
);

initializeFirewallTestData();

const noConfiguredEntries = new Set<string>();
const unconfiguredInitiators = getUnconfiguredNodes(
	getFirewallInitiators(),
	'initiators',
	noConfiguredEntries
);
const unconfiguredResponders = getUnconfiguredNodes(
	getFirewallResponders(),
	'responders',
	noConfiguredEntries
);
const initiatorChildCount = getChildCount(unconfiguredInitiators);
const responderChildCount = getChildCount(unconfiguredResponders);

function TestUnconfiguredFirewalls() {
	return (
		<LocalizationProvider namespace='cfgtools'>
			<UnconfiguredFirewalls />
		</LocalizationProvider>
	);
}

describe('UnconfiguredFirewalls', () => {
	beforeEach(() => {
		cy.viewport(1920, 1080);
	});

	it('should render the unconfigured firewalls view', () => {
		const reduxStore = configurePreloadedStore(soc);

		cy.mount(<TestUnconfiguredFirewalls />, reduxStore);

		cy.dataTest('unconfigured-firewalls').should('exist');
		cy.dataTest('unconfigured-firewalls:table').should('exist');
	});

	it('should display the total unconfigured firewall count', () => {
		const reduxStore = configurePreloadedStore(soc);

		cy.mount(<TestUnconfiguredFirewalls />, reduxStore);

		cy.dataTest('unconfigured-firewalls:total-count').should(
			'contain.text',
			String(initiatorChildCount + responderChildCount)
		);
	});

	it('should render the initiators and responders tabs with counts', () => {
		const reduxStore = configurePreloadedStore(soc);

		cy.mount(<TestUnconfiguredFirewalls />, reduxStore);

		cy.dataTest('unconfigured-firewalls:tab-initiators').should(
			'exist'
		);
		cy.dataTest('unconfigured-firewalls:tab-responders').should(
			'exist'
		);
		cy.dataTest('unconfigured-firewalls:count-initiators').should(
			'contain.text',
			String(initiatorChildCount)
		);
		cy.dataTest('unconfigured-firewalls:count-responders').should(
			'contain.text',
			String(responderChildCount)
		);
	});

	it('should show initiator nodes by default', () => {
		const reduxStore = configurePreloadedStore(soc);

		cy.mount(<TestUnconfiguredFirewalls />, reduxStore);

		unconfiguredInitiators.forEach(node => {
			cy.contains(node.name).should('exist');
		});
	});

	it('should switch to the responders tab and show responder nodes', () => {
		const reduxStore = configurePreloadedStore(soc);

		cy.mount(<TestUnconfiguredFirewalls />, reduxStore);

		cy.dataTest('unconfigured-firewalls:tab-responders').click();

		unconfiguredResponders.forEach(node => {
			cy.contains(node.name).should('exist');
		});
	});

	it('should expand an accordion row to reveal child firewalls', () => {
		const reduxStore = configurePreloadedStore(soc);

		cy.mount(<TestUnconfiguredFirewalls />, reduxStore);

		const [firstNode] = unconfiguredInitiators;

		cy.contains(firstNode.name).click();

		firstNode.children.forEach(child => {
			cy.contains(child.name).should('be.visible');
		});
	});
});
