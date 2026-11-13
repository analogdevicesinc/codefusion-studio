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
	ResponderConfig,
	ResponderConfigTarget
} from '../../types/firewall';
import type {
	SocFirewallInitiator,
	SocFirewallResponderGroup
} from 'cfs-types';
import {
	formatSocAddress,
	getSocFirewallInitiators,
	getSocFirewallResponderGroups
} from '../../utils/firewall';

export type FirewallChild = {
	name: string;
	description?: string;
	baseAddress?: string;
	startAddress?: string;
	endAddress?: string;
	id?: number;
	type?: string;
};

export type FirewallNode = {
	name: string;
	description?: string;
	children: FirewallChild[];
};

export type FirewallColumn = 'initiators' | 'responders';

/**
 * The supported access modes shown as badges for an initiator, paired with
 * the zone access mode they map to so a badge can reflect its checked state.
 */
export const SUPPORTED_MODES: ReadonlyArray<{
	id: FirewallZoneAccessModeId;
	label: string;
}> = [
	{id: 'nonSecureNonPrivileged', label: 'NS, NP'},
	{id: 'nonSecurePrivileged', label: 'NS, P'},
	{id: 'secureNonPrivileged', label: 'S, NP'},
	{id: 'securePrivileged', label: 'S, P'}
];

export const SUPPORTED_MODE_LABELS = SUPPORTED_MODES.map(
	mode => mode.label
);

/**
 * Builds a stable, unique key for a selectable child entry.
 *
 * @param column - The active column the entry belongs to.
 * @param parent - The parent group name.
 * @param child - The child entry name.
 * @returns A unique key identifying the entry.
 */
export const getEntryKey = (
	column: FirewallColumn,
	parent: string,
	child: string
): string => `${column}::${parent}::${child}`;

/**
 * The responder `type` value that identifies a programmable memory region.
 * Memory-region responders open their configuration sidebar in read/write
 * mode; all others are read-only.
 */
const MEMORY_REGION_RESPONDER_TYPE = 'ProgrammableRegion';

/**
 * The parent name every initiator entry key is built with. The data model
 * defines initiators as a flat list, so they share a single group. This is an
 * identity used in persisted entry keys, not a display label.
 */
export const INITIATOR_GROUP_NAME = 'Initiators';

function toInitiatorChild(
	initiator: SocFirewallInitiator
): FirewallChild {
	return {
		name: initiator.Name,
		description: initiator.Description,
		baseAddress: formatSocAddress(initiator.BaseAddress)
	};
}

function toResponderNode(
	group: SocFirewallResponderGroup
): FirewallNode {
	return {
		name: group.Name,
		description: group.Description,
		children: group.Responders.map(responder => ({
			name: responder.Name,
			description: responder.Description,
			id: responder.Id,
			type: responder.Type,
			startAddress: formatSocAddress(responder.AddressStart),
			endAddress: formatSocAddress(responder.AddressEnd)
		}))
	};
}

// The mapped nodes are cached against the data model arrays they were built
// from so repeated renders reuse the same object identities.
let initiatorCache:
	| {source: SocFirewallInitiator[]; nodes: FirewallNode[]}
	| undefined;
let responderCache:
	| {source: SocFirewallResponderGroup[]; nodes: FirewallNode[]}
	| undefined;

/**
 * Builds the initiator column from the SoC data model. The data model has no
 * initiator grouping, so they are returned as a single group.
 *
 * @returns The initiator nodes, or an empty array when the SoC defines none.
 */
export const getFirewallInitiators = (): FirewallNode[] => {
	const source = getSocFirewallInitiators();

	if (initiatorCache?.source !== source) {
		initiatorCache = {
			source,
			nodes:
				source.length > 0
					? [
							{
								name: INITIATOR_GROUP_NAME,
								children: source.map(toInitiatorChild)
							}
						]
					: []
		};
	}

	return initiatorCache.nodes;
};

/**
 * Builds the responder column from the SoC data model responder groups.
 *
 * @returns The responder nodes, or an empty array when the SoC defines none.
 */
export const getFirewallResponders = (): FirewallNode[] => {
	const source = getSocFirewallResponderGroups();

	if (responderCache?.source !== source) {
		responderCache = {source, nodes: source.map(toResponderNode)};
	}

	return responderCache.nodes;
};

