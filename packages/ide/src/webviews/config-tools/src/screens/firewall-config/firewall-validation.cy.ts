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

import type {
	FirewallZone,
	FirewallZoneAccessModeId,
	ResponderConfig
} from '../../types/firewall';
import {INITIATOR_GROUP_NAME} from './firewall-data';
import {initializeFirewallTestData} from './firewall-test-data';
import {
	getConflictingZoneIds,
	getFirewallErrorCount,
	getZoneAccessModeConflicts,
	getZoneOverlapConflicts,
	getZoneRegionRanges
} from './firewall-validation';

initializeFirewallTestData();

// Addresses defined by the addressable responders in the test data, which are
// the options a programmable region can point at.
const REGION_A = '0x20400000';
const REGION_B = '0x20408000';
const REGION_C = '0x20410000';

const PROGRAMMABLE_0 = 'responders::D2D_Dd_Mem::d2d_dd_mem_0';
const PROGRAMMABLE_1 = 'responders::D2D_Dd_Mem::d2d_dd_mem_1';
const PROGRAMMABLE_2 = 'responders::D2D_Dd_Mem::d2d_dd_mem_2';
const ADDRESSABLE_RESPONDER = 'responders::M55_Itcm::m55_itcm_0';

const INITIATOR_A = `initiators::${INITIATOR_GROUP_NAME}::dma_dde_0`;
const INITIATOR_B = `initiators::${INITIATOR_GROUP_NAME}::dma_dde_1`;

type AccessModes = Record<FirewallZoneAccessModeId, boolean>;

const ALL_MODES: AccessModes = {
	nonSecureNonPrivileged: true,
	nonSecurePrivileged: true,
	secureNonPrivileged: true,
	securePrivileged: true
};

const NON_SECURE_ONLY: AccessModes = {
	nonSecureNonPrivileged: true,
	nonSecurePrivileged: true,
	secureNonPrivileged: false,
	securePrivileged: false
};

const SECURE_ONLY: AccessModes = {
	nonSecureNonPrivileged: false,
	nonSecurePrivileged: false,
	secureNonPrivileged: true,
	securePrivileged: true
};

const createZone = (
	id: string,
	selectedFirewalls: string[],
	accessModes: AccessModes = ALL_MODES
): FirewallZone => ({
	id,
	name: `Zone ${id}`,
	description: '',
	accessMode: 'open',
	accessModes,
	selectedFirewalls
});

const configs = (
	entries: Record<string, string>
): Record<string, ResponderConfig> =>
	Object.fromEntries(
		Object.entries(entries).map(([key, startAddress]) => [
			key,
			{startAddress}
		])
	);

describe('getZoneRegionRanges', () => {
	it('should return an empty list when there is no zone', () => {
		expect(getZoneRegionRanges(undefined, {})).to.deep.equal([]);
	});

	it('should resolve the range of a programmable region from its configured address', () => {
		const zone = createZone('1', [PROGRAMMABLE_0]);

		const ranges = getZoneRegionRanges(
			zone,
			configs({[PROGRAMMABLE_0]: REGION_A})
		);

		expect(ranges).to.have.length(1);
		expect(ranges[0].entryKey).to.equal(PROGRAMMABLE_0);
		expect(ranges[0].dataModelName).to.equal('d2d_dd_mem_0');
		expect(ranges[0].start).to.equal(0x20400000);
		expect(ranges[0].end).to.equal(0x20407fff);
	});

	it('should ignore responders that are not programmable regions', () => {
		const zone = createZone('1', [ADDRESSABLE_RESPONDER]);

		expect(getZoneRegionRanges(zone, {})).to.deep.equal([]);
	});

	it('should ignore initiator entries', () => {
		const zone = createZone('1', [INITIATOR_A]);

		expect(getZoneRegionRanges(zone, {})).to.deep.equal([]);
	});

	it('should skip a programmable region with no configured address', () => {
		const zone = createZone('1', [PROGRAMMABLE_0]);

		expect(getZoneRegionRanges(zone, {})).to.deep.equal([]);
	});

	it('should skip an address that does not match a known region', () => {
		const zone = createZone('1', [PROGRAMMABLE_0]);

		expect(
			getZoneRegionRanges(
				zone,
				configs({[PROGRAMMABLE_0]: '0xdeadbeef'})
			)
		).to.deep.equal([]);
	});

	it('should resolve a repeated entry key only once', () => {
		const zone = createZone('1', [PROGRAMMABLE_0, PROGRAMMABLE_0]);

		expect(
			getZoneRegionRanges(zone, configs({[PROGRAMMABLE_0]: REGION_A}))
		).to.have.length(1);
	});
});

