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
	ConfiguredFirewallResponder,
	ConfiguredFirewallResponderOverride,
	ConfiguredFirewallZone,
	FirewallConfig
} from 'cfs-types';
import type {
	FirewallState,
	FirewallStatusOption,
	FirewallZone,
	FirewallZoneAccessModeId,
	ResponderConfig
} from '../types/firewall';
import {getFirewallZoneAccessMode} from '../screens/firewall-config/firewall-zones/constants';
import {
	type FirewallColumn,
	findResponderChild,
	findResponderGroupName,
	getEntryKey,
	getFirewallInitiators,
	INITIATOR_GROUP_NAME
} from '../screens/firewall-config/firewall-data';
import {formatSocAddress} from './firewall';

const VALID_FIREWALL_STATUS_VALUES = new Set<string>([
	'enabled',
	'overrideAllBlocked',
	'overrideAllOpen'
]);

/**
 * Normalizes a file path by replacing backslashes with forward slashes.
 */
function normalizePath(filePath: string): string {
	return filePath.replace(/\\/g, '/');
}

type ParsedEntryKey = {
	column: FirewallColumn;
	parent: string;
	child: string;
};

/**
 * Splits an entry key (`column::parent::child`, see `getEntryKey`) back into
 * its parts.
 * @param key The entry key to parse.
 * @returns The parsed parts, or `undefined` when the key is malformed.
 */
function parseEntryKey(key: string): ParsedEntryKey | undefined {
	const [column, parent, ...rest] = key.split('::');

	if (
		(column !== 'initiators' && column !== 'responders') ||
		parent === undefined ||
		rest.length === 0
	) {
		return undefined;
	}

	return {column, parent, child: rest.join('::')};
}

/**
 * Persists a zone responder with the group that defines it, since a responder
 * name is only unique within its group.
 */
function formatResponderForPersistence(
	group: string,
	name: string,
	startAddress?: string
): ConfiguredFirewallResponder {
	return {
		Name: name,
		Group: group,
		...(startAddress ? {BaseAddress: startAddress} : {})
	};
}

/**
 * Resolves the group a persisted responder belongs to, preferring the group
 * stored alongside the name. Falls back to a name lookup for a responder
 * written without a group, or whose group the data model no longer defines.
 * @returns The group name, or `undefined` when no group defines the responder.
 */
function resolvePersistedResponderGroup(
	name: string,
	group?: string
): string | undefined {
	if (group && findResponderChild(group, name)) return group;

	return findResponderGroupName(name);
}

/**
 * Formats a zone for persistence, stripping the frontend-only `id` and the
 * access mode derived from `AccessModes`.
 */
function formatZoneForPersistence(
	zone: FirewallZone,
	responderConfigs: Record<string, ResponderConfig>
): ConfiguredFirewallZone {
	const entries = (zone.selectedFirewalls ?? []).flatMap(key => {
		const parsed = parseEntryKey(key);

		return parsed ? [{key, ...parsed}] : [];
	});

	return {
		Name: zone.name,
		...(zone.description ? {Description: zone.description} : {}),
		Initiators: entries
			.filter(entry => entry.column === 'initiators')
			.map(entry => entry.child),
		Responders: entries
			.filter(entry => entry.column === 'responders')
			.map(entry =>
				formatResponderForPersistence(
					entry.parent,
					entry.child,
					responderConfigs[entry.key]?.startAddress
				)
			),
		AccessModes: {
			NonSecureNonPrivileged: zone.accessModes.nonSecureNonPrivileged,
			NonSecurePrivileged: zone.accessModes.nonSecurePrivileged,
			SecureNonPrivileged: zone.accessModes.secureNonPrivileged,
			SecurePrivileged: zone.accessModes.securePrivileged
		}
	};
}

function formatResponderOverridesForPersistence(
	responderConfigs: Record<string, ResponderConfig>
): ConfiguredFirewallResponderOverride[] {
	return Object.entries(responderConfigs).flatMap(([key, config]) => {
		const parsed = parseEntryKey(key);

		if (!parsed || parsed.column !== 'responders') return [];

		const {name, description, startAddress} = config;

		// An empty description is a deliberate edit - the sidebar lets a user
		// clear it - so it has to outlive a save, or the data-model
		// description reappears on reload.
		const hasDescription = description !== undefined;

		if (!name && !hasDescription && !startAddress) return [];

		return [
			{
				Name: parsed.child,
				Group: parsed.parent,
				...(name ? {DisplayName: name} : {}),
				...(hasDescription ? {Description: description} : {}),
				...(startAddress ? {AddressStart: startAddress} : {})
			}
		];
	});
}

/**
 * Formats the Firewall slice into the persistence-ready FirewallConfig shape,
 * dropping the transient UI state that is not written to disk.
 */
export function formatFirewallPersistencePayload(
	state: FirewallState
): FirewallConfig {
	return {
		FirewallStatus: state.firewallStatus,
		...(state.firewallBinaryFilePath
			? {BinaryFilePath: normalizePath(state.firewallBinaryFilePath)}
			: {}),
		FirewallZones: state.firewallZones.map(zone =>
			formatZoneForPersistence(zone, state.responderConfigs)
		),
		ResponderOverrides: formatResponderOverridesForPersistence(
			state.responderConfigs
		)
	};
}

/**
 * Rebuilds the entry keys for a zone. Initiators are persisted by name alone
 * and responders by name and group, and both are resolved against the SoC data
 * model; an entry the data model does not define cannot be displayed and is
 * dropped.
 */