/**
 * Looks up a responder child entry by its parent group and child name.
 *
 * @param parent - The responder's parent group name.
 * @param child - The responder child entry name.
 * @returns The matching responder child, or `undefined` when not found.
 */
export const findResponderChild = (
	parent: string,
	child: string
): FirewallChild | undefined =>
	getFirewallResponders()
		.find(node => node.name === parent)
		?.children.find(entry => entry.name === child);

/**
 * Resolves the group a responder belongs to, by first match. A responder name
 * is only unique within its group, so this is a fallback for a reference that
 * carries no group of its own.
 *
 * @param child - The responder child entry name.
 * @returns The parent group name, or `undefined` when no group defines it.
 */
export const findResponderGroupName = (
	child: string
): string | undefined =>
	getFirewallResponders().find(node =>
		node.children.some(entry => entry.name === child)
	)?.name;

/**
 * Determines whether a responder is a programmable memory region, which enables
 * editing in the responder configuration sidebar.
 *
 * @param parent - The responder's parent group name.
 * @param child - The responder child entry name.
 * @returns `true` when the responder is a programmable memory region.
 */
export const isMemoryRegionResponder = (
	parent: string,
	child: string
): boolean =>
	findResponderChild(parent, child)?.type ===
	MEMORY_REGION_RESPONDER_TYPE;

/**
 * Builds the responder configuration panel subtitle in upper-case
 * `TYPE · PARENT` form, falling back to just the parent name when the
 * responder has no `type`.
 *
 * @param parent - The responder's parent group name.
 * @param child - The responder child entry name.
 * @returns The upper-cased subtitle.
 */
export const getResponderSubtitle = (
	parent: string,
	child: string
): string => {
	const type = findResponderChild(parent, child)?.type;

	return (type ? `${type} · ${parent}` : parent).toUpperCase();
};

/**
 * Resolves a responder's editable field values, preferring persisted config
 * overrides and falling back to the responder data-model values.
 *
 * @param target - The active responder configuration target.
 * @param config - The persisted responder config override, if any.
 * @returns The resolved name, description and start address.
 */
export const resolveResponderFields = (
	target: ResponderConfigTarget | undefined,
	config: ResponderConfig | undefined
): {name: string; description: string; startAddress: string} => {
	if (!target) {
		return {
			name: config?.name ?? '',
			description: config?.description ?? '',
			startAddress: config?.startAddress ?? ''
		};
	}

	const {parent, child} = target;
	const data = findResponderChild(parent, child);

	return {
		name: config?.name ?? data?.name ?? child,
		description: config?.description ?? data?.description ?? '',
		startAddress: config?.startAddress ?? data?.startAddress ?? ''
	};
};

/**
 * Collects the unique start-address values defined by the responders in the
 * data model. Programmable-region responders have no address range of their
 * own, so these are the addresses one can be pointed at.
 *
 * @returns The unique start-address values in data-model order.
 */
export const getResponderStartAddressOptions = (): string[] => {
	const addresses = new Set<string>();

	getFirewallResponders().forEach(node => {
		node.children.forEach(child => {
			if (child.startAddress) {
				addresses.add(child.startAddress);
			}
		});
	});

	return Array.from(addresses);
};

/**
 * The start address a programmable-region responder points at until the user
 * picks another one, matching the first option the configuration dropdown
 * offers.
 *
 * @returns The default start address, or `undefined` when the data model
 *   defines no addressable responders.
 */
export const getDefaultResponderStartAddress = ():
	| string
	| undefined => getResponderStartAddressOptions()[0];

/**
 * Collects the entry keys of every programmable-region responder in the
 * catalog, which are the responders whose start address is configurable.
 *
 * @returns The entry keys (`responders::parent::child`).
 */
export const getMemoryRegionResponderKeys = (): string[] =>
	getFirewallResponders().flatMap(node =>
		node.children
			.filter(child => child.type === MEMORY_REGION_RESPONDER_TYPE)
			.map(child => getEntryKey('responders', node.name, child.name))
	);

/**
 * Formats a byte count into a compact human-readable size label using binary
 * units (KB/MB), falling back to bytes for small values.
 *
 * @param bytes - The size in bytes.
 * @returns The formatted size label.
 */
