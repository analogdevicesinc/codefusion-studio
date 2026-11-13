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
	FormattedPeripheral,
	FormattedPeripheralSignal
} from '@common/types/soc';
import type {SruInputSignal, SruOutputSignal} from 'cfs-types';
import {getPeripheralList} from './soc-peripherals';

/**
 * A single peripheral signal group in the SRU Connections side panel. Backed
 * either by an SRU input/output-level signal group (e.g. `SPORT 0A`) or, as
 * a fallback, by a peripheral's ungrouped signals (named after the
 * peripheral).
 *
 * Carries the signals themselves so the Connections main panel can render a
 * selected signal group without reimplementing the grouping rule.
 *
 * `label` is the side-panel display text: for pin-buffer groups this is the
 * subgroup name with the `<peripheralName>_` prefix stripped (e.g. `PB01`);
 * elsewhere it matches `name`.
 */
export type SruPeripheralSignalGroup = {
	key: string;
	name: string;
	label: string;
	peripheralName: string;
	description: string;
	inputs: SruInputSignal[];
	outputs: SruOutputSignal[];
};

/**
 * A top-level entry in the SRU Connections side panel. When `group` is set,
 * the entry renders as an expandable accordion over its signal groups -
 * either a real peripheral-level `Peripheral.Group` (e.g. `SPORT`, bucketing
 * multiple peripherals) or a single peripheral's own name, used as a
 * synthesized wrapper when that peripheral has signal-level
 * `PeripheralSubGroup`s but no peripheral-level group. When `group` is
 * absent, the entry's (single) signal group belongs to a peripheral with
 * neither and renders directly at the top level instead.
 */
export type SruNavigationEntry = {
	group?: string;
	signalGroups: SruPeripheralSignalGroup[];
};

/**
 * A top-level section in the SRU Connections side panel. Pin-buffer signal
 * groups (those whose subgroup contains an `IsPinBufferEnable` input) are
 * collected under `pinBuffers`; everything else under `peripherals`.
 * Empty sections are omitted so no heading is ever orphaned.
 */
export type SruNavigationSection = {
	kind: 'pinBuffers' | 'peripherals';
	entries: SruNavigationEntry[];
};

/**
 * Locale-aware, numeric-sensitive comparator for ordering top-level entries
 * by their display label, consistent with the peripheral-name sort used
 * elsewhere (see `soc-peripherals.ts`).
 */
const collator = new Intl.Collator(undefined, {
	numeric: true,
	sensitivity: 'base'
});

/**
 * Groups SRU peripherals for the Connections side panel into pin-buffer and
 * peripheral sections, replacing peripheral names with their SRU
 * input/output-level signal groups.
 *
 * Classification is at signal-group level: if any input in a subgroup carries
 * `IsPinBufferEnable`, the entire subgroup (all inputs and outputs) moves
 * into the pin-buffers section under an accordion named after the peripheral,
 * with display labels stripping the `<peripheralName>_` prefix.
 *
 * Remaining groups keep the existing peripheral-section logic:
 * - Peripherals that have a peripheral-level `group` are bucketed under that
 *   group's name, in order of first occurrence.
 * - Peripherals with no peripheral-level `group` but with at least one
 *   remaining signal-level `PeripheralSubGroup` are wrapped in their own
 *   entry, using the peripheral's name as its `group`.
 * - Peripherals with neither become their own standalone entry (no `group`).
 * - Top-level entries within each section are ordered alphabetically by their
 *   display label, and each entry's signal groups are likewise ordered
 *   alphabetically by their display `label` (not the underlying data model's
 *   first-occurrence order, which follows register layout rather than name).
 *
 * @param peripherals - Array of formatted peripherals with signals.
 * @returns Sections in pinBuffers-then-peripherals order, omitting empties.
 */