function applyPersistedEntryKeys(
	zone: ConfiguredFirewallZone
): string[] {
	const knownInitiators = new Set(
		getFirewallInitiators().flatMap(node =>
			node.children.map(child => child.name)
		)
	);

	const initiators = (zone.Initiators ?? [])
		.filter(name => knownInitiators.has(name))
		.map(name =>
			getEntryKey('initiators', INITIATOR_GROUP_NAME, name)
		);

	const responders = (zone.Responders ?? []).flatMap(responder => {
		const name =
			typeof responder === 'string' ? responder : responder.Name;
		const group = resolvePersistedResponderGroup(
			name,
			typeof responder === 'string' ? undefined : responder.Group
		);

		return group ? [getEntryKey('responders', group, name)] : [];
	});

	return [...initiators, ...responders];
}

/**
 * Collects the addresses stored inline on persisted zone responders, so a
 * config that carries a programmable-region address without a matching
 * `ResponderOverrides` entry does not lose it on the next save.
 * @param zones The persisted zones to read.
 * @returns Responder configs keyed by entry key, holding only addresses.
 */
function applyPersistedInlineAddresses(
	zones: ConfiguredFirewallZone[]
): Record<string, ResponderConfig> {
	const configs: Record<string, ResponderConfig> = {};

	for (const zone of zones) {
		for (const responder of zone.Responders ?? []) {
			if (typeof responder === 'string') continue;

			const startAddress = formatSocAddress(responder.BaseAddress);

			if (!startAddress) continue;

			const group = resolvePersistedResponderGroup(
				responder.Name,
				responder.Group
			);

			if (!group) continue;

			// A responder shared by several zones resolves to the address of
			// the last zone that declares one, in document order.
			configs[getEntryKey('responders', group, responder.Name)] = {
				startAddress
			};
		}
	}

	return configs;
}

/**
 * Merges inline responder addresses with the explicit `ResponderOverrides`,
 * where an override always wins for the fields it declares.
 */
function mergeResponderConfigs(
	inlineAddresses: Record<string, ResponderConfig>,
	overrides: Record<string, ResponderConfig>
): Record<string, ResponderConfig> {
	const merged: Record<string, ResponderConfig> = {
		...inlineAddresses
	};

	for (const [key, override] of Object.entries(overrides)) {
		merged[key] = {...merged[key], ...override};
	}

	return merged;
}

/**
 * Drops configs whose responder no zone selects, keeping the invariant that an
 * override lives only as long as a zone references it. Without this a stale
 * entry would be written back on every save and resurface if the responder
 * were selected again later.
 */
function pickReferencedResponderConfigs(
	configs: Record<string, ResponderConfig>,
	referencedKeys: Set<string>
): Record<string, ResponderConfig> {
	return Object.fromEntries(
		Object.entries(configs).filter(([key]) => referencedKeys.has(key))
	);
}

function applyPersistedZone(
	zone: ConfiguredFirewallZone
): FirewallZone {
	const accessModes: Record<FirewallZoneAccessModeId, boolean> = {
		nonSecureNonPrivileged:
			zone.AccessModes?.NonSecureNonPrivileged ?? false,
		nonSecurePrivileged:
			zone.AccessModes?.NonSecurePrivileged ?? false,
		secureNonPrivileged:
			zone.AccessModes?.SecureNonPrivileged ?? false,
		securePrivileged: zone.AccessModes?.SecurePrivileged ?? false
	};

	return {
		id: crypto.randomUUID(),
		name: zone.Name,
		description: zone.Description ?? '',
		accessMode: getFirewallZoneAccessMode(accessModes),
		accessModes,
		selectedFirewalls: applyPersistedEntryKeys(zone)
	};
}

function applyPersistedResponderOverrides(
	overrides?: ConfiguredFirewallResponderOverride[]
): Record<string, ResponderConfig> {
	return (overrides ?? []).reduce<Record<string, ResponderConfig>>(
		(acc, override) => {
			const group = resolvePersistedResponderGroup(
				override.Name,
				override.Group
			);

			if (!group) return acc;

			const startAddress = formatSocAddress(override.AddressStart);

			acc[getEntryKey('responders', group, override.Name)] = {
				...(override.DisplayName ? {name: override.DisplayName} : {}),
				...(override.Description !== undefined
					? {description: override.Description}
					: {}),
				...(startAddress ? {startAddress} : {})
			};

			return acc;
		},
		{}
	);
}

/**
 * Converts persisted FirewallConfig back into the Redux-compatible Firewall
 * slice state, regenerating the frontend-only zone ids.
 */
export function applyPersistedFirewall(
	firewall?: FirewallConfig
): Partial<FirewallState> {
	if (!firewall) return {};

	const persistedZones = firewall.FirewallZones ?? [];
	const firewallZones = persistedZones.map(applyPersistedZone);
	const rawStatus: string = firewall.FirewallStatus;
	const referencedKeys = new Set(
		firewallZones.flatMap(zone => zone.selectedFirewalls ?? [])
	);

	return {
		firewallStatus: VALID_FIREWALL_STATUS_VALUES.has(rawStatus)
			? (rawStatus as FirewallStatusOption)
			: 'enabled',
		firewallBinaryFilePath: firewall.BinaryFilePath ?? '',
		firewallZones,
		activeZoneId: firewallZones[0]?.id,
		responderConfigs: pickReferencedResponderConfigs(
			mergeResponderConfigs(
				applyPersistedInlineAddresses(persistedZones),
				applyPersistedResponderOverrides(firewall.ResponderOverrides)
			),
			referencedKeys
		)
	};
}