const formatByteSize = (bytes: number): string => {
	if (bytes >= 1024 * 1024) {
		return `${bytes / (1024 * 1024)}MB`;
	}

	if (bytes >= 1024) {
		return `${bytes / 1024}KB`;
	}

	return `${bytes}B`;
};

/**
 * Normalizes a hex address string to a `0x`-prefixed, upper-case form.
 *
 * @param address - The hex address to format.
 * @returns The normalized address.
 */
const formatHexAddress = (address: string): string =>
	`0x${address.replace(/^0x/i, '').toUpperCase()}`;

/**
 * Resolves the region size label and end address for the responder that
 * defines the given start address.
 *
 * @param startAddress - The start address of the region.
 * @returns The size label and end address, or `undefined` when no region
 *   matches the given start address.
 */
export const getResponderRegionInfo = (
	startAddress: string
): {sizeLabel: string; endAddress: string} | undefined => {
	if (!startAddress) return undefined;

	for (const node of getFirewallResponders()) {
		for (const child of node.children) {
			if (child.startAddress === startAddress && child.endAddress) {
				const start = Number.parseInt(startAddress, 16);
				const end = Number.parseInt(child.endAddress, 16);

				return {
					sizeLabel: formatByteSize(end - start + 1),
					endAddress: formatHexAddress(child.endAddress)
				};
			}
		}
	}

	return undefined;
};

export type FirewallGroup = {
	parent: string;
	children: string[];
};

/**
 * Groups selected firewall entry keys (`column::parent::child`) that belong to
 * the given column, keyed by their parent.
 *
 * @param entries - The selected entry keys for the zone.
 * @param column - The column to filter by.
 * @returns The grouped entries for the column.
 */
export function groupEntriesByParent(
	entries: string[],
	column: FirewallColumn
): FirewallGroup[] {
	const groups = new Map<string, string[]>();

	entries.forEach(key => {
		const [entryColumn, parent, child] = key.split('::');

		if (entryColumn !== column || !parent || !child) return;

		groups.set(parent, [...(groups.get(parent) ?? []), child]);
	});

	const collator = new Intl.Collator(undefined, {
		numeric: true,
		sensitivity: 'base'
	});

	return Array.from(groups, ([parent, children]) => ({
		parent,
		children: [...children].sort((a, b) => collator.compare(a, b))
	})).sort((a, b) => collator.compare(a.parent, b.parent));
}

export type FirewallColumnTab = {
	id: FirewallColumn;
	label: string;
	count: number;
};

/**
 * Returns the total number of child entries across the provided groups.
 *
 * @param groups - The grouped firewall entries.
 * @returns The total child count.
 */
export const countEntries = (groups: FirewallGroup[]): number =>
	groups.reduce((sum, group) => sum + group.children.length, 0);

/**
 * Builds the tab descriptors for the manage-firewalls table, pairing each
 * column with its localized label and selected-entry count.
 *
 * @param initiatorGroups - The grouped initiator entries.
 * @param responderGroups - The grouped responder entries.
 * @param labels - The localized column labels.
 * @returns The ordered tab descriptors.
 */
export const buildFirewallColumns = (
	initiatorGroups: FirewallGroup[],
	responderGroups: FirewallGroup[],
	labels: {initiators: string; responders: string}
): FirewallColumnTab[] => [
	{
		id: 'initiators',
		label: labels.initiators,
		count: countEntries(initiatorGroups)
	},
	{
		id: 'responders',
		label: labels.responders,
		count: countEntries(responderGroups)
	}
];

/**
 * Returns the total number of child firewalls across the provided nodes.
 *
 * @param nodes - The firewall nodes to count children for.
 * @returns The total child count.
 */
export const getChildCount = (nodes: FirewallNode[]): number =>
	nodes.reduce((sum, node) => sum + node.children.length, 0);

/**
 * Builds the tab descriptors for the manage (add) firewalls table, pairing each
 * column with its localized label and the total number of firewalls available
 * for that column in the data-model catalog.
 *
 * @param labels - The localized column labels.
 * @returns The ordered tab descriptors.
 */
export const buildFirewallCatalogColumns = (labels: {
	initiators: string;
	responders: string;
}): FirewallColumnTab[] => [
	{
		id: 'initiators',
		label: labels.initiators,
		count: getChildCount(getFirewallInitiators())
	},
	{
		id: 'responders',
		label: labels.responders,
		count: getChildCount(getFirewallResponders())
	}
];

