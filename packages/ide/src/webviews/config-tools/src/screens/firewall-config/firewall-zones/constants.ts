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
import {type BadgeAppearance} from 'cfs-react-library';
import {
	type FirewallZone,
	type FirewallZoneAccessMode,
	type FirewallZoneAccessModeId
} from '../../../types/firewall';

export const DEFAULT_FIREWALL_ZONE_ACCESS_MODE: FirewallZoneAccessMode =
	'open';

export const DEFAULT_FIREWALL_ZONE_ACCESS_MODES: Record<
	FirewallZoneAccessModeId,
	boolean
> = {
	nonSecureNonPrivileged: true,
	nonSecurePrivileged: true,
	secureNonPrivileged: true,
	securePrivileged: true
};

export const MAX_FIREWALL_ZONE_NAME_LENGTH = 50;

/**
 * Strips characters that are not alphanumeric, spaces, hyphens, or underscores.
 * @param value The raw firewall zone name input.
 * @returns The sanitized name.
 */
export function sanitizeFirewallZoneName(value: string): string {
	return value.replace(/[^a-zA-Z0-9 _-]/g, '');
}

export const FIREWALL_ZONE_ACCESS_MODE_LABELS: Record<
	FirewallZoneAccessMode,
	string
> = {
	open: 'Open',
	restricted: 'Restricted',
	blocked: 'Blocked'
};

export const FIREWALL_ZONE_ACCESS_MODE_BADGE_APPEARANCE: Record<
	FirewallZoneAccessMode,
	BadgeAppearance
> = {
	open: 'secondary',
	restricted: 'primary',
	blocked: 'active'
};

export const FIREWALL_ZONE_ACCESS_MODE_IDS: readonly FirewallZoneAccessModeId[] =
	[
		'nonSecureNonPrivileged',
		'nonSecurePrivileged',
		'secureNonPrivileged',
		'securePrivileged'
	];

/**
 * Derives the summary access mode from a per-zone access mode selection.
 * @param accessModes The map of individual access mode selections.
 * @returns 'open' when all are selected, 'blocked' when none are selected,
 * otherwise 'restricted'.
 */
export function getFirewallZoneAccessMode(
	accessModes: Record<FirewallZoneAccessModeId, boolean>
): FirewallZoneAccessMode {
	const selectedCount = FIREWALL_ZONE_ACCESS_MODE_IDS.filter(
		id => accessModes[id]
	).length;

	if (selectedCount === FIREWALL_ZONE_ACCESS_MODE_IDS.length) {
		return 'open';
	}

	if (selectedCount === 0) {
		return 'blocked';
	}

	return 'restricted';
}

/**
 * Counts the selected initiator entries for a firewall zone.
 * @param zone The firewall zone to inspect.
 * @returns The number of selected initiator entries.
 */
export function getFirewallZoneInitiatorsCount(
	zone: FirewallZone
): number {
	return (zone.selectedFirewalls ?? []).filter(key =>
		key.startsWith('initiators::')
	).length;
}

/**
 * Counts the selected responder entries for a firewall zone.
 * @param zone The firewall zone to inspect.
 * @returns The number of selected responder entries.
 */
export function getFirewallZoneRespondersCount(
	zone: FirewallZone
): number {
	return (zone.selectedFirewalls ?? []).filter(key =>
		key.startsWith('responders::')
	).length;
}

/**
 * Builds the initiators/responders summary text for a firewall zone.
 * @param zone The firewall zone to describe.
 * @returns A human-readable summary, e.g. "0 Initiators · 0 Responders".
 */
export function getFirewallZoneDescription(
	zone: FirewallZone
): string {
	const initiatorsCount = getFirewallZoneInitiatorsCount(zone);
	const respondersCount = getFirewallZoneRespondersCount(zone);

	return `${initiatorsCount} Initiators · ${respondersCount} Responders`;
}
