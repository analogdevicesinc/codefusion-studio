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
	ResponderConfig
} from '../../types/firewall';
import {areRangesOverlapping} from '../../utils/memory';
import {
	findResponderChild,
	getResponderRegionInfo,
	isMemoryRegionResponder
} from './firewall-data';
import {FIREWALL_ZONE_ACCESS_MODE_IDS} from './firewall-zones/constants';

/**
 * The resolved address range of a programmable-region responder selected in a
 * zone.
 */
export type ResponderRegionRange = {
	entryKey: string;
	parent: string;
	child: string;
	/** The data-model name, which ignores any user rename override. */
	dataModelName: string;
	start: number;
	end: number;
};

/**
 * Resolves the address ranges of the programmable-region responders selected in
 * a zone. Responders whose start address does not resolve to a known region are
 * skipped, as there is nothing to compare them against.
 *
 * @param zone - The zone whose selected responders should be resolved.
 * @param responderConfigs - The persisted responder config overrides.
 * @returns The resolved ranges, in zone selection order.
 */
export function getZoneRegionRanges(
	zone: FirewallZone | undefined,
	responderConfigs: Record<string, ResponderConfig>
): ResponderRegionRange[] {
	const ranges: ResponderRegionRange[] = [];
	const seen = new Set<string>();

	(zone?.selectedFirewalls ?? []).forEach(entryKey => {
		const [column, parent, child] = entryKey.split('::');

		if (column !== 'responders' || !parent || !child) return;

		// A zone can only conflict with a region once, even if the key repeats.
		if (seen.has(entryKey)) return;

		seen.add(entryKey);

		if (!isMemoryRegionResponder(parent, child)) return;

		const data = findResponderChild(parent, child);
		const startAddress =
			responderConfigs[entryKey]?.startAddress ?? data?.startAddress;

		if (!startAddress) return;

		const regionInfo = getResponderRegionInfo(startAddress);

		if (!regionInfo) return;

		const start = Number.parseInt(startAddress, 16);
		const end = Number.parseInt(regionInfo.endAddress, 16);

		if (Number.isNaN(start) || Number.isNaN(end)) return;

		ranges.push({
			entryKey,
			parent,
			child,
			dataModelName: data?.name ?? child,
			start,
			end
		});
	});

	return ranges;
}

/**
 * Detects programmable-region responders within a zone whose address ranges
 * overlap. Both sides of an overlap are reported so either responder shows the
 * error when its configuration is opened.
 *
 * @param zone - The zone to validate.
 * @param responderConfigs - The persisted responder config overrides.
 * @returns The conflicting responder entry keys, each mapped to the data-model
 *   name of the first region it overlaps with.
 */
export function getZoneOverlapConflicts(
	zone: FirewallZone | undefined,
	responderConfigs: Record<string, ResponderConfig>
): Record<string, string> {
	const ranges = getZoneRegionRanges(zone, responderConfigs);
	const conflicts: Record<string, string> = {};

	ranges.forEach((region, index) => {
		ranges.slice(index + 1).forEach(other => {
			if (
				!areRangesOverlapping(
					region.start,
					region.end,
					other.start,
					other.end
				)
			) {
				return;
			}

			conflicts[region.entryKey] ??= other.dataModelName;
			conflicts[other.entryKey] ??= region.dataModelName;
		});
	});

	return conflicts;
}

/**
 * An initiator/responder pair selected in two zones whose access modes
 * disagree, along with the other zones it conflicts with.
 */
export type AccessModeConflict = {
	initiatorKey: string;
	responderKey: string;
	initiatorName: string;
	responderName: string;
	conflictingZoneNames: string[];
};

function getAccessModeSignature(zone: FirewallZone): string {
	return FIREWALL_ZONE_ACCESS_MODE_IDS.map(id =>
		zone.accessModes[id] ? '1' : '0'
	).join('');
}

function haveSameAccessModes(
	first: FirewallZone,
	second: FirewallZone
): boolean {
	return (
		getAccessModeSignature(first) === getAccessModeSignature(second)
	);
}

function getEntryKeysForColumn(
	zone: FirewallZone,
	column: 'initiators' | 'responders'
): string[] {
	return (zone.selectedFirewalls ?? []).filter(key =>
		key.startsWith(`${column}::`)
	);
}

/**
 * Detects initiator/responder pairs this zone shares with another zone whose
 * access modes differ. The same pair reachable under two different access modes
 * is ambiguous, so it is reported on both zones.
 *
 * @param zone - The zone to validate.
 * @param zones - Every configured zone, including the one being validated.
 * @returns One entry per conflicting initiator/responder pair.
 */