describe('getZoneOverlapConflicts', () => {
	it('should report no conflicts when regions point at different addresses', () => {
		const zone = createZone('1', [PROGRAMMABLE_0, PROGRAMMABLE_1]);

		expect(
			getZoneOverlapConflicts(
				zone,
				configs({
					[PROGRAMMABLE_0]: REGION_A,
					[PROGRAMMABLE_1]: REGION_B
				})
			)
		).to.deep.equal({});
	});

	it('should report both regions when two share an address', () => {
		const zone = createZone('1', [PROGRAMMABLE_0, PROGRAMMABLE_1]);

		const conflicts = getZoneOverlapConflicts(
			zone,
			configs({
				[PROGRAMMABLE_0]: REGION_A,
				[PROGRAMMABLE_1]: REGION_A
			})
		);

		expect(conflicts).to.deep.equal({
			[PROGRAMMABLE_0]: 'd2d_dd_mem_1',
			[PROGRAMMABLE_1]: 'd2d_dd_mem_0'
		});
	});

	it('should report every region involved in a three way overlap', () => {
		const zone = createZone('1', [
			PROGRAMMABLE_0,
			PROGRAMMABLE_1,
			PROGRAMMABLE_2
		]);

		const conflicts = getZoneOverlapConflicts(
			zone,
			configs({
				[PROGRAMMABLE_0]: REGION_A,
				[PROGRAMMABLE_1]: REGION_A,
				[PROGRAMMABLE_2]: REGION_A
			})
		);

		expect(Object.keys(conflicts)).to.have.length(3);
	});

	it('should not report a region that differs from the overlapping pair', () => {
		const zone = createZone('1', [
			PROGRAMMABLE_0,
			PROGRAMMABLE_1,
			PROGRAMMABLE_2
		]);

		const conflicts = getZoneOverlapConflicts(
			zone,
			configs({
				[PROGRAMMABLE_0]: REGION_A,
				[PROGRAMMABLE_1]: REGION_A,
				[PROGRAMMABLE_2]: REGION_C
			})
		);

		expect(Object.keys(conflicts)).to.deep.equal([
			PROGRAMMABLE_0,
			PROGRAMMABLE_1
		]);
	});

	it('should report no conflicts for a single region', () => {
		const zone = createZone('1', [PROGRAMMABLE_0]);

		expect(
			getZoneOverlapConflicts(
				zone,
				configs({[PROGRAMMABLE_0]: REGION_A})
			)
		).to.deep.equal({});
	});
});

