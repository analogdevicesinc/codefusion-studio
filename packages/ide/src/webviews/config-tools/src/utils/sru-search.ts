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
import type {SruInputSignal, SruOutputSignal} from 'cfs-types';
import type {
	FormattedPeripheral,
	FormattedPeripheralSignal
} from '@common/types/soc';
import {getPeripheralList} from './soc-peripherals';
import type {
	SruNavigationSection,
	SruPeripheralSignalGroup
} from './sru-navigation';
import {
	MIN_SRU_SEARCH_LENGTH,
	SRU_SEARCH_SCOPE_PRIORITY,
	SRU_SEARCH_SCOPES,
	type SruSearchScope
} from '../screens/signal-routing-unit/connections/constants/search-scope';
import type {SruConnectionEntry} from '../state/slices/sru/sru.selector';
import type {SruFilterState} from '../state/slices/sru/sru.reducer';

export type SruSignalMatch = {
	signalGroup: SruPeripheralSignalGroup;
	signal: SruInputSignal | SruOutputSignal;
	direction: 'input' | 'output';
	/** The signal's user-assigned alias, if it has one. */
	signalAlias?: string;
};

/**
 * A Descriptions-scope match: the peripheral-level description shared by
 * every signal group derived from that peripheral, a per-signal description
 * from the SoC model, or a user-authored connection comment on one specific
 * input.
 */
export type SruDescriptionMatch =
	| {kind: 'peripheral'; signalGroup: SruPeripheralSignalGroup}
	| {
			kind: 'signal';
			signalGroup: SruPeripheralSignalGroup;
			signal: SruInputSignal | SruOutputSignal;
			direction: 'input' | 'output';
	  }
	| {
			kind: 'connection';
			signalGroup: SruPeripheralSignalGroup;
			input: SruInputSignal;
			output: string;
			description: string;
	  };

export type SruGroupScopeMatch =
	| {
			kind: 'navigationGroup';
			sectionKind: SruNavigationSection['kind'];
			group: string;
	  }
	| {
			kind: 'signalGroup';
			signalGroup: SruPeripheralSignalGroup;
	  };

export type SruSearchMatches = {
	pinBufferGroups: SruGroupScopeMatch[];
	peripheralGroups: SruGroupScopeMatch[];
	signalMatches: SruSignalMatch[];
	descriptionMatches: SruDescriptionMatch[];
};

/**
 * Applies only the Connections status filter to the SoC peripheral list.
 * Search text does not narrow the nav or main panel; only the floating
 * search-scope dropdown reacts to typed text.
 */
export function filterSruPeripheralsByStatus(
	filter: Pick<SruFilterState, 'statusFilter'>,
	modifiedConnections: SruConnectionEntry[]
): Array<FormattedPeripheral<FormattedPeripheralSignal>> {
	const modifiedSignalNames = new Set(
		modifiedConnections.flatMap(e => [e.input, e.output])
	);

	return getPeripheralList().filter(peripheral => {
		if (!peripheral.sru) {
			return false;
		}

		const signalNames: string[] = [
			...(peripheral.sru.Inputs ?? []).map(signal => signal.Name),
			...(peripheral.sru.Outputs ?? []).map(signal => signal.Name)
		];

		return (
			filter.statusFilter === 'all' ||
			(filter.statusFilter === 'modified' &&
				signalNames.some(name => modifiedSignalNames.has(name))) ||
			(filter.statusFilter === 'default' &&
				signalNames.every(name => !modifiedSignalNames.has(name)))
		);
	});
}

/**
 * Computes scope-specific search matches over already-grouped navigation
 * sections. Descriptions matches are sourced from three independent kinds of
 * text: the peripheral-level description shared by a signal group (the SoC
 * model's `Peripheral.Description`), the per-signal description on each
 * input/output (the SoC model's `signal.Description`), and user-authored
 * connection comments (`SruConnectionEntry.description`, keyed by input).
 * The Signals scope, by contrast, matches `signal.Name` or the signal's
 * user-assigned alias, if any.
 */