export function getZoneAccessModeConflicts(
	zone: FirewallZone | undefined,
	zones: FirewallZone[]
): AccessModeConflict[] {
	if (!zone) return [];

	const initiatorKeys = getEntryKeysForColumn(zone, 'initiators');
	const responderKeys = getEntryKeysForColumn(zone, 'responders');

	if (initiatorKeys.length === 0 || responderKeys.length === 0) {
		return [];
	}

	const conflicts = new Map<string, AccessModeConflict>();

	zones.forEach(other => {
		if (other.id === zone.id || haveSameAccessModes(zone, other)) {
			return;
		}

		const otherSelected = new Set(other.selectedFirewalls ?? []);

		initiatorKeys.forEach(initiatorKey => {
			if (!otherSelected.has(initiatorKey)) return;

			responderKeys.forEach(responderKey => {
				if (!otherSelected.has(responderKey)) return;

				const pairKey = `${initiatorKey}|${responderKey}`;
				const existing = conflicts.get(pairKey);

				if (existing) {
					if (!existing.conflictingZoneNames.includes(other.name)) {
						existing.conflictingZoneNames.push(other.name);
					}

					return;
				}

				const initiatorName = initiatorKey.split('::')[2];
				const [, responderParent, responderChild] =
					responderKey.split('::');

				conflicts.set(pairKey, {
					initiatorKey,
					responderKey,
					initiatorName: initiatorName ?? initiatorKey,
					responderName:
						responderParent && responderChild
							? (findResponderChild(responderParent, responderChild)
									?.name ?? responderChild)
							: responderKey,
					conflictingZoneNames: [other.name]
				});
			});
		});
	});

	return Array.from(conflicts.values());
}

/**
 * Maps every selected entry key to the indexes of the zones that selected it.
 */
function indexZonesByEntryKey(
	zones: FirewallZone[]
): Map<string, number[]> {
	const index = new Map<string, number[]>();

	zones.forEach((zone, zoneIndex) => {
		new Set(zone.selectedFirewalls ?? []).forEach(entryKey => {
			const zoneIndexes = index.get(entryKey);

			if (zoneIndexes) {
				zoneIndexes.push(zoneIndex);
			} else {
				index.set(entryKey, [zoneIndex]);
			}
		});
	});

	return index;
}

/**
 * Counts, per zone, the initiator/responder pairs it shares with another zone
 * whose access modes differ, which is the number of entries
 * {@link getZoneAccessModeConflicts} reports for that zone.
 *
 * Indexing the selections once keeps this proportional to the number of shared
 * selections. Initiators that reach the same set of conflicting peers cover the
 * same responders, so pairs are counted per group rather than enumerated.
 *
 * @param zones - The configured firewall zones.
 * @returns The access-mode conflict count of each zone, by zone index.
 */
function getAccessModeConflictCounts(
	zones: FirewallZone[]
): number[] {
	const index = indexZonesByEntryKey(zones);
	const signatures = zones.map(zone => getAccessModeSignature(zone));

	return zones.map((zone, zoneIndex) => {
		const selected = new Set(zone.selectedFirewalls ?? []);
		const isConflictingPeer = (peerIndex: number) =>
			peerIndex !== zoneIndex &&
			signatures[peerIndex] !== signatures[zoneIndex];
		const respondersByPeer = new Map<number, string[]>();

		selected.forEach(entryKey => {
			if (!entryKey.startsWith('responders::')) return;

			(index.get(entryKey) ?? []).forEach(peerIndex => {
				if (!isConflictingPeer(peerIndex)) return;

				const responders = respondersByPeer.get(peerIndex);

				if (responders) {
					responders.push(entryKey);
				} else {
					respondersByPeer.set(peerIndex, [entryKey]);
				}
			});
		});

		if (respondersByPeer.size === 0) return 0;

		const initiatorCountByPeerSet = new Map<string, number>();

		selected.forEach(entryKey => {
			if (!entryKey.startsWith('initiators::')) return;

			const peers = (index.get(entryKey) ?? []).filter(peerIndex =>
				respondersByPeer.has(peerIndex)
			);

			if (peers.length === 0) return;

			const peerSetKey = peers.join(',');

			initiatorCountByPeerSet.set(
				peerSetKey,
				(initiatorCountByPeerSet.get(peerSetKey) ?? 0) + 1
			);
		});

		let count = 0;

		initiatorCountByPeerSet.forEach((initiatorCount, peerSetKey) => {
			const responders = new Set(
				peerSetKey
					.split(',')
					.flatMap(peer => respondersByPeer.get(Number(peer)) ?? [])
			);

			count += initiatorCount * responders.size;
		});

		return count;
	});
}

/**
 * Finds the zones containing at least one address overlap or access-mode
 * conflict.
 *
 * @param zones - The configured firewall zones.
 * @param responderConfigs - The persisted responder config overrides.
 * @returns The ids of the zones with at least one conflict.
 */
export function getConflictingZoneIds(
	zones: FirewallZone[],
	responderConfigs: Record<string, ResponderConfig>
): string[] {
	const accessModeCounts = getAccessModeConflictCounts(zones);

	return zones
		.filter(
			(zone, zoneIndex) =>
				accessModeCounts[zoneIndex] > 0 ||
				Object.keys(getZoneOverlapConflicts(zone, responderConfigs))
					.length > 0
		)
		.map(zone => zone.id);
}

/**
 * Counts every conflict across all zones, which is the number of issues a user
 * has to resolve rather than the number of affected zones. Both sides of a
 * conflict are counted, matching the indicators shown on each zone.
 *
 * @param zones - The configured firewall zones.
 * @param responderConfigs - The persisted responder config overrides.
 * @returns The total number of conflicts.
 */
export function getFirewallErrorCount(
	zones: FirewallZone[],
	responderConfigs: Record<string, ResponderConfig>
): number {
	const accessModeCounts = getAccessModeConflictCounts(zones);

	return zones.reduce(
		(total, zone, zoneIndex) =>
			total +
			Object.keys(getZoneOverlapConflicts(zone, responderConfigs))
				.length +
			accessModeCounts[zoneIndex],
		0
	);
}