describe('getZoneAccessModeConflicts', () => {
	it('should report no conflict when the zones share an initiator but no responder', () => {
		const zoneA = createZone(
			'a',
			[INITIATOR_A, PROGRAMMABLE_0],
			NON_SECURE_ONLY
		);
		const zoneB = createZone(
			'b',
			[INITIATOR_A, PROGRAMMABLE_1, PROGRAMMABLE_2],
			SECURE_ONLY
		);

		expect(
			getZoneAccessModeConflicts(zoneA, [zoneA, zoneB])
		).to.deep.equal([]);
	});

	it('should report a conflict when the zones share an initiator and a responder', () => {
		const zoneC = createZone(
			'c',
			[INITIATOR_A, PROGRAMMABLE_0],
			NON_SECURE_ONLY
		);
		const zoneD = createZone(
			'd',
			[INITIATOR_A, PROGRAMMABLE_0, PROGRAMMABLE_2],
			SECURE_ONLY
		);

		const conflicts = getZoneAccessModeConflicts(zoneC, [
			zoneC,
			zoneD
		]);

		expect(conflicts).to.have.length(1);
		expect(conflicts[0].initiatorName).to.equal('dma_dde_0');
		expect(conflicts[0].responderName).to.equal('d2d_dd_mem_0');
		expect(conflicts[0].conflictingZoneNames).to.deep.equal([
			'Zone d'
		]);
	});

	it('should report the conflict from both zones', () => {
		const zoneC = createZone(
			'c',
			[INITIATOR_A, PROGRAMMABLE_0],
			NON_SECURE_ONLY
		);
		const zoneD = createZone(
			'd',
			[INITIATOR_A, PROGRAMMABLE_0],
			SECURE_ONLY
		);

		expect(
			getZoneAccessModeConflicts(zoneD, [zoneC, zoneD])
		).to.have.length(1);
	});

	it('should report no conflict when the access modes match exactly', () => {
		const zoneC = createZone(
			'c',
			[INITIATOR_A, PROGRAMMABLE_0],
			SECURE_ONLY
		);
		const zoneD = createZone(
			'd',
			[INITIATOR_A, PROGRAMMABLE_0],
			SECURE_ONLY
		);

		expect(
			getZoneAccessModeConflicts(zoneC, [zoneC, zoneD])
		).to.deep.equal([]);
	});

	it('should report one entry per initiator and responder pair', () => {
		const zoneC = createZone(
			'c',
			[INITIATOR_A, INITIATOR_B, PROGRAMMABLE_0, PROGRAMMABLE_1],
			NON_SECURE_ONLY
		);
		const zoneD = createZone(
			'd',
			[INITIATOR_A, INITIATOR_B, PROGRAMMABLE_0, PROGRAMMABLE_1],
			SECURE_ONLY
		);

		expect(
			getZoneAccessModeConflicts(zoneC, [zoneC, zoneD])
		).to.have.length(4);
	});

	it('should list every conflicting zone for a pair', () => {
		const zoneC = createZone(
			'c',
			[INITIATOR_A, PROGRAMMABLE_0],
			ALL_MODES
		);
		const zoneD = createZone(
			'd',
			[INITIATOR_A, PROGRAMMABLE_0],
			SECURE_ONLY
		);
		const zoneE = createZone(
			'e',
			[INITIATOR_A, PROGRAMMABLE_0],
			NON_SECURE_ONLY
		);

		const conflicts = getZoneAccessModeConflicts(zoneC, [
			zoneC,
			zoneD,
			zoneE
		]);

		expect(conflicts).to.have.length(1);
		expect(conflicts[0].conflictingZoneNames).to.deep.equal([
			'Zone d',
			'Zone e'
		]);
	});

	it('should report no conflict when the zone has no initiators', () => {
		const zoneC = createZone('c', [PROGRAMMABLE_0], NON_SECURE_ONLY);
		const zoneD = createZone(
			'd',
			[INITIATOR_A, PROGRAMMABLE_0],
			SECURE_ONLY
		);

		expect(
			getZoneAccessModeConflicts(zoneC, [zoneC, zoneD])
		).to.deep.equal([]);
	});

	it('should report no conflict when the zone has no responders', () => {
		const zoneC = createZone('c', [INITIATOR_A], NON_SECURE_ONLY);
		const zoneD = createZone(
			'd',
			[INITIATOR_A, PROGRAMMABLE_0],
			SECURE_ONLY
		);

		expect(
			getZoneAccessModeConflicts(zoneC, [zoneC, zoneD])
		).to.deep.equal([]);
	});

	it('should report a conflict for a non programmable responder', () => {
		const zoneC = createZone(
			'c',
			[INITIATOR_A, ADDRESSABLE_RESPONDER],
			NON_SECURE_ONLY
		);
		const zoneD = createZone(
			'd',
			[INITIATOR_A, ADDRESSABLE_RESPONDER],
			SECURE_ONLY
		);

		const conflicts = getZoneAccessModeConflicts(zoneC, [
			zoneC,
			zoneD
		]);

		expect(conflicts).to.have.length(1);
		expect(conflicts[0].responderName).to.equal('m55_itcm_0');
	});

	it('should return an empty list when there is no zone', () => {
		expect(getZoneAccessModeConflicts(undefined, [])).to.deep.equal(
			[]
		);
	});
});

