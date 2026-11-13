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

import type {FirewallConfig, SocFirewall} from 'cfs-types';
import type {FirewallState} from '../types/firewall';
import {firewallInitialState} from '../state/slices/firewall/firewall.reducer';
import {
	FIREWALL_TEST_DATA,
	initializeFirewallTestData
} from '../screens/firewall-config/firewall-test-data';
import {initializeFirewall} from './firewall';
import {
	applyPersistedFirewall,
	formatFirewallPersistencePayload
} from './firewall-persistence';

function stateWith(overrides: Partial<FirewallState>): FirewallState {
	return {...firewallInitialState, ...overrides};
}

const openAccessModes = {
	nonSecureNonPrivileged: true,
	nonSecurePrivileged: true,
	secureNonPrivileged: true,
	securePrivileged: true
};

const openAccessModesPersisted = {
	NonSecureNonPrivileged: true,
	NonSecurePrivileged: true,
	SecureNonPrivileged: true,
	SecurePrivileged: true
};

describe('Firewall Persistence Utilities', () => {
	beforeEach(() => {
		// Entries are persisted by name, so the catalog must be loaded to
		// resolve them when reading back.
		initializeFirewallTestData();
	});

	describe('formatFirewallPersistencePayload', () => {
		it('should format the default state', () => {
			const result = formatFirewallPersistencePayload(
				firewallInitialState
			);

			expect(result).to.deep.equal({
				FirewallStatus: 'enabled',
				FirewallZones: [],
				ResponderOverrides: []
			});
		});

		it('should omit BinaryFilePath when empty', () => {
			const result = formatFirewallPersistencePayload(
				stateWith({firewallBinaryFilePath: ''})
			);

			expect(result).to.not.have.property('BinaryFilePath');
		});

		it('should normalize backslashes in the binary file path', () => {
			const result = formatFirewallPersistencePayload(
				stateWith({
					firewallBinaryFilePath: 'C:\\builds\\firewall.bin'
				})
			);

			expect(result.BinaryFilePath).to.equal(
				'C:/builds/firewall.bin'
			);
		});

		it('should format zones with PascalCase access modes', () => {
			const result = formatFirewallPersistencePayload(
				stateWith({
					firewallZones: [
						{
							id: 'zone-1',
							name: 'Zone 1',
							description: 'First zone',
							accessMode: 'restricted',
							accessModes: {
								nonSecureNonPrivileged: true,
								nonSecurePrivileged: false,
								secureNonPrivileged: false,
								securePrivileged: true
							}
						}
					]
				})
			);

			expect(result.FirewallZones).to.have.length(1);
			expect(result.FirewallZones![0]).to.deep.equal({
				Name: 'Zone 1',
				Description: 'First zone',
				Initiators: [],
				Responders: [],
				AccessModes: {
					NonSecureNonPrivileged: true,
					NonSecurePrivileged: false,
					SecureNonPrivileged: false,
					SecurePrivileged: true
				}
			});
		});

		it('should not persist the zone id or the derived access mode', () => {
			const result = formatFirewallPersistencePayload(
				stateWith({
					firewallZones: [
						{
							id: 'zone-1',
							name: 'Zone 1',
							description: '',
							accessMode: 'open',
							accessModes: openAccessModes
						}
					]
				})
			);

			expect(result.FirewallZones![0]).to.not.have.property('Id');
			expect(result.FirewallZones![0]).to.not.have.property('id');
			expect(result.FirewallZones![0]).to.not.have.property(
				'accessMode'
			);
			expect(result.FirewallZones![0]).to.not.have.property(
				'Description'
			);
		});

		it('should split entry keys into initiator and responder names', () => {
			const result = formatFirewallPersistencePayload(
				stateWith({
					firewallZones: [
						{
							id: 'zone-1',
							name: 'Zone 1',
							description: '',
							accessMode: 'open',
							accessModes: openAccessModes,
							selectedFirewalls: [
								'initiators::Initiators::dma_dde_0',
								'responders::M55_Itcm::m55_itcm_0'
							]
						}
					]
				})
			);

			expect(result.FirewallZones![0].Initiators).to.deep.equal([
				'dma_dde_0'
			]);
			expect(result.FirewallZones![0].Responders).to.deep.equal([
				{Name: 'm55_itcm_0', Group: 'M55_Itcm'}
			]);
		});

		it('should persist a configured responder address inline', () => {
			const result = formatFirewallPersistencePayload(
				stateWith({
					firewallZones: [
						{
							id: 'zone-1',
							name: 'Zone 1',
							description: '',
							accessMode: 'open',
							accessModes: openAccessModes,
							selectedFirewalls: [
								'responders::D2D_Dd_Mem::d2d_dd_mem_0'
							]
						}
					],
					responderConfigs: {
						'responders::D2D_Dd_Mem::d2d_dd_mem_0': {
							startAddress: '0x61000000'
						}
					}
				})
			);

			expect(result.FirewallZones![0].Responders).to.deep.equal([
				{
					Name: 'd2d_dd_mem_0',
					Group: 'D2D_Dd_Mem',
					BaseAddress: '0x61000000'
				}
			]);
		});

		it('should drop malformed entry keys', () => {
			const result = formatFirewallPersistencePayload(
				stateWith({
					firewallZones: [
						{
							id: 'zone-1',
							name: 'Zone 1',
							description: '',
							accessMode: 'open',
							accessModes: openAccessModes,
							selectedFirewalls: [
								'not-a-key',
								'unknown::Group::entry',
								'initiators::Initiators::dma_dde_0'
							]
						}
					]
				})
			);

			expect(result.FirewallZones![0].Initiators).to.have.length(1);
			expect(result.FirewallZones![0].Responders).to.have.length(0);
		});

		it('should format responder overrides', () => {
			const result = formatFirewallPersistencePayload(
				stateWith({
					responderConfigs: {
						'responders::D2D_Dd_Mem::d2d_dd_mem_0': {
							name: 'Renamed',
							description: 'Edited description',
							startAddress: '0x61000000'
						}
					}
				})
			);

			expect(result.ResponderOverrides).to.deep.equal([
				{
					Name: 'd2d_dd_mem_0',
					Group: 'D2D_Dd_Mem',
					DisplayName: 'Renamed',
					Description: 'Edited description',
					AddressStart: '0x61000000'
				}
			]);
		});

		it('should drop responder overrides that hold no edits', () => {
			const result = formatFirewallPersistencePayload(
				stateWith({
					responderConfigs: {
						'responders::D2D_Dd_Mem::d2d_dd_mem_0': {},
						'responders::D2D_Dd_Mem::d2d_dd_mem_1': {
							name: 'Renamed'
						}
					}
				})
			);

			expect(result.ResponderOverrides).to.have.length(1);
			expect(result.ResponderOverrides![0].Name).to.equal(
				'd2d_dd_mem_1'
			);
		});

		it('should persist a cleared responder description', () => {
			const result = formatFirewallPersistencePayload(
				stateWith({
					responderConfigs: {
						'responders::D2D_Dd_Mem::d2d_dd_mem_0': {
							description: ''
						}
					}
				})
			);

			expect(result.ResponderOverrides).to.deep.equal([
				{Name: 'd2d_dd_mem_0', Group: 'D2D_Dd_Mem', Description: ''}
			]);
		});
	});

	describe('applyPersistedFirewall', () => {
		it('should return no overrides when nothing is persisted', () => {
			expect(applyPersistedFirewall(undefined)).to.deep.equal({});
		});

		it('should fall back to enabled for an unknown firewall status', () => {
			const result = applyPersistedFirewall({
				FirewallStatus: 'bogus'
			} as unknown as FirewallConfig);

			expect(result.firewallStatus).to.equal('enabled');
		});

		it('should restore the persisted firewall status', () => {
			const result = applyPersistedFirewall({
				FirewallStatus: 'overrideAllBlocked'
			});

			expect(result.firewallStatus).to.equal('overrideAllBlocked');
		});

		it('should generate zone ids and activate the first zone', () => {
			const result = applyPersistedFirewall({
				FirewallStatus: 'enabled',
				FirewallZones: [
					{
						Name: 'Zone 1',
						AccessModes: openAccessModesPersisted
					},
					{
						Name: 'Zone 2',
						AccessModes: {}
					}
				]
			});

			const [first, second] = result.firewallZones!;

			expect(first.id).to.be.a('string').and.not.be.empty;
			expect(first.id).to.not.equal(second.id);
			expect(result.activeZoneId).to.equal(first.id);
		});

		it('should rebuild entry keys from names, resolving responder groups', () => {
			const result = applyPersistedFirewall({
				FirewallStatus: 'enabled',
				FirewallZones: [
					{
						Name: 'Zone 1',
						Initiators: ['dma_dde_0'],
						Responders: [
							'm55_itcm_0',
							{Name: 'd2d_dd_mem_0', BaseAddress: '0x61000000'},
							'not_in_the_data_model'
						],
						AccessModes: openAccessModesPersisted
					}
				]
			});

			expect(
				result.firewallZones![0].selectedFirewalls
			).to.deep.equal([
				'initiators::Initiators::dma_dde_0',
				'responders::M55_Itcm::m55_itcm_0',
				'responders::D2D_Dd_Mem::d2d_dd_mem_0'
			]);
		});

		it('should drop initiators the data model does not define', () => {
			const result = applyPersistedFirewall({
				FirewallStatus: 'enabled',
				FirewallZones: [
					{
						Name: 'Zone 1',
						Initiators: ['dma_dde_0', 'not_in_the_data_model'],
						AccessModes: openAccessModesPersisted
					}
				]
			});

			expect(
				result.firewallZones![0].selectedFirewalls
			).to.deep.equal(['initiators::Initiators::dma_dde_0']);
		});

		it('should restore the responder name, description and address overrides', () => {
			const result = applyPersistedFirewall({
				FirewallStatus: 'enabled',
				FirewallZones: [
					{
						Name: 'Zone 1',
						Responders: ['d2d_dd_mem_0'],
						AccessModes: openAccessModesPersisted
					}
				],
				ResponderOverrides: [
					{
						Name: 'd2d_dd_mem_0',
						DisplayName: 'Renamed',
						Description: 'Edited description',
						AddressStart: '0x61000000'
					}
				]
			});

			expect(result.responderConfigs).to.deep.equal({
				'responders::D2D_Dd_Mem::d2d_dd_mem_0': {
					name: 'Renamed',
					description: 'Edited description',
					startAddress: '0x61000000'
				}
			});
		});

		it('should drop overrides for responders no zone references', () => {
			const result = applyPersistedFirewall({
				FirewallStatus: 'enabled',
				FirewallZones: [
					{
						Name: 'Zone 1',
						Responders: ['m55_itcm_0'],
						AccessModes: openAccessModesPersisted
					}
				],
				ResponderOverrides: [
					{Name: 'd2d_dd_mem_0', DisplayName: 'Stale'}
				]
			});

			expect(result.responderConfigs).to.deep.equal({});
		});

		it('should restore a cleared responder description', () => {
			const result = applyPersistedFirewall({
				FirewallStatus: 'enabled',
				FirewallZones: [
					{
						Name: 'Zone 1',
						Responders: ['d2d_dd_mem_0'],
						AccessModes: openAccessModesPersisted
					}
				],
				ResponderOverrides: [{Name: 'd2d_dd_mem_0', Description: ''}]
			});

			expect(result.responderConfigs).to.deep.equal({
				'responders::D2D_Dd_Mem::d2d_dd_mem_0': {description: ''}
			});
		});

		it('should restore an inline responder address with no matching override', () => {
			const result = applyPersistedFirewall({
				FirewallStatus: 'enabled',
				FirewallZones: [
					{
						Name: 'Zone 1',
						Responders: [
							{Name: 'd2d_dd_mem_0', BaseAddress: '0x61000000'},
							'm55_itcm_0'
						],
						AccessModes: openAccessModesPersisted
					}
				]
			});

			expect(result.responderConfigs).to.deep.equal({
				'responders::D2D_Dd_Mem::d2d_dd_mem_0': {
					startAddress: '0x61000000'
				}
			});
		});

		it('should normalize the casing of an inline responder address', () => {
			const result = applyPersistedFirewall({
				FirewallStatus: 'enabled',
				FirewallZones: [
					{
						Name: 'Zone 1',
						Responders: [
							{Name: 'd2d_dd_mem_0', BaseAddress: '0X61000000'}
						],
						AccessModes: openAccessModesPersisted
					}
				]
			});

			// Catalog addresses are normalized and compared with exact string
			// equality, so an unnormalized value would leave the start address
			// dropdown and the region subtitle unresolved.
			expect(result.responderConfigs).to.deep.equal({
				'responders::D2D_Dd_Mem::d2d_dd_mem_0': {
					startAddress: '0x61000000'
				}
			});
		});

		it('should normalize the casing of a responder override address', () => {
			const result = applyPersistedFirewall({
				FirewallStatus: 'enabled',
				FirewallZones: [
					{
						Name: 'Zone 1',
						Responders: ['d2d_dd_mem_0'],
						AccessModes: openAccessModesPersisted
					}
				],
				ResponderOverrides: [
					{Name: 'd2d_dd_mem_0', AddressStart: '0X61ABCDEF'}
				]
			});

			expect(result.responderConfigs).to.deep.equal({
				'responders::D2D_Dd_Mem::d2d_dd_mem_0': {
					startAddress: '0x61abcdef'
				}
			});
		});

		it('should normalize an override address that supersedes an inline one', () => {
			const result = applyPersistedFirewall({
				FirewallStatus: 'enabled',
				FirewallZones: [
					{
						Name: 'Zone 1',
						Responders: [
							{Name: 'd2d_dd_mem_0', BaseAddress: '0x61000000'}
						],
						AccessModes: openAccessModesPersisted
					}
				],
				ResponderOverrides: [
					{Name: 'd2d_dd_mem_0', AddressStart: '0X62000000'}
				]
			});

			expect(result.responderConfigs).to.deep.equal({
				'responders::D2D_Dd_Mem::d2d_dd_mem_0': {
					startAddress: '0x62000000'
				}
			});
		});

		it('should let an explicit override win over an inline address', () => {
			const result = applyPersistedFirewall({
				FirewallStatus: 'enabled',
				FirewallZones: [
					{
						Name: 'Zone 1',
						Responders: [
							{Name: 'd2d_dd_mem_0', BaseAddress: '0x61000000'}
						],
						AccessModes: openAccessModesPersisted
					}
				],
				ResponderOverrides: [
					{
						Name: 'd2d_dd_mem_0',
						DisplayName: 'Renamed',
						AddressStart: '0x62000000'
					}
				]
			});

			expect(result.responderConfigs).to.deep.equal({
				'responders::D2D_Dd_Mem::d2d_dd_mem_0': {
					name: 'Renamed',
					startAddress: '0x62000000'
				}
			});
		});

		it('should keep an inline address when an override edits other fields', () => {
			const result = applyPersistedFirewall({
				FirewallStatus: 'enabled',
				FirewallZones: [
					{
						Name: 'Zone 1',
						Responders: [
							{Name: 'd2d_dd_mem_0', BaseAddress: '0x61000000'}
						],
						AccessModes: openAccessModesPersisted
					}
				],
				ResponderOverrides: [
					{Name: 'd2d_dd_mem_0', Description: 'Edited description'}
				]
			});

			expect(result.responderConfigs).to.deep.equal({
				'responders::D2D_Dd_Mem::d2d_dd_mem_0': {
					description: 'Edited description',
					startAddress: '0x61000000'
				}
			});
		});

		it('should ignore inline addresses on responders the data model does not define', () => {
			const result = applyPersistedFirewall({
				FirewallStatus: 'enabled',
				FirewallZones: [
					{
						Name: 'Zone 1',
						Responders: [
							{
								Name: 'not_in_the_data_model',
								BaseAddress: '0x61000000'
							}
						],
						AccessModes: openAccessModesPersisted
					}
				]
			});

			expect(result.responderConfigs).to.deep.equal({});
		});

		it('should recompute the derived access mode', () => {
			const result = applyPersistedFirewall({
				FirewallStatus: 'enabled',
				FirewallZones: [
					{
						Name: 'Open',
						AccessModes: openAccessModesPersisted
					},
					{
						Name: 'Blocked',
						AccessModes: {
							NonSecureNonPrivileged: false,
							NonSecurePrivileged: false,
							SecureNonPrivileged: false,
							SecurePrivileged: false
						}
					},
					{
						Name: 'Restricted',
						AccessModes: {NonSecureNonPrivileged: true}
					}
				]
			});

			expect(
				result.firewallZones!.map(zone => zone.accessMode)
			).to.deep.equal(['open', 'blocked', 'restricted']);
		});
	});

	describe('round trip', () => {
		it('should preserve the state through a format and apply cycle', () => {
			const original = stateWith({
				firewallStatus: 'overrideAllOpen',
				firewallBinaryFilePath: 'out/firewall.bin',
				firewallZones: [
					{
						id: 'zone-1',
						name: 'Zone 1',
						description: 'First zone',
						accessMode: 'restricted',
						accessModes: {
							nonSecureNonPrivileged: true,
							nonSecurePrivileged: false,
							secureNonPrivileged: true,
							securePrivileged: false
						},
						selectedFirewalls: [
							'initiators::Initiators::dma_dde_0',
							'responders::M55_Itcm::m55_itcm_0',
							'responders::D2D_Dd_Mem::d2d_dd_mem_0'
						]
					}
				],
				responderConfigs: {
					'responders::D2D_Dd_Mem::d2d_dd_mem_0': {
						name: 'Renamed',
						description: 'Edited description',
						startAddress: '0x61000000'
					}
				}
			});

			const restored = applyPersistedFirewall(
				formatFirewallPersistencePayload(original)
			);

			expect(restored.firewallStatus).to.equal('overrideAllOpen');
			expect(restored.firewallBinaryFilePath).to.equal(
				'out/firewall.bin'
			);
			expect(restored.responderConfigs).to.deep.equal(
				original.responderConfigs
			);

			const [zone] = restored.firewallZones!;

			expect(zone.id).to.be.a('string').and.not.be.empty;
			expect(zone.name).to.equal('Zone 1');
			expect(zone.description).to.equal('First zone');
			expect(zone.accessMode).to.equal('restricted');
			expect(zone.accessModes).to.deep.equal(
				original.firewallZones[0].accessModes
			);
			expect(zone.selectedFirewalls).to.deep.equal(
				original.firewallZones[0].selectedFirewalls
			);
		});

		it('should not drop an inline-only address when re-saving', () => {
			const persisted: FirewallConfig = {
				FirewallStatus: 'enabled',
				FirewallZones: [
					{
						Name: 'Zone 1',
						Responders: [
							{Name: 'd2d_dd_mem_0', BaseAddress: '0x61000000'}
						],
						AccessModes: openAccessModesPersisted
					}
				]
			};

			const restored = applyPersistedFirewall(persisted);
			const resaved = formatFirewallPersistencePayload(
				stateWith(restored)
			);

			expect(resaved.FirewallZones![0].Responders).to.deep.equal([
				{
					Name: 'd2d_dd_mem_0',
					Group: 'D2D_Dd_Mem',
					BaseAddress: '0x61000000'
				}
			]);
			expect(resaved.ResponderOverrides).to.deep.equal([
				{
					Name: 'd2d_dd_mem_0',
					Group: 'D2D_Dd_Mem',
					AddressStart: '0x61000000'
				}
			]);
		});

		it('should keep a cleared description cleared across a save and reload', () => {
			const cleared = stateWith({
				firewallZones: [
					{
						id: 'zone-1',
						name: 'Zone 1',
						description: '',
						accessMode: 'open',
						accessModes: openAccessModes,
						selectedFirewalls: [
							'responders::D2D_Dd_Mem::d2d_dd_mem_0'
						]
					}
				],
				responderConfigs: {
					'responders::D2D_Dd_Mem::d2d_dd_mem_0': {
						description: ''
					}
				}
			});

			const restored = applyPersistedFirewall(
				formatFirewallPersistencePayload(cleared)
			);

			// `undefined` here would make the sidebar fall back to the
			// data-model description, undoing the user's edit.
			expect(
				restored.responderConfigs?.[
					'responders::D2D_Dd_Mem::d2d_dd_mem_0'
				]?.description
			).to.equal('');
		});
	});

	describe('responder names shared across groups', () => {
		const COLLIDING_FIREWALL: SocFirewall = {
			Initiators: FIREWALL_TEST_DATA.Initiators,
			ResponderGroups: [
				{
					Name: 'Group_A',
					Description: 'Group A',
					Responders: [
						{
							Name: 'responder_0',
							Description: 'Group A responder 0',
							Id: 1,
							Type: 'ProgrammableRegion'
						}
					]
				},
				{
					Name: 'Group_B',
					Description: 'Group B',
					Responders: [
						{
							Name: 'responder_0',
							Description: 'Group B responder 0',
							Id: 2,
							Type: 'ProgrammableRegion'
						}
					]
				}
			]
		};

		beforeEach(() => {
			initializeFirewall(COLLIDING_FIREWALL);
		});

		it('should keep both selections across a save and reload', () => {
			const selectedFirewalls = [
				'responders::Group_A::responder_0',
				'responders::Group_B::responder_0'
			];

			const restored = applyPersistedFirewall(
				formatFirewallPersistencePayload(
					stateWith({
						firewallZones: [
							{
								id: 'zone-1',
								name: 'Zone 1',
								description: '',
								accessMode: 'open',
								accessModes: openAccessModes,
								selectedFirewalls
							}
						]
					})
				)
			);

			expect(
				restored.firewallZones![0].selectedFirewalls
			).to.deep.equal(selectedFirewalls);
		});

		it('should apply an override to the responder in its own group', () => {
			const restored = applyPersistedFirewall({
				FirewallStatus: 'enabled',
				FirewallZones: [
					{
						Name: 'Zone 1',
						Responders: [{Name: 'responder_0', Group: 'Group_B'}],
						AccessModes: openAccessModesPersisted
					}
				],
				ResponderOverrides: [
					{
						Name: 'responder_0',
						Group: 'Group_B',
						DisplayName: 'Renamed'
					}
				]
			});

			expect(restored.responderConfigs).to.deep.equal({
				'responders::Group_B::responder_0': {name: 'Renamed'}
			});
		});

		it('should resolve a responder persisted without a group by name', () => {
			const restored = applyPersistedFirewall({
				FirewallStatus: 'enabled',
				FirewallZones: [
					{
						Name: 'Zone 1',
						Responders: ['responder_0'],
						AccessModes: openAccessModesPersisted
					}
				]
			});

			expect(
				restored.firewallZones![0].selectedFirewalls
			).to.deep.equal(['responders::Group_A::responder_0']);
		});
	});
});
