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
	removeFirewallZone,
	setFirewallZoneSearchQuery,
	updateFirewallZone
} from '../../../../state/slices/firewall/firewall.reducer';
import type {
	FirewallZone,
	FirewallZoneAccessModeId
} from '../../../../types/firewall';
import FirewallZonesSidebar from './firewall-zones-sidebar';
import {
	initializeFirewallTestData,
	withFirewallTestData
} from '../../firewall-test-data';
import {INITIATOR_GROUP_NAME} from '../../firewall-data';

const soc = withFirewallTestData(
	(await import('@socs/max32690-wlp.json')).default as unknown as Soc
);

initializeFirewallTestData();

const OPEN_ACCESS_MODES: Record<FirewallZoneAccessModeId, boolean> = {
	nonSecureNonPrivileged: true,
	nonSecurePrivileged: true,
	secureNonPrivileged: true,
	securePrivileged: true
};

const RESTRICTED_ACCESS_MODES: Record<
	FirewallZoneAccessModeId,
	boolean
> = {
	nonSecureNonPrivileged: true,
	nonSecurePrivileged: false,
	secureNonPrivileged: true,
	securePrivileged: false
};

const BLOCKED_ACCESS_MODES: Record<
	FirewallZoneAccessModeId,
	boolean
> = {
	nonSecureNonPrivileged: false,
	nonSecurePrivileged: false,
	secureNonPrivileged: false,
	securePrivileged: false
};

const SHARED_CONFLICT_ENTRIES = [
	`initiators::${INITIATOR_GROUP_NAME}::dma_dde_0`,
	'responders::M55_Itcm::m55_itcm_0'
];

function TestFirewallZonesSidebar() {
	return (
		<LocalizationProvider namespace='cfgtools'>
			<FirewallZonesSidebar />
		</LocalizationProvider>
	);
}