export function groupSruSignals(
	peripherals: Array<FormattedPeripheral<FormattedPeripheralSignal>>
): SruNavigationSection[] {
	const pinBufferEntries = new Map<string, SruNavigationEntry>();
	const pinBufferOrdered: SruNavigationEntry[] = [];

	const groupEntries = new Map<string, SruNavigationEntry>();
	const peripheralOrdered: SruNavigationEntry[] = [];

	for (const p of peripherals) {
		const {subgroups, fallback} = buildPeripheralSignalGroups(p);

		const pinBufferGroups: SruPeripheralSignalGroup[] = [];
		const remainingGroups: SruPeripheralSignalGroup[] = [];

		for (const signalGroup of subgroups) {
			if (isPinBufferGroup(signalGroup)) {
				signalGroup.label = pinBufferLabel(signalGroup.name, p.name);
				pinBufferGroups.push(signalGroup);
			} else {
				remainingGroups.push(signalGroup);
			}
		}

		if (pinBufferGroups.length > 0) {
			let entry = pinBufferEntries.get(p.name);

			if (!entry) {
				entry = {group: p.name, signalGroups: []};
				pinBufferEntries.set(p.name, entry);
				pinBufferOrdered.push(entry);
			}

			entry.signalGroups.push(...pinBufferGroups);
		}

		if (p.group) {
			const toAdd = [
				...remainingGroups,
				...(fallback ? [fallback] : [])
			];

			if (toAdd.length === 0) {
				continue;
			}

			let entry = groupEntries.get(p.group);

			if (!entry) {
				entry = {group: p.group, signalGroups: []};
				groupEntries.set(p.group, entry);
				peripheralOrdered.push(entry);
			}

			entry.signalGroups.push(...toAdd);
		} else if (remainingGroups.length > 0) {
			peripheralOrdered.push({
				group: p.name,
				signalGroups: fallback
					? [fallback, ...remainingGroups]
					: remainingGroups
			});
		} else if (fallback) {
			peripheralOrdered.push({
				signalGroups: [fallback]
			});
		}
	}

	for (const entry of [...pinBufferOrdered, ...peripheralOrdered]) {
		entry.signalGroups.sort((a, b) =>
			collator.compare(a.label, b.label)
		);
	}

	pinBufferOrdered.sort((a, b) =>
		collator.compare(entryLabel(a), entryLabel(b))
	);
	peripheralOrdered.sort((a, b) =>
		collator.compare(entryLabel(a), entryLabel(b))
	);

	const sections: SruNavigationSection[] = [];

	if (pinBufferOrdered.length > 0) {
		sections.push({
			kind: 'pinBuffers',
			entries: pinBufferOrdered
		});
	}

	if (peripheralOrdered.length > 0) {
		sections.push({
			kind: 'peripherals',
			entries: peripheralOrdered
		});
	}

	return sections;
}

/**
 * Flattens every signal group across all navigation sections, for selection
 * lookup that must ignore section and entry nesting.
 */
export function flattenSruSignalGroups(
	sections: SruNavigationSection[]
): SruPeripheralSignalGroup[] {
	return sections.flatMap(section =>
		section.entries.flatMap(entry => entry.signalGroups)
	);
}

let cachedSignalGroups: SruPeripheralSignalGroup[] | undefined;

/**
 * Returns every SRU signal group for the current SoC, flattened for
 * selection lookup - the Connections side panel resolves its selection
 * against this full, unfiltered set (see `connections.tsx`) so a selection
 * survives its own row being hidden by the status filter, and
 * `revealSruSignal` resolves a jump target against it the same way.
 *
 * Computed once and cached until {@link invalidateSruSignalGroupsCache}
 * runs, since both consumers need the same result on effectively every
 * render/dispatch and the underlying SoC data does not change in between.
 */
export function getSruSignalGroups(): SruPeripheralSignalGroup[] {
	cachedSignalGroups ??= flattenSruSignalGroups(
		groupSruSignals(
			getPeripheralList().filter(peripheral => peripheral.sru)
		)
	);

	return cachedSignalGroups;
}

