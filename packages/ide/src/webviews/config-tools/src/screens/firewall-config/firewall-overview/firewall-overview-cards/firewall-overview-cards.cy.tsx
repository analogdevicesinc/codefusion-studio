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
import {getUnconfiguredFirewallCount} from '../../firewall-data';
import {withFirewallTestData} from '../../firewall-test-data';
import {addFirewallZone} from '../../../../state/slices/firewall/firewall.reducer';
import type {
	FirewallZone,
	FirewallZoneAccessModeId
} from '../../../../types/firewall';
import FirewallOverviewCards from './firewall-overview-cards';

const soc = (await import('@socs/max32690-wlp.json'))
	.default as unknown as Soc;

const SECURE_ONLY: Record<FirewallZoneAccessModeId, boolean> = {
	nonSecureNonPrivileged: false,
	nonSecurePrivileged: false,
	secureNonPrivileged: true,
	securePrivileged: true
};

const OPEN_MODES: Record<FirewallZoneAccessModeId, boolean> = {
	nonSecureNonPrivileged: true,
	nonSecurePrivileged: true,
	secureNonPrivileged: true,
	securePrivileged: true
};

const sharedEntries = [
	'initiators::Initiators::dma_dde_0',
	'responders::M55_Itcm::m55_itcm_0'
];

const conflictingZone = (
	id: string,
	accessModes: Record<FirewallZoneAccessModeId, boolean>
): FirewallZone => ({
	id,
	name: `Zone ${id}`,
	description: '',
	accessMode: 'open',
	accessModes,
	selectedFirewalls: sharedEntries
});

function TestFirewallOverviewCards() {
	return (
		<LocalizationProvider namespace='cfgtools'>
			<FirewallOverviewCards />
		</LocalizationProvider>
	);
}

describe('FirewallOverviewCards', () => {
	beforeEach(() => {
		cy.viewport(1920, 1080);
	});

	it('should render the overview cards container', () => {
		const reduxStore = configurePreloadedStore(soc);

		cy.mount(<TestFirewallOverviewCards />, reduxStore);

		cy.dataTest('firewall-overview-cards').should('exist');
	});

	it('should display the unconfigured firewall count', () => {
		const reduxStore = configurePreloadedStore(soc);

		cy.mount(<TestFirewallOverviewCards />, reduxStore);

		cy.dataTest('firewall-overview-cards:unconfigured-count').should(
			'contain.text',
			String(getUnconfiguredFirewallCount(new Set<string>()))
		);
	});

	it('should count firewalls selected in a zone as configured', () => {
		const reduxStore = configurePreloadedStore(
			withFirewallTestData(soc)
		);

		reduxStore.dispatch(
			addFirewallZone({
				id: 'zone-1',
				name: 'Zone 1',
				description: '',
				accessMode: 'open',
				accessModes: {
					nonSecureNonPrivileged: true,
					nonSecurePrivileged: true,
					secureNonPrivileged: true,
					securePrivileged: true
				},
				selectedFirewalls: [
					'initiators::Initiators::dma_dde_0',
					'responders::M55_Itcm::m55_itcm_0'
				]
			})
		);

		cy.mount(<TestFirewallOverviewCards />, reduxStore);

		cy.dataTest('firewall-overview-cards:configured-count').should(
			'have.text',
			'2'
		);
	});

	it('should count the zones by their access mode', () => {
		const reduxStore = configurePreloadedStore(soc);

		(['open', 'blocked', 'restricted', 'open'] as const).forEach(
			(accessMode, index) => {
				reduxStore.dispatch(
					addFirewallZone({
						id: `zone-${index}`,
						name: `Zone ${index}`,
						description: '',
						accessMode,
						accessModes: {
							nonSecureNonPrivileged: accessMode !== 'blocked',
							nonSecurePrivileged: accessMode === 'open',
							secureNonPrivileged: accessMode === 'open',
							securePrivileged: accessMode === 'open'
						}
					})
				);
			}
		);

		cy.mount(<TestFirewallOverviewCards />, reduxStore);

		cy.dataTest('firewall-overview-cards:openZones-count').should(
			'have.text',
			'2'
		);
		cy.dataTest('firewall-overview-cards:blockedZones-count').should(
			'have.text',
			'1'
		);
		cy.dataTest(
			'firewall-overview-cards:restrictedZones-count'
		).should('have.text', '1');
	});

	it('should render the firewall status dropdown', () => {
		const reduxStore = configurePreloadedStore(soc);

		cy.mount(<TestFirewallOverviewCards />, reduxStore);

		cy.dataTest('firewall-overview-cards:status-dropdown').should(
			'exist'
		);
	});

	describe('conflicts and errors', () => {
		it('should report no conflicts by default', () => {
			const reduxStore = configurePreloadedStore(soc);

			cy.mount(<TestFirewallOverviewCards />, reduxStore);

			cy.dataTest(
				'firewall-overview-cards:conflictsAndErrors-count'
			).should('have.text', '0');
		});

		it('should count both zones of an access mode conflict', () => {
			const reduxStore = configurePreloadedStore(soc);
			reduxStore.dispatch(
				addFirewallZone(conflictingZone('a', OPEN_MODES))
			);
			reduxStore.dispatch(
				addFirewallZone(conflictingZone('b', SECURE_ONLY))
			);

			cy.mount(<TestFirewallOverviewCards />, reduxStore);

			cy.dataTest(
				'firewall-overview-cards:conflictsAndErrors-count'
			).should('have.text', '2');
		});

		it('should report no conflicts when the access modes match', () => {
			const reduxStore = configurePreloadedStore(soc);
			reduxStore.dispatch(
				addFirewallZone(conflictingZone('a', SECURE_ONLY))
			);
			reduxStore.dispatch(
				addFirewallZone(conflictingZone('b', SECURE_ONLY))
			);

			cy.mount(<TestFirewallOverviewCards />, reduxStore);

			cy.dataTest(
				'firewall-overview-cards:conflictsAndErrors-count'
			).should('have.text', '0');
		});
	});
});