export function computeSruSearchMatches(
	sections: SruNavigationSection[],
	searchText: string,
	connectionsByInput: Record<string, SruConnectionEntry>,
	signalAliases: Record<string, string> = {}
): SruSearchMatches {
	if (searchText.length < MIN_SRU_SEARCH_LENGTH) {
		return emptySruSearchMatches();
	}

	const search = searchText.toLowerCase();
	const pinBufferGroups: SruGroupScopeMatch[] = [];
	const peripheralGroups: SruGroupScopeMatch[] = [];
	const signalMatches: SruSignalMatch[] = [];
	const descriptionMatches: SruDescriptionMatch[] = [];
	const seenPinBuffer = new Set<string>();
	const seenPeripheral = new Set<string>();
	const seenSignal = new Set<string>();
	const seenPeripheralDescription = new Set<string>();
	const seenSignalDescription = new Set<string>();

	for (const section of sections) {
		for (const entry of section.entries) {
			const navigationGroupMatches =
				entry.group?.toLowerCase().includes(search) === true;

			if (navigationGroupMatches && entry.group) {
				addUniqueGroupScopeMatch(
					section.kind === 'pinBuffers'
						? pinBufferGroups
						: peripheralGroups,
					section.kind === 'pinBuffers'
						? seenPinBuffer
						: seenPeripheral,
					{
						kind: 'navigationGroup',
						sectionKind: section.kind,
						group: entry.group
					}
				);
			}

			for (const signalGroup of entry.signalGroups) {
				collectGroupScopeMatches({
					sectionKind: section.kind,
					signalGroup,
					search,
					pinBufferGroups,
					peripheralGroups,
					seenPinBuffer,
					seenPeripheral
				});

				collectSignalScopeMatches({
					signalGroup,
					search,
					signalAliases,
					signalMatches,
					seenSignal
				});
				collectDescriptionScopeMatches({
					signalGroup,
					search,
					connectionsByInput,
					descriptionMatches,
					seenPeripheralDescription,
					seenSignalDescription
				});
			}
		}
	}

	return {
		pinBufferGroups,
		peripheralGroups,
		signalMatches,
		descriptionMatches
	};
}

function emptySruSearchMatches(): SruSearchMatches {
	return {
		pinBufferGroups: [],
		peripheralGroups: [],
		signalMatches: [],
		descriptionMatches: []
	};
}

function addUniqueGroupScopeMatch(
	groups: SruGroupScopeMatch[],
	seen: Set<string>,
	match: SruGroupScopeMatch
) {
	const key =
		match.kind === 'navigationGroup'
			? `${match.sectionKind}:${match.group}`
			: match.signalGroup.key;

	if (seen.has(key)) {
		return;
	}

	seen.add(key);
	groups.push(match);
}

function collectGroupScopeMatches({
	sectionKind,
	signalGroup,
	search,
	pinBufferGroups,
	peripheralGroups,
	seenPinBuffer,
	seenPeripheral
}: {
	sectionKind: SruNavigationSection['kind'];
	signalGroup: SruPeripheralSignalGroup;
	search: string;
	pinBufferGroups: SruGroupScopeMatch[];
	peripheralGroups: SruGroupScopeMatch[];
	seenPinBuffer: Set<string>;
	seenPeripheral: Set<string>;
}) {
	if (sectionKind === 'pinBuffers') {
		const matchesPinBuffer =
			signalGroup.label.toLowerCase().includes(search) ||
			signalGroup.peripheralName.toLowerCase().includes(search);

		if (matchesPinBuffer) {
			addUniqueGroupScopeMatch(pinBufferGroups, seenPinBuffer, {
				kind: 'signalGroup',
				signalGroup
			});
		}

		return;
	}

	const matchesPeripheral = signalGroup.name
		.toLowerCase()
		.includes(search);

	if (matchesPeripheral) {
		addUniqueGroupScopeMatch(peripheralGroups, seenPeripheral, {
			kind: 'signalGroup',
			signalGroup
		});
	}
}

function collectSignalScopeMatches({
	signalGroup,
	search,
	signalAliases,
	signalMatches,
	seenSignal
}: {
	signalGroup: SruPeripheralSignalGroup;
	search: string;
	signalAliases: Record<string, string>;
	signalMatches: SruSignalMatch[];
	seenSignal: Set<string>;
}) {
	for (const input of signalGroup.inputs) {
		addSignalMatch({
			signalGroup,
			signal: input,
			direction: 'input',
			search,
			signalAliases,
			signalMatches,
			seenSignal
		});
	}

	for (const output of signalGroup.outputs) {
		addSignalMatch({
			signalGroup,
			signal: output,
			direction: 'output',
			search,
			signalAliases,
			signalMatches,
			seenSignal
		});
	}
}

/**
 * Adds a Signals-scope match when a signal's raw name or user-assigned
 * alias contains the search text.
 */
function addSignalMatch({
	signalGroup,
	signal,
	direction,
	search,
	signalAliases,
	signalMatches,
	seenSignal
}: {
	signalGroup: SruPeripheralSignalGroup;
	signal: SruInputSignal | SruOutputSignal;
	direction: 'input' | 'output';
	search: string;
	signalAliases: Record<string, string>;
	signalMatches: SruSignalMatch[];
	seenSignal: Set<string>;
}) {
	const alias = signalAliases[signal.Name];
	const matchesName = signal.Name.toLowerCase().includes(search);
	const matchesAlias = Boolean(alias?.toLowerCase().includes(search));

	if (!matchesName && !matchesAlias) {
		return;
	}

	const key = `${signalGroup.key}:${signal.Name}`;

	if (!seenSignal.has(key)) {
		seenSignal.add(key);
		signalMatches.push({
			signalGroup,
			signal,
			direction,
			signalAlias: alias
		});
	}
}