describe('FirewallZonesSidebar', () => {
	beforeEach(() => {
		cy.viewport(1920, 1080);
	});

	it('should render the sidebar with the add button and a zero count', () => {
		const reduxStore = configurePreloadedStore(soc);

		cy.mount(<TestFirewallZonesSidebar />, reduxStore);

		cy.dataTest('firewall-zones:sidebar').should('exist');
		cy.dataTest('firewall-zones:sidebar:add-zone').should('exist');
		cy.dataTest('firewall-zones:sidebar:count').should(
			'contain.text',
			'0'
		);
	});

	it('should show the empty sidebar state when there are no zones', () => {
		const reduxStore = configurePreloadedStore(soc);

		cy.mount(<TestFirewallZonesSidebar />, reduxStore);

		cy.dataTest('firewall-zones:empty-sidebar').should('exist');
	});

	it('should add a new zone when the add button is clicked', () => {
		const reduxStore = configurePreloadedStore(soc);

		cy.mount(<TestFirewallZonesSidebar />, reduxStore);

		cy.dataTest('firewall-zones:sidebar:add-zone').click();

		cy.dataTest('firewall-zones:sidebar:count').should(
			'contain.text',
			'1'
		);
		cy.dataTest('firewall-zones:empty-sidebar').should('not.exist');
		cy.contains('New Zone 1').should('exist');
	});

	it('should add sequentially named zones and update the count', () => {
		const reduxStore = configurePreloadedStore(soc);

		cy.mount(<TestFirewallZonesSidebar />, reduxStore);

		cy.dataTest('firewall-zones:sidebar:add-zone').click();
		cy.dataTest('firewall-zones:sidebar:add-zone').click();
		cy.dataTest('firewall-zones:sidebar:add-zone').click();

		cy.dataTest('firewall-zones:sidebar:count').should(
			'contain.text',
			'3'
		);
		cy.contains('New Zone 1').should('exist');
		cy.contains('New Zone 2').should('exist');
		cy.contains('New Zone 3').should('exist');
	});

	it('should list zones alphabetically by name', () => {
		const reduxStore = configurePreloadedStore(soc);

		const zones: FirewallZone[] = [
			{
				id: 'firewall-zone-c',
				name: 'Charlie',
				description: '',
				accessMode: 'open',
				accessModes: OPEN_ACCESS_MODES
			},
			{
				id: 'firewall-zone-a',
				name: 'Alpha',
				description: '',
				accessMode: 'open',
				accessModes: OPEN_ACCESS_MODES
			},
			{
				id: 'firewall-zone-b',
				name: 'Bravo',
				description: '',
				accessMode: 'open',
				accessModes: OPEN_ACCESS_MODES
			}
		];

		zones.forEach(zone => {
			reduxStore.dispatch(addFirewallZone(zone));
		});

		cy.mount(<TestFirewallZonesSidebar />, reduxStore);

		cy.get(
			'[data-test="firewall-zones:sidebar:zone:firewall-zone-a"], [data-test="firewall-zones:sidebar:zone:firewall-zone-b"], [data-test="firewall-zones:sidebar:zone:firewall-zone-c"]'
		).then($items => {
			const ids = [...$items].map(item =>
				item.getAttribute('data-test')
			);

			expect(ids).to.deep.equal([
				'firewall-zones:sidebar:zone:firewall-zone-a',
				'firewall-zones:sidebar:zone:firewall-zone-b',
				'firewall-zones:sidebar:zone:firewall-zone-c'
			]);
		});
	});

	it('should list zones alphanumerically by name', () => {
		const reduxStore = configurePreloadedStore(soc);

		const zones: FirewallZone[] = [
			{
				id: 'firewall-zone-10',
				name: 'Zone 10',
				description: '',
				accessMode: 'open',
				accessModes: OPEN_ACCESS_MODES
			},
			{
				id: 'firewall-zone-2',
				name: 'Zone 2',
				description: '',
				accessMode: 'open',
				accessModes: OPEN_ACCESS_MODES
			},
			{
				id: 'firewall-zone-1',
				name: 'Zone 1',
				description: '',
				accessMode: 'open',
				accessModes: OPEN_ACCESS_MODES
			}
		];

		zones.forEach(zone => {
			reduxStore.dispatch(addFirewallZone(zone));
		});

		cy.mount(<TestFirewallZonesSidebar />, reduxStore);

		cy.get(
			'[data-test="firewall-zones:sidebar:zone:firewall-zone-1"], [data-test="firewall-zones:sidebar:zone:firewall-zone-2"], [data-test="firewall-zones:sidebar:zone:firewall-zone-10"]'
		).then($items => {
			const ids = [...$items].map(item =>
				item.getAttribute('data-test')
			);

			expect(ids).to.deep.equal([
				'firewall-zones:sidebar:zone:firewall-zone-1',
				'firewall-zones:sidebar:zone:firewall-zone-2',
				'firewall-zones:sidebar:zone:firewall-zone-10'
			]);
		});
	});

	describe('search', () => {
		it('should not show the search input when there are no zones', () => {
			const reduxStore = configurePreloadedStore(soc);

			cy.mount(<TestFirewallZonesSidebar />, reduxStore);

			cy.dataTest(
				'firewall-zones:sidebar:search-control-input'
			).should('not.exist');
		});

		it('should show the search input when zones exist', () => {
			const reduxStore = configurePreloadedStore(soc);

			cy.mount(<TestFirewallZonesSidebar />, reduxStore);

			cy.dataTest('firewall-zones:sidebar:add-zone').click();

			cy.dataTest(
				'firewall-zones:sidebar:search-control-input'
			).should('exist');
		});

		it('should filter zones by name', () => {
			const reduxStore = configurePreloadedStore(soc);

			cy.mount(<TestFirewallZonesSidebar />, reduxStore);

			cy.dataTest('firewall-zones:sidebar:add-zone').click();
			cy.dataTest('firewall-zones:sidebar:add-zone').click();
			cy.dataTest('firewall-zones:sidebar:add-zone').click();

			cy.dataTest('firewall-zones:sidebar:search-control-input')
				.shadow()
				.find('input')
				.type('New Zone 2');

			cy.contains('New Zone 1').should('not.exist');
			cy.contains('New Zone 2').should('exist');
			cy.contains('New Zone 3').should('not.exist');
		});

		it('should show the no results empty state when search yields no matches', () => {
			const reduxStore = configurePreloadedStore(soc);

			cy.mount(<TestFirewallZonesSidebar />, reduxStore);

			cy.dataTest('firewall-zones:sidebar:add-zone').click();

			cy.dataTest('firewall-zones:sidebar:search-control-input')
				.shadow()
				.find('input')
				.type('does not exist');

			cy.dataTest('firewall-zones:no-search-results').should('exist');
			cy.dataTest('firewall-zones:empty-sidebar').should('not.exist');
		});

		it('should restore all zones after clearing the search', () => {
			const reduxStore = configurePreloadedStore(soc);

			cy.mount(<TestFirewallZonesSidebar />, reduxStore);

			cy.dataTest('firewall-zones:sidebar:add-zone').click();
			cy.dataTest('firewall-zones:sidebar:add-zone').click();

			cy.dataTest('firewall-zones:sidebar:search-control-input')
				.shadow()
				.find('input')
				.type('does not exist');

			cy.dataTest('firewall-zones:no-search-results').should('exist');

			cy.dataTest('firewall-zones:sidebar:search-control-input')
				.shadow()
				.find('input')
				.clear();

			cy.dataTest('firewall-zones:no-search-results').should(
				'not.exist'
			);
			cy.contains('New Zone 1').should('exist');
			cy.contains('New Zone 2').should('exist');
		});

		it('should be case-insensitive when searching zones', () => {
			const reduxStore = configurePreloadedStore(soc);

			cy.mount(<TestFirewallZonesSidebar />, reduxStore);

			cy.dataTest('firewall-zones:sidebar:add-zone').click();
			cy.dataTest('firewall-zones:sidebar:add-zone').click();

			cy.dataTest('firewall-zones:sidebar:search-control-input')
				.shadow()
				.find('input')
				.type('new zone');

			cy.contains('New Zone 1').should('exist');
			cy.contains('New Zone 2').should('exist');
		});

		it('should match zones when whitespace within the name is omitted', () => {
			const reduxStore = configurePreloadedStore(soc);

			cy.mount(<TestFirewallZonesSidebar />, reduxStore);

			cy.dataTest('firewall-zones:sidebar:add-zone').click();
			cy.dataTest('firewall-zones:sidebar:add-zone').click();

			cy.dataTest('firewall-zones:sidebar:search-control-input')
				.shadow()
				.find('input')
				.type('NEWZONE');

			cy.contains('New Zone 1').should('exist');
			cy.contains('New Zone 2').should('exist');
		});

		it('should match a specific zone when whitespace within the name is omitted', () => {
			const reduxStore = configurePreloadedStore(soc);

			cy.mount(<TestFirewallZonesSidebar />, reduxStore);

			cy.dataTest('firewall-zones:sidebar:add-zone').click();
			cy.dataTest('firewall-zones:sidebar:add-zone').click();

			cy.dataTest('firewall-zones:sidebar:search-control-input')
				.shadow()
				.find('input')
				.type('newzone2');

			cy.contains('New Zone 1').should('not.exist');
			cy.contains('New Zone 2').should('exist');
		});

		it('should clear the search query when the last zone is deleted and show a new zone added afterwards', () => {
			const reduxStore = configurePreloadedStore(soc);
			const zone: FirewallZone = {
				id: 'new-zone-1',
				name: 'New Zone 1',
				description: '',
				accessMode: 'open',
				accessModes: OPEN_ACCESS_MODES
			};
			reduxStore.dispatch(addFirewallZone(zone));

			cy.mount(<TestFirewallZonesSidebar />, reduxStore);

			// Set a search query that won't match the new zone added later
			reduxStore.dispatch(
				setFirewallZoneSearchQuery('nonmatchingquery')
			);

			// Delete the last zone
			reduxStore.dispatch(removeFirewallZone({id: zone.id}));

			// The empty sidebar state should be shown (no zones at all)
			cy.dataTest('firewall-zones:empty-sidebar').should('exist');

			// Add a new zone from the empty state
			cy.dataTest('firewall-zones:sidebar:add-zone').click();

			// The new zone should be visible, not hidden by the stale query
			cy.dataTest('firewall-zones:no-search-results').should(
				'not.exist'
			);
			cy.contains('New Zone 1').should('exist');
		});
	});

	describe('access mode badge', () => {
		it('should show the Open badge for a zone with the open access mode', () => {
			const reduxStore = configurePreloadedStore(soc);
			const zone: FirewallZone = {
				id: 'zone-open',
				name: 'Open Zone',
				description: '',
				accessMode: 'open',
				accessModes: OPEN_ACCESS_MODES
			};
			reduxStore.dispatch(addFirewallZone(zone));

			cy.mount(<TestFirewallZonesSidebar />, reduxStore);

			cy.dataTest(
				`firewall-zones:sidebar:zone:${zone.id}:access-mode`
			).should('contain.text', 'Open');
		});

		it('should show the Restricted badge for a zone with the restricted access mode', () => {
			const reduxStore = configurePreloadedStore(soc);
			const zone: FirewallZone = {
				id: 'zone-restricted',
				name: 'Restricted Zone',
				description: '',
				accessMode: 'restricted',
				accessModes: RESTRICTED_ACCESS_MODES
			};
			reduxStore.dispatch(addFirewallZone(zone));

			cy.mount(<TestFirewallZonesSidebar />, reduxStore);

			cy.dataTest(
				`firewall-zones:sidebar:zone:${zone.id}:access-mode`
			).should('contain.text', 'Restricted');
		});

		it('should show the Blocked badge for a zone with the blocked access mode', () => {
			const reduxStore = configurePreloadedStore(soc);
			const zone: FirewallZone = {
				id: 'zone-blocked',
				name: 'Blocked Zone',
				description: '',
				accessMode: 'blocked',
				accessModes: BLOCKED_ACCESS_MODES
			};
			reduxStore.dispatch(addFirewallZone(zone));

			cy.mount(<TestFirewallZonesSidebar />, reduxStore);

			cy.dataTest(
				`firewall-zones:sidebar:zone:${zone.id}:access-mode`
			).should('contain.text', 'Blocked');
		});

		it('should update the badge when the zone access mode changes', () => {
			const reduxStore = configurePreloadedStore(soc);
			const zone: FirewallZone = {
				id: 'zone-1',
				name: 'Zone 1',
				description: '',
				accessMode: 'open',
				accessModes: OPEN_ACCESS_MODES
			};
			reduxStore.dispatch(addFirewallZone(zone));

			cy.mount(<TestFirewallZonesSidebar />, reduxStore);

			cy.dataTest(
				`firewall-zones:sidebar:zone:${zone.id}:access-mode`
			).should('contain.text', 'Open');

			cy.then(() => {
				reduxStore.dispatch(
					updateFirewallZone({
						id: zone.id,
						updates: {accessModes: RESTRICTED_ACCESS_MODES}
					})
				);
			});

			cy.dataTest(
				`firewall-zones:sidebar:zone:${zone.id}:access-mode`
			).should('contain.text', 'Restricted');

			cy.then(() => {
				reduxStore.dispatch(
					updateFirewallZone({
						id: zone.id,
						updates: {accessModes: BLOCKED_ACCESS_MODES}
					})
				);
			});

			cy.dataTest(
				`firewall-zones:sidebar:zone:${zone.id}:access-mode`
			).should('contain.text', 'Blocked');
		});

		it('should render the correct badge for each zone with a different access mode', () => {
			const reduxStore = configurePreloadedStore(soc);
			const zones: FirewallZone[] = [
				{
					id: 'zone-open',
					name: 'Alpha',
					description: '',
					accessMode: 'open',
					accessModes: OPEN_ACCESS_MODES
				},
				{
					id: 'zone-restricted',
					name: 'Bravo',
					description: '',
					accessMode: 'restricted',
					accessModes: RESTRICTED_ACCESS_MODES
				},
				{
					id: 'zone-blocked',
					name: 'Charlie',
					description: '',
					accessMode: 'blocked',
					accessModes: BLOCKED_ACCESS_MODES
				}
			];

			zones.forEach(zone => {
				reduxStore.dispatch(addFirewallZone(zone));
			});

			cy.mount(<TestFirewallZonesSidebar />, reduxStore);

			cy.dataTest(
				'firewall-zones:sidebar:zone:zone-open:access-mode'
			).should('contain.text', 'Open');
			cy.dataTest(
				'firewall-zones:sidebar:zone:zone-restricted:access-mode'
			).should('contain.text', 'Restricted');
			cy.dataTest(
				'firewall-zones:sidebar:zone:zone-blocked:access-mode'
			).should('contain.text', 'Blocked');
		});
	});

	describe('initiators count', () => {
		it('should show a zero initiators count for a zone with no selected firewalls', () => {
			const reduxStore = configurePreloadedStore(soc);
			const zone: FirewallZone = {
				id: 'zone-empty',
				name: 'Empty Zone',
				description: '',
				accessMode: 'open',
				accessModes: OPEN_ACCESS_MODES
			};
			reduxStore.dispatch(addFirewallZone(zone));

			cy.mount(<TestFirewallZonesSidebar />, reduxStore);

			cy.dataTest(`firewall-zones:sidebar:zone:${zone.id}`).should(
				'contain.text',
				'0 Initiators'
			);
		});

		it('should count only the selected initiator entries, ignoring responders', () => {
			const reduxStore = configurePreloadedStore(soc);
			const zone: FirewallZone = {
				id: 'zone-with-firewalls',
				name: 'Zone With Firewalls',
				description: '',
				accessMode: 'open',
				accessModes: OPEN_ACCESS_MODES,
				selectedFirewalls: [
					`initiators::${INITIATOR_GROUP_NAME}::dma_dde_0`,
					`initiators::${INITIATOR_GROUP_NAME}::dma_dde_1`,
					'responders::SPI::SPI 1'
				]
			};
			reduxStore.dispatch(addFirewallZone(zone));

			cy.mount(<TestFirewallZonesSidebar />, reduxStore);

			cy.dataTest(`firewall-zones:sidebar:zone:${zone.id}`).should(
				'contain.text',
				'2 Initiators'
			);
		});

		it('should update the initiators count when the selected firewalls change', () => {
			const reduxStore = configurePreloadedStore(soc);
			const zone: FirewallZone = {
				id: 'zone-dynamic',
				name: 'Dynamic Zone',
				description: '',
				accessMode: 'open',
				accessModes: OPEN_ACCESS_MODES
			};
			reduxStore.dispatch(addFirewallZone(zone));

			cy.mount(<TestFirewallZonesSidebar />, reduxStore);

			cy.dataTest(`firewall-zones:sidebar:zone:${zone.id}`).should(
				'contain.text',
				'0 Initiators'
			);

			cy.then(() => {
				reduxStore.dispatch(
					updateFirewallZone({
						id: zone.id,
						updates: {
							selectedFirewalls: [
								`initiators::${INITIATOR_GROUP_NAME}::d2d`,
								`initiators::${INITIATOR_GROUP_NAME}::dma_dde_0`
							]
						}
					})
				);
			});

			cy.dataTest(`firewall-zones:sidebar:zone:${zone.id}`).should(
				'contain.text',
				'2 Initiators'
			);
		});
	});

	describe('conflict icon', () => {
		const conflictZone = (
			id: string,
			accessModes: Record<FirewallZoneAccessModeId, boolean>
		): FirewallZone => ({
			id,
			name: `Zone ${id}`,
			description: '',
			accessMode: 'open',
			accessModes,
			selectedFirewalls: SHARED_CONFLICT_ENTRIES
		});

		it('should not render a conflict icon for a valid zone', () => {
			const reduxStore = configurePreloadedStore(soc);
			reduxStore.dispatch(
				addFirewallZone(conflictZone('a', OPEN_ACCESS_MODES))
			);

			cy.mount(<TestFirewallZonesSidebar />, reduxStore);

			cy.dataTest('firewall-zones:sidebar:zone:a:conflict').should(
				'not.exist'
			);
		});

		it('should render a conflict icon on both conflicting zones', () => {
			const reduxStore = configurePreloadedStore(soc);
			reduxStore.dispatch(
				addFirewallZone(conflictZone('a', OPEN_ACCESS_MODES))
			);
			reduxStore.dispatch(
				addFirewallZone(conflictZone('b', BLOCKED_ACCESS_MODES))
			);

			cy.mount(<TestFirewallZonesSidebar />, reduxStore);

			cy.dataTest('firewall-zones:sidebar:zone:a:conflict').should(
				'exist'
			);
			cy.dataTest('firewall-zones:sidebar:zone:b:conflict').should(
				'exist'
			);
		});

		it('should leave an unrelated zone unflagged', () => {
			const reduxStore = configurePreloadedStore(soc);
			reduxStore.dispatch(
				addFirewallZone(conflictZone('a', OPEN_ACCESS_MODES))
			);
			reduxStore.dispatch(
				addFirewallZone(conflictZone('b', BLOCKED_ACCESS_MODES))
			);
			reduxStore.dispatch(
				addFirewallZone({
					...conflictZone('c', BLOCKED_ACCESS_MODES),
					selectedFirewalls: [
						`initiators::${INITIATOR_GROUP_NAME}::d2d`
					]
				})
			);

			cy.mount(<TestFirewallZonesSidebar />, reduxStore);

			cy.dataTest('firewall-zones:sidebar:zone:c:conflict').should(
				'not.exist'
			);
		});
	});
});
