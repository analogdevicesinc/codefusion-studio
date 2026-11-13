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
import {createSelector} from '@reduxjs/toolkit';
import {type RootState, useAppSelector} from '../../store';
import type {
	FirewallStatusOption,
	FirewallZone,
	ResponderConfig,
	ResponderConfigTarget
} from '../../../types/firewall';
import {getEntryKey} from '../../../screens/firewall-config/firewall-data';
import {
	type AccessModeConflict,
	getConflictingZoneIds,
	getFirewallErrorCount,
	getZoneAccessModeConflicts,
	getZoneOverlapConflicts
} from '../../../screens/firewall-config/firewall-validation';
import {hasFirewallSupport} from '../../../utils/firewall';

export const selectFirewallStatus = (state: RootState) =>
	state.firewallReducer.firewallStatus;

export const selectFirewallZones = (state: RootState) =>
	state.firewallReducer.firewallZones;

export const selectActiveZoneId = (state: RootState) =>
	state.firewallReducer.activeZoneId;

export const selectResponderConfigs = (state: RootState) =>
	state.firewallReducer.responderConfigs;

export const selectActiveFirewallZone = createSelector(
	[selectFirewallZones, selectActiveZoneId],
	(zones, activeZoneId) =>
		zones.find(zone => zone.id === activeZoneId)
);

export const useFirewallStatus = (): FirewallStatusOption =>
	useAppSelector(selectFirewallStatus);

export const useFirewallBinaryFilePath = (): string =>
	useAppSelector(
		state => state.firewallReducer.firewallBinaryFilePath
	);

export const useFirewallZones = (): FirewallZone[] =>
	useAppSelector(selectFirewallZones);

export const useActiveZoneId = (): string | undefined =>
	useAppSelector(selectActiveZoneId);

export const useActiveFirewallZone = (): FirewallZone | undefined =>
	useAppSelector(selectActiveFirewallZone);

export const useFirewallZoneSearchQuery = (): string =>
	useAppSelector(
		state => state.firewallReducer.firewallZoneSearchQuery
	);

export const useManageFirewallsView = (): boolean =>
	useAppSelector(state => state.firewallReducer.manageFirewallsView);

export const useManageFirewallsColumn = ():
	| 'initiators'
	| 'responders' =>
	useAppSelector(
		state => state.firewallReducer.manageFirewallsColumn
	);

export const useActiveResponderConfig = ():
	| ResponderConfigTarget
	| undefined =>
	useAppSelector(
		state => state.firewallReducer.activeResponderConfig
	);

export const useResponderConfig = (
	parent: string | undefined,
	child: string | undefined
): ResponderConfig | undefined =>
	useAppSelector(state => {
		if (!parent || !child) return undefined;

		return state.firewallReducer.responderConfigs[
			getEntryKey('responders', parent, child)
		];
	});

export const useResponderConfigs = (): Record<
	string,
	ResponderConfig
> => useAppSelector(selectResponderConfigs);

/**
 * Detects the programmable-region responders in the active zone whose address
 * ranges overlap. Overlaps are only reported within a zone, so the same
 * responder can be reused elsewhere without conflicting.
 */
export const selectActiveZoneOverlapConflicts = createSelector(
	[selectActiveFirewallZone, selectResponderConfigs],
	(zone, responderConfigs) =>
		getZoneOverlapConflicts(zone, responderConfigs)
);

/**
 * Detects initiators in the active zone that reach the same responder from
 * another zone whose access modes differ.
 */
export const selectActiveZoneAccessModeConflicts = createSelector(
	[selectActiveFirewallZone, selectFirewallZones],
	(zone, zones) => getZoneAccessModeConflicts(zone, zones)
);

export const selectConflictingZoneIds = createSelector(
	[selectFirewallZones, selectResponderConfigs],
	(zones, responderConfigs) =>
		getConflictingZoneIds(zones, responderConfigs)
);

export const selectFirewallConflictCount = createSelector(
	[selectConflictingZoneIds],
	conflictingZoneIds => conflictingZoneIds.length
);

/**
 * The override statuses bypass the zone configuration entirely, so only an
 * enabled firewall can block code generation.
 */
export const selectFirewallCodeGenErrorCount = createSelector(
	[selectFirewallStatus, selectFirewallZones, selectResponderConfigs],
	(firewallStatus, zones, responderConfigs) =>
		firewallStatus === 'enabled'
			? getFirewallErrorCount(zones, responderConfigs)
			: 0
);

/**
 * @returns The conflicting entry keys mapped to the name of the region they
 *   overlap with, empty when the active zone has no conflicts.
 */
export const useActiveZoneOverlapConflicts = (): Record<
	string,
	string
> => useAppSelector(selectActiveZoneOverlapConflicts);

/**
 * @param parent - The responder's parent group name.
 * @param child - The responder child entry name.
 * @returns The name of the region this responder overlaps with in the active
 *   zone, or `undefined` when it does not overlap.
 */
export const useResponderOverlapConflict = (
	parent: string | undefined,
	child: string | undefined
): string | undefined => {
	const conflicts = useActiveZoneOverlapConflicts();

	if (!parent || !child) return undefined;

	return conflicts[getEntryKey('responders', parent, child)];
};

/**
 * @returns One entry per conflicting initiator/responder pair, so a single
 *   initiator can appear multiple times when it conflicts on several
 *   responders. Empty when there are none.
 */
export const useActiveZoneAccessModeConflicts =
	(): AccessModeConflict[] =>
		useAppSelector(selectActiveZoneAccessModeConflicts);

/**
 * @returns The ids of the zones containing at least one conflict.
 */
export const useConflictingZoneIds = (): string[] =>
	useAppSelector(selectConflictingZoneIds);

/**
 * @returns The number of zones containing at least one conflict.
 */
export const useFirewallConflictCount = (): number =>
	useAppSelector(selectFirewallConflictCount);

/**
 * Mirrors `useTotalApplicationPackagesErrorCount` for MCUboot.
 *
 * @returns The number of firewall conflicts blocking code generation, or 0
 *   when the firewall is overridden or the SoC has no firewall to fix them in.
 */
export const useFirewallCodeGenErrorCount = (): number => {
	const errorCount = useAppSelector(selectFirewallCodeGenErrorCount);

	// Kept outside the memoized selector since it is not part of the store.
	return hasFirewallSupport() ? errorCount : 0;
};