/**
 * Derives the set of configured entry keys from the saved zone selections.
 * A firewall entry is considered configured when it is selected in at least
 * one zone, rather than relying on immutable placeholder flags.
 *
 * @param zones - The firewall zones to derive configuration state from.
 * @returns The set of configured entry keys (`column::parent::child`).
 */
export const getConfiguredEntryKeys = (
	zones: FirewallZone[]
): Set<string> =>
	new Set(zones.flatMap(zone => zone.selectedFirewalls ?? []));

/**
 * Returns the provided nodes filtered to only their unconfigured children,
 * omitting nodes that have no unconfigured children. Configuration state is
 * derived from the provided set of configured entry keys.
 *
 * @param nodes - The firewall nodes to filter.
 * @param column - The column the nodes belong to.
 * @param configuredKeys - The set of configured entry keys.
 * @returns The nodes containing only unconfigured children.
 */
export const getUnconfiguredNodes = (
	nodes: FirewallNode[],
	column: FirewallColumn,
	configuredKeys: ReadonlySet<string>
): FirewallNode[] =>
	nodes.reduce<FirewallNode[]>((acc, node) => {
		const children = node.children.filter(
			child =>
				!configuredKeys.has(
					getEntryKey(column, node.name, child.name)
				)
		);

		if (children.length > 0) {
			acc.push({...node, children});
		}

		return acc;
	}, []);

/**
 * Returns the total number of unconfigured firewalls across initiators and
 * responders, derived from the provided set of configured entry keys.
 *
 * @param configuredKeys - The set of configured entry keys.
 * @returns The total unconfigured firewall count.
 */
export const getUnconfiguredFirewallCount = (
	configuredKeys: ReadonlySet<string>
): number =>
	getChildCount(
		getUnconfiguredNodes(
			getFirewallInitiators(),
			'initiators',
			configuredKeys
		)
	) +
	getChildCount(
		getUnconfiguredNodes(
			getFirewallResponders(),
			'responders',
			configuredKeys
		)
	);

const countConfiguredChildren = (
	nodes: FirewallNode[],
	column: FirewallColumn,
	configuredKeys: ReadonlySet<string>
): number =>
	nodes.reduce(
		(sum, node) =>
			sum +
			node.children.filter(child =>
				configuredKeys.has(getEntryKey(column, node.name, child.name))
			).length,
		0
	);

/**
 * Returns the total number of configured firewalls across initiators and
 * responders. Counting against the catalog rather than the key set itself
 * ignores selections the current SoC no longer defines, so the configured and
 * unconfigured counts always add up to the catalog total.
 *
 * @param configuredKeys - The set of configured entry keys.
 * @returns The total configured firewall count.
 */
export const getConfiguredFirewallCount = (
	configuredKeys: ReadonlySet<string>
): number =>
	countConfiguredChildren(
		getFirewallInitiators(),
		'initiators',
		configuredKeys
	) +
	countConfiguredChildren(
		getFirewallResponders(),
		'responders',
		configuredKeys
	);

/**
 * Filters firewall nodes to those whose name or matching children satisfy the
 * search pattern and the provided configuration filter, dropping any node left
 * without matching children.
 *
 * @param nodes - The firewall nodes to filter.
 * @param searchPattern - The compiled search pattern.
 * @param query - The trimmed search query; an empty query matches every name.
 * @param matchesConfigFilter - Predicate deciding whether a child passes the
 *   active configuration filter.
 * @returns The nodes containing only their matching children.
 */
export const filterFirewallNodes = (
	nodes: FirewallNode[],
	searchPattern: RegExp,
	query: string,
	matchesConfigFilter: (
		parent: string,
		child: FirewallChild
	) => boolean
): FirewallNode[] =>
	nodes.reduce<FirewallNode[]>((acc, node) => {
		const nameMatchesSearch = !query || searchPattern.test(node.name);

		const matchingChildren = node.children.filter(child => {
			const matchesSearch =
				nameMatchesSearch || searchPattern.test(child.name);

			return matchesSearch && matchesConfigFilter(node.name, child);
		});

		if (matchingChildren.length > 0) {
			acc.push({...node, children: matchingChildren});
		}

		return acc;
	}, []);