describe('getConflictingZoneIds', () => {
	it('should return no ids when every zone is valid', () => {
		const zoneA = createZone('a', [PROGRAMMABLE_0]);
		const zoneB = createZone('b', [PROGRAMMABLE_1]);

		expect(
			getConflictingZoneIds(
				[zoneA, zoneB],
				configs({
					[PROGRAMMABLE_0]: REGION_A,
					[PROGRAMMABLE_1]: REGION_B
				})
			)
		).to.deep.equal([]);
	});

	it('should return the id of a zone with overlapping regions', () => {
		const zoneA = createZone('a', [PROGRAMMABLE_0, PROGRAMMABLE_1]);
		const zoneB = createZone('b', [PROGRAMMABLE_2]);

		expect(
			getConflictingZoneIds(
				[zoneA, zoneB],
				configs({
					[PROGRAMMABLE_0]: REGION_A,
					[PROGRAMMABLE_1]: REGION_A,
					[PROGRAMMABLE_2]: REGION_C
				})
			)
		).to.deep.equal(['a']);
	});

	it('should return both ids when two zones have an access mode conflict', () => {
		const zoneC = createZone(
			'c',
			[INITIATOR_A, PROGRAMMABLE_0],
			NON_SECURE_ONLY
		);
		const zoneD = createZone(
			'd',
			[INITIATOR_A, PROGRAMMABLE_0],
			SECURE_ONLY
		);

		expect(
			getConflictingZoneIds(
				[zoneC, zoneD],
				configs({[PROGRAMMABLE_0]: REGION_A})
			)
		).to.deep.equal(['c', 'd']);
	});
});

describe('getFirewallErrorCount', () => {
	it('should return 0 when there are no zones', () => {
		expect(getFirewallErrorCount([], {})).to.equal(0);
	});

	it('should return 0 when every zone is valid', () => {
		const zoneA = createZone('a', [PROGRAMMABLE_0, PROGRAMMABLE_1]);

		expect(
			getFirewallErrorCount(
				[zoneA],
				configs({
					[PROGRAMMABLE_0]: REGION_A,
					[PROGRAMMABLE_1]: REGION_B
				})
			)
		).to.equal(0);
	});

	it('should count each region of an overlap', () => {
		const zoneA = createZone('a', [PROGRAMMABLE_0, PROGRAMMABLE_1]);

		expect(
			getFirewallErrorCount(
				[zoneA],
				configs({
					[PROGRAMMABLE_0]: REGION_A,
					[PROGRAMMABLE_1]: REGION_A
				})
			)
		).to.equal(2);
	});

	it('should count an access mode conflict once on each zone', () => {
		const zoneC = createZone(
			'c',
			[INITIATOR_A, ADDRESSABLE_RESPONDER],
			NON_SECURE_ONLY
		);
		const zoneD = createZone(
			'd',
			[INITIATOR_A, ADDRESSABLE_RESPONDER],
			SECURE_ONLY
		);

		expect(getFirewallErrorCount([zoneC, zoneD], {})).to.equal(2);
	});

	it('should count a pair shared with several conflicting zones once', () => {
		const zones = [
			createZone(
				'c',
				[INITIATOR_A, INITIATOR_B, PROGRAMMABLE_0, PROGRAMMABLE_1],
				NON_SECURE_ONLY
			),
			createZone('d', [INITIATOR_A, PROGRAMMABLE_0], SECURE_ONLY),
			createZone(
				'e',
				[INITIATOR_A, INITIATOR_B, PROGRAMMABLE_1],
				ALL_MODES
			),
			createZone(
				'f',
				[INITIATOR_A, PROGRAMMABLE_0, PROGRAMMABLE_1],
				SECURE_ONLY
			)
		];
		const expected = zones.reduce(
			(total, zone) =>
				total + getZoneAccessModeConflicts(zone, zones).length,
			0
		);

		// Zone c: 3 pairs, d: 1, e: 2, f: 2.
		expect(expected).to.equal(8);
		expect(getFirewallErrorCount(zones, {})).to.equal(expected);
	});

	it('should add overlap and access mode conflicts together', () => {
		const zoneC = createZone(
			'c',
			[INITIATOR_A, PROGRAMMABLE_0, PROGRAMMABLE_1],
			NON_SECURE_ONLY
		);
		const zoneD = createZone(
			'd',
			[INITIATOR_A, PROGRAMMABLE_2],
			SECURE_ONLY
		);
		const zoneE = createZone(
			'e',
			[INITIATOR_A, PROGRAMMABLE_2],
			ALL_MODES
		);

		// Zone c: 2 overlapping regions. Zones d and e: one shared pair each.
		expect(
			getFirewallErrorCount(
				[zoneC, zoneD, zoneE],
				configs({
					[PROGRAMMABLE_0]: REGION_A,
					[PROGRAMMABLE_1]: REGION_A,
					[PROGRAMMABLE_2]: REGION_C
				})
			)
		).to.equal(4);
	});
});
