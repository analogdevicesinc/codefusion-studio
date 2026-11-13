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
import {isPinBufferSubGroup} from './sru';
import type {
	SruConnectionStatus,
	SruFilterState
} from '../state/slices/sru/sru.reducer';
import type {SruConnectionEntry} from '../state/slices/sru/sru.selector';

/**
 * Every SRU signal is rendered as a card listing the connections it takes
 * part in. An input has at most one; an output has as many as there are
 * inputs routed to it.
 */
export type SruSignalCard =
	| {
			signal: SruInputSignal;
			direction: 'input';
			connections: SruConnectionEntry[];
			editable: boolean;
	  }
	| {
			signal: SruOutputSignal;
			direction: 'output';
			connections: SruConnectionEntry[];
			editable: boolean;
	  };

/**
 * Derives the status of an output signal from the connections routed to it.
 * An output has no status of its own, so it counts as modified as soon as
 * any of its incoming connections has been overridden by the user.
 *
 * @param connections - The connections routed to the output signal.
 * @returns `'modified'` if any connection is modified, otherwise `'default'`.
 */
export function getOutputStatus(
	connections: SruConnectionEntry[]
): SruConnectionStatus {
	return connections.some(entry => entry.status === 'modified')
		? 'modified'
		: 'default';
}

/**
 * Whether a signal's card can be expanded. Signals with no connections -
 * i.e. unused outputs - have no body to reveal.
 *
 * @param connections - The connections the signal takes part in.
 * @returns True when the card has connections to show.
 */
export function isSignalExpandable(
	connections: SruConnectionEntry[]
): boolean {
	return connections.length > 0;
}

/**
 * Splits pin-buffer enable inputs out of a signal group's input list so the
 * Connections main panel can render them in a dedicated Direction Controls
 * section. Classification is per-signal: only inputs with
 * `IsPinBufferEnable === true` move; other inputs stay in the Inputs section.
 *
 * @param inputs - The signal group's input signals, in SoC data-model order.
 * @returns The remaining inputs and the direction-control inputs, each
 * preserving relative order.
 */
export function partitionDirectionControlInputs(
	inputs: SruInputSignal[]
): {inputs: SruInputSignal[]; directionControls: SruInputSignal[]} {
	const directionControls = inputs.filter(
		i => i.IsPinBufferEnable === true
	);
	const rest = inputs.filter(i => i.IsPinBufferEnable !== true);

	return {inputs: rest, directionControls};
}

/**
 * One `SignalType` sub-group within a Connections section, e.g. the
 * "Clock Signals" cards inside a peripheral's Input Signals section.
 */
export type SruSignalTypeGroup = {
	signalType: string;
	cards: SruSignalCard[];
};

/**
 * Groups a section's signal cards by their SoC-defined `SignalType`
 * (e.g. "Clock Signals", "Data Signals"). `SignalType` is free-form data, not
 * a fixed enum, so groups are neither sorted nor filtered to a known list -
 * they appear in first-appearance order, matching the SoC data model's own
 * signal order. Cards within each group are sorted alphabetically by signal
 * name.
 *
 * @param cards - The section's already-filtered signal cards, in SoC
 * data-model order.
 * @returns One group per distinct `SignalType`, in first-appearance order,
 * with cards sorted alphabetically by name within each group.
 */
export function groupSruSignalCardsByType(
	cards: SruSignalCard[]
): SruSignalTypeGroup[] {
	const groups = new Map<string, SruSignalCard[]>();

	for (const card of cards) {
		const {SignalType} = card.signal;
		const group = groups.get(SignalType);

		if (group) {
			group.push(card);
		} else {
			groups.set(SignalType, [card]);
		}
	}

	return [...groups.entries()].map(([signalType, groupCards]) => ({
		signalType,
		cards: [...groupCards].sort((a, b) =>
			a.signal.Name.localeCompare(b.signal.Name, undefined, {
				numeric: true,
				sensitivity: 'base'
			})
		)
	}));
}

/**
 * Pin-buffer direction implied by the group's PBEN signal source.
 * `HIGH` drives the pin as an output, `LOW` as an input, and any other
 * routed signal makes the buffer bidirectional.
 */
export type PinBufferDirection = 'input' | 'output' | 'bidirectional';

/**
 * Derives the pin-buffer direction from the PBEN signal's effective SRU
 * source. Returns `undefined` when the PBEN has no source yet.
 *
 * @param pbenSource - The effective source routed to the PBEN input.
 * @returns The matching direction, or `undefined` when unset.
 */
export function getPinBufferDirection(
	pbenSource: string | undefined
): PinBufferDirection | undefined {
	if (pbenSource === 'LOW') return 'input';
	if (pbenSource === 'HIGH') return 'output';

	return pbenSource ? 'bidirectional' : undefined;
}

/**
 * Maps a pin-buffer subgroup display label to the abstract pin signal name
 * used in the SoC package data (e.g. `PB01` -> `PIN01`).
 *
 * @param subgroupLabel - The signal group's display label.
 * @returns The abstract pin signal name for package pin lookup.
 */