/**
 * Clears the {@link getSruSignalGroups} cache. Called from
 * `initializeSruData` so a re-initialization (e.g. between tests) can't
 * leak a previous SoC's signal groups.
 */
export function invalidateSruSignalGroupsCache() {
	cachedSignalGroups = undefined;
}

/**
 * Finds the signal group containing a given SRU signal (input or output),
 * e.g. to resolve a Routing table row's destination input, or a connection
 * row's counterpart signal, to the group that must be selected in the
 * Connections side panel to reveal it.
 */
export function findSignalGroupForSignal(
	signalGroups: SruPeripheralSignalGroup[],
	signalName: string
): SruPeripheralSignalGroup | undefined {
	return signalGroups.find(signalGroup =>
		[...signalGroup.inputs, ...signalGroup.outputs].some(
			signal => signal.Name === signalName
		)
	);
}

/**
 * True when any input in the signal group is the pin-buffer enable. The flag
 * classifies the whole subgroup — never individual signals.
 */
function isPinBufferGroup(
	signalGroup: SruPeripheralSignalGroup
): boolean {
	return signalGroup.inputs.some(
		input => input.IsPinBufferEnable === true
	);
}

/**
 * Strips the `<peripheralName>_` prefix from a pin-buffer subgroup name
 * (e.g. `DAI0_PB01` → `PB01`). Falls back to the full name when the prefix
 * is absent.
 */
function pinBufferLabel(
	name: string,
	peripheralName: string
): string {
	const prefix = `${peripheralName}_`;

	return name.startsWith(prefix) ? name.slice(prefix.length) : name;
}

/**
 * The display label a top-level entry is sorted and (for grouped entries)
 * titled by: its `group` name, or else the name of its sole signal group.
 */
function entryLabel(entry: SruNavigationEntry): string {
	return entry.group ?? entry.signalGroups[0]?.name ?? '';
}

/**
 * Builds the signal groups for a single peripheral, collecting its signals
 * by their signal-level `PeripheralSubGroup` (in order of first occurrence,
 * later re-sorted alphabetically by `groupSruSignals`) and separately
 * collecting any signals with no `PeripheralSubGroup` into a single
 * fallback signal group named after the peripheral.
 */
function buildPeripheralSignalGroups(
	peripheral: FormattedPeripheral<FormattedPeripheralSignal>
): {
	subgroups: SruPeripheralSignalGroup[];
	fallback?: SruPeripheralSignalGroup;
} {
	const subgroups: SruPeripheralSignalGroup[] = [];
	const signalGroupByGroup = new Map<
		string,
		SruPeripheralSignalGroup
	>();
	let fallback: SruPeripheralSignalGroup | undefined;

	const createSignalGroup = (
		key: string,
		name: string
	): SruPeripheralSignalGroup => ({
		key,
		name,
		label: name,
		peripheralName: peripheral.name,
		description: peripheral.description,
		inputs: [],
		outputs: []
	});

	const signalGroupFor = (
		group: string | undefined
	): SruPeripheralSignalGroup => {
		if (!group) {
			if (!fallback) {
				fallback = createSignalGroup(
					peripheral.name,
					peripheral.name
				);
			}

			return fallback;
		}

		const key = `${peripheral.name}:${group}`;
		let signalGroup = signalGroupByGroup.get(key);

		if (!signalGroup) {
			signalGroup = createSignalGroup(key, group);
			signalGroupByGroup.set(key, signalGroup);
			subgroups.push(signalGroup);
		}

		return signalGroup;
	};

	for (const input of peripheral.sru?.Inputs ?? []) {
		signalGroupFor(input.PeripheralSubGroup).inputs.push(input);
	}

	for (const output of peripheral.sru?.Outputs ?? []) {
		signalGroupFor(output.PeripheralSubGroup).outputs.push(output);
	}

	return {subgroups, fallback};
}