/**
 * Collects Descriptions-scope matches for one signal group: at most one
 * peripheral-level match (deduped by group key, since every group derived
 * from the same peripheral shares its `Description`), one signal-level
 * match per input/output whose SoC-model `Description` matches, and one
 * connection-comment match per input whose user-authored description
 * matches.
 */
function collectDescriptionScopeMatches({
	signalGroup,
	search,
	connectionsByInput,
	descriptionMatches,
	seenPeripheralDescription,
	seenSignalDescription
}: {
	signalGroup: SruPeripheralSignalGroup;
	search: string;
	connectionsByInput: Record<string, SruConnectionEntry>;
	descriptionMatches: SruDescriptionMatch[];
	seenPeripheralDescription: Set<string>;
	seenSignalDescription: Set<string>;
}) {
	if (
		signalGroup.description.toLowerCase().includes(search) &&
		!seenPeripheralDescription.has(signalGroup.key)
	) {
		seenPeripheralDescription.add(signalGroup.key);
		descriptionMatches.push({kind: 'peripheral', signalGroup});
	}

	for (const input of signalGroup.inputs) {
		addSignalDescriptionMatch({
			signalGroup,
			signal: input,
			direction: 'input',
			search,
			descriptionMatches,
			seenSignalDescription
		});
	}

	for (const output of signalGroup.outputs) {
		addSignalDescriptionMatch({
			signalGroup,
			signal: output,
			direction: 'output',
			search,
			descriptionMatches,
			seenSignalDescription
		});
	}

	for (const input of signalGroup.inputs) {
		const connection = connectionsByInput[input.Name];
		const description = connection?.description ?? '';

		if (connection && description.toLowerCase().includes(search)) {
			descriptionMatches.push({
				kind: 'connection',
				signalGroup,
				input,
				output: connection.output,
				description
			});
		}
	}
}

/**
 * Adds a signal-level Descriptions-scope match when a signal's SoC-model
 * `Description` (not its `Name`) contains the search text, deduped per
 * signal group and signal name.
 */
function addSignalDescriptionMatch({
	signalGroup,
	signal,
	direction,
	search,
	descriptionMatches,
	seenSignalDescription
}: {
	signalGroup: SruPeripheralSignalGroup;
	signal: SruInputSignal | SruOutputSignal;
	direction: 'input' | 'output';
	search: string;
	descriptionMatches: SruDescriptionMatch[];
	seenSignalDescription: Set<string>;
}) {
	if (!signal.Description.toLowerCase().includes(search)) {
		return;
	}

	const key = `${signalGroup.key}:${signal.Name}`;

	if (!seenSignalDescription.has(key)) {
		seenSignalDescription.add(key);
		descriptionMatches.push({
			kind: 'signal',
			signalGroup,
			signal,
			direction
		});
	}
}

/**
 * Whether a search scope has any matches for the current query. Shared by
 * the effective-scope fallback below and by the scope chip row / keyboard
 * navigation, so mouse and keyboard agree on which scopes are reachable.
 */
export function isSruSearchScopeAvailable(
	scope: SruSearchScope,
	results: SruSearchMatches
): boolean {
	switch (scope) {
		case SRU_SEARCH_SCOPES.PIN_BUFFERS:
			return results.pinBufferGroups.length > 0;
		case SRU_SEARCH_SCOPES.PERIPHERALS:
			return results.peripheralGroups.length > 0;
		case SRU_SEARCH_SCOPES.SIGNALS:
			return results.signalMatches.length > 0;
		case SRU_SEARCH_SCOPES.DESCRIPTIONS:
			return results.descriptionMatches.length > 0;
		default:
			return false;
	}
}

/** Scopes with at least one match, in their fixed priority/chip order. */
export function getAvailableSruSearchScopes(
	results: SruSearchMatches
): SruSearchScope[] {
	return SRU_SEARCH_SCOPE_PRIORITY.filter(scope =>
		isSruSearchScopeAvailable(scope, results)
	);
}

/**
 * Picks the first scope with matches when the active scope has none, mirroring
 * pin-mux search fallback behaviour.
 */
export function resolveEffectiveSruSearchScope(
	activeScope: SruSearchScope,
	results: SruSearchMatches
): SruSearchScope {
	return isSruSearchScopeAvailable(activeScope, results)
		? activeScope
		: (getAvailableSruSearchScopes(results)[0] ??
				SRU_SEARCH_SCOPES.PIN_BUFFERS);
}