export function getPinBufferSignalName(
	subgroupLabel: string
): string {
	return subgroupLabel.replace(/^PB/, 'PIN');
}

/**
 * Whether `source` is a real (non-HIGH/LOW) signal routed to a pin-buffer
 * enable input. Used to decide when to remember a PBEN source for later
 * Bidirectional restore.
 *
 * @param input - The SRU input being connected, if known.
 * @param source - The source routed to that input.
 * @returns True when the input is a PBEN and the source is bidirectional.
 */
export function isPbenBidirectionalSource(
	input: SruInputSignal | undefined,
	source: string | undefined
): boolean {
	return (
		input?.IsPinBufferEnable === true &&
		getPinBufferDirection(source) === 'bidirectional'
	);
}

/**
 * Picks the signal to restore when the user switches a pin buffer back to
 * Bidirectional: the last remembered real PBEN source, else the SoC default
 * when that default is itself a real signal. Returns `undefined` when
 * neither is available so the caller can open the edit panel instead.
 *
 * @param rememberedSignal - The last real signal remembered for this PBEN.
 * @param defaultSource - The SoC factory-default source for this PBEN.
 * @returns The source to restore, or `undefined` when none is available.
 */
export function getPbenRestoreSignal(
	rememberedSignal: string | undefined,
	defaultSource: string | undefined
): string | undefined {
	if (rememberedSignal) return rememberedSignal;

	return getPinBufferDirection(defaultSource) === 'bidirectional'
		? defaultSource
		: undefined;
}

/**
 * Whether `source` is a real (non-LOW) signal routed to a pin-buffer data
 * input. Used to decide when to remember the source for later restore when
 * Direction leaves Input.
 *
 * @param input - The SRU input being connected, if known.
 * @param source - The source routed to that input.
 * @returns True when the input is a pin-buffer data input and the source is
 * real.
 */
export function isPinBufferDataSource(
	input: SruInputSignal | undefined,
	source: string | undefined
): boolean {
	return (
		input?.IsPinBufferEnable !== true &&
		isPinBufferSubGroup(input?.PeripheralSubGroup) &&
		source !== undefined &&
		source !== 'LOW'
	);
}

/**
 * Picks the signal to restore when the user switches a pin buffer away from
 * Input: the last remembered real data-input source, else the SoC default.
 *
 * @param rememberedSignal - The last real signal remembered for this input.
 * @param defaultSource - The SoC factory-default source for this input.
 * @returns The source to restore.
 */
export function getPinBufferInputRestoreSignal(
	rememberedSignal: string | undefined,
	defaultSource: string | undefined
): string {
	return rememberedSignal ?? defaultSource ?? '';
}

/**
 * Applies the Connections status filter to a signal card.
 *
 * Status compares against an input's own connection status, or an output's
 * status derived from its incoming connections. A signal with no connections
 * at all only ever counts as default. Search text does not narrow cards;
 * only the floating search-scope dropdown reacts to typed text.
 *
 * @param card - The signal card to test.
 * @param filter - The active Connections status filter.
 * @returns True when the card should be rendered.
 */
export function matchesSruFilter(
	card: SruSignalCard,
	filter: Pick<SruFilterState, 'statusFilter'>
): boolean {
	return (
		filter.statusFilter === 'all' ||
		getOutputStatus(card.connections) === filter.statusFilter
	);
}

/**
 * Builds the filtered signal cards for one direction of a peripheral signal
 * group.
 *
 * @param signals - The signal group's input or output signals.
 * @param direction - Which of the two the signals are.
 * @param lookup - Resolves a signal name to the connections it takes part in.
 * @param filter - The active Connections filter (status only).
 * @returns The cards that survive the filter, in SoC data-model order.
 */
export function buildSruSignalCards(
	signals: SruInputSignal[],
	direction: 'input',
	lookup: (name: string) => SruConnectionEntry[],
	filter: Pick<SruFilterState, 'statusFilter'>
): SruSignalCard[];
export function buildSruSignalCards(
	signals: SruOutputSignal[],
	direction: 'output',
	lookup: (name: string) => SruConnectionEntry[],
	filter: Pick<SruFilterState, 'statusFilter'>
): SruSignalCard[];

export function buildSruSignalCards(
	signals: Array<SruInputSignal | SruOutputSignal>,
	direction: 'input' | 'output',
	lookup: (name: string) => SruConnectionEntry[],
	filter: Pick<SruFilterState, 'statusFilter'>
): SruSignalCard[] {
	return signals
		.map(signal =>
			toSruSignalCard(signal, direction, lookup(signal.Name))
		)
		.filter(card => matchesSruFilter(card, filter));
}

function toSruSignalCard(
	signal: SruInputSignal | SruOutputSignal,
	direction: 'input' | 'output',
	connections: SruConnectionEntry[]
): SruSignalCard {
	return direction === 'input'
		? {
				signal: signal as SruInputSignal,
				direction,
				connections,
				editable: true
			}
		: {
				signal: signal as SruOutputSignal,
				direction,
				connections,
				editable: true
			};
}
