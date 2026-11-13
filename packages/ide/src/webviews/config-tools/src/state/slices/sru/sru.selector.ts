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
import {useMemo} from 'react';
import {shallowEqual} from 'react-redux';
import {useAppSelector} from '../../store';
import type {RootState} from '../../store';
import type {
	SruConnectionStatus,
	SruFilterState
} from './sru.reducer';
import {getSruDefaultConnections} from '../../../utils/sru';
import type {EditableConnection} from '../../../types/sru';

export type SruConnectionEntry = {
	input: string;
	output: string;
	status: SruConnectionStatus;
	description?: string;
	/** User-assigned alias for `input`, if any. Presentational only. */
	inputAlias?: string;
	/** User-assigned alias for `output`, if any. Presentational only. */
	outputAlias?: string;
};

// --- Pure transformation functions ---

/**
 * The single definition of a connection's Default/Modified status: an input
 * is modified when its routing differs from the SoC default, when its
 * polarity inversion is enabled, or both. Every badge in the SRU UI (routing
 * table, signal card, connection details) must resolve to this rule so that
 * "Modified" means the same thing everywhere it appears.
 *
 * Exported because the Connection Details panel has to evaluate the same
 * rule against staged routing that is not in the store yet, and so cannot
 * read {@link SruConnectionEntry.status} directly.
 */
export function getSruConnectionStatus(
	hasRoutingOverride: boolean,
	isInverted: boolean
): SruConnectionStatus {
	return hasRoutingOverride || isInverted ? 'modified' : 'default';
}

function buildConnectionEntries(
	connections: Record<string, string>,
	modified: Record<string, string>,
	inversions: Record<string, boolean>,
	descriptions: Record<string, string>,
	signalAliases: Record<string, string>
): SruConnectionEntry[] {
	return Object.entries(connections).map(([input, output]) => ({
		input,
		output,
		status: getSruConnectionStatus(
			input in modified,
			Boolean(inversions[input])
		),
		description: descriptions[input],
		inputAlias: signalAliases[input],
		outputAlias: signalAliases[output]
	}));
}

/**
 * Every input with a user override, as connection entries: a routing
 * override, an enabled polarity inversion, or both. `effectiveConnections`
 * resolves the output for inversion-only inputs, which have no entry of
 * their own in `modified`. Every entry is `'modified'` by construction
 * rather than by comparison against another map.
 */
function buildModifiedConnectionEntries(
	effectiveConnections: Record<string, string>,
	modified: Record<string, string>,
	inversions: Record<string, boolean>,
	descriptions: Record<string, string>,
	signalAliases: Record<string, string>
): SruConnectionEntry[] {
	const modifiedInputs = new Set([
		...Object.keys(modified),
		...Object.entries(inversions)
			.filter(([, inverted]) => inverted)
			.map(([input]) => input)
	]);

	return [...modifiedInputs].map(input => {
		const output = effectiveConnections[input];

		return {
			input,
			output,
			status: 'modified' as const,
			description: descriptions[input],
			inputAlias: signalAliases[input],
			outputAlias: signalAliases[output]
		};
	});
}

function indexByOutput(
	entries: SruConnectionEntry[]
): Record<string, SruConnectionEntry[]> {
	const byOutput: Record<string, SruConnectionEntry[]> = {};

	for (const entry of entries) {
		byOutput[entry.output] ??= [];
		byOutput[entry.output].push(entry);
	}

	return byOutput;
}

function indexByInput(
	entries: SruConnectionEntry[]
): Record<string, SruConnectionEntry> {
	return Object.fromEntries(
		entries.map(entry => [entry.input, entry])
	);
}

function filterConnectionEntries(
	entries: SruConnectionEntry[],
	filter: SruFilterState
): SruConnectionEntry[] {
	const search = filter.searchText.toLowerCase();

	return entries.filter(entry => {
		const statusMatches =
			filter.statusFilter === 'all' ||
			entry.status === filter.statusFilter;

		const searchMatches =
			!search ||
			entry.output.toLowerCase().includes(search) ||
			entry.input.toLowerCase().includes(search) ||
			entry.outputAlias?.toLowerCase().includes(search) === true ||
			entry.inputAlias?.toLowerCase().includes(search) === true;

		return statusMatches && searchMatches;
	});
}

// --- Base selectors ---

export const selectModifiedConnections = (
	state: RootState
): Record<string, string> => state.sruReducer.modifiedConnections;

export const selectUserDescriptions = (
	state: RootState
): Record<string, string> => state.sruReducer.userDescriptions;

export const selectSignalAliases = (
	state: RootState
): Record<string, string> => state.sruReducer.signalAliases;

export const selectSignalInversions = (
	state: RootState
): Record<string, boolean> => state.sruReducer.signalInversions;

export const selectLastRealSignal = (
	state: RootState
): Record<string, string> => state.sruReducer.lastRealSignal;

const selectRoutingFilter = (state: RootState) =>
	state.sruReducer.routingFilter;

export const selectConnectionsFilter = (state: RootState) =>
	state.sruReducer.connectionsFilter;

export const selectConnectionsSearchScope = (state: RootState) =>
	state.sruReducer.connectionsSearchScope;

const selectSelectedSignalGroupKey = (state: RootState) =>
	state.sruReducer.selectedSignalGroupKey;

const selectSelectionSequence = (state: RootState) =>
	state.sruReducer.selectionSequence;

const selectNavigationGroupReveal = (state: RootState) =>
	state.sruReducer.navigationGroupReveal;

const selectExpandedSignals = (state: RootState) =>
	state.sruReducer.expandedSignals;

// --- Derived selectors ---

const selectEffectiveConnections = createSelector(
	[selectModifiedConnections],
	(modified): Record<string, string> => ({
		...getSruDefaultConnections(),
		...modified
	})
);

export const selectModifiedConnectionEntries = createSelector(
	[
		selectEffectiveConnections,
		selectModifiedConnections,
		selectSignalInversions,
		selectUserDescriptions,
		selectSignalAliases
	],
	buildModifiedConnectionEntries
);

const selectConnectionEntries = createSelector(
	[
		selectEffectiveConnections,
		selectModifiedConnections,
		selectSignalInversions,
		selectUserDescriptions,
		selectSignalAliases
	],
	buildConnectionEntries
);

/**
 * Every connection grouped by the output signal it originates from. Outputs
 * with no connections are absent, which is what makes an output "unused".
 */
const selectConnectionsByOutput = createSelector(
	[selectConnectionEntries],
	indexByOutput
);

/**
 * Every connection keyed by its input signal. An input has at most one
 * connection, so this is a plain lookup rather than a list.
 */
export const selectConnectionByInput = createSelector(
	[selectConnectionEntries],
	indexByInput
);

// --- Hooks ---

export function useSruModifiedConnections() {
	return useAppSelector(selectModifiedConnectionEntries);
}

export function useSruModifiedConnectionsRaw() {
	return useAppSelector(selectModifiedConnections);
}

export function useSruConnections() {
	return useAppSelector(selectConnectionEntries);
}

export function useFilteredSruConnections(
	filter: SruFilterState
): SruConnectionEntry[] {
	const selector = useMemo(
		() =>
			createSelector([selectConnectionEntries], entries =>
				filterConnectionEntries(entries, filter)
			),
		[filter]
	);

	return useAppSelector(selector);
}

export function useSruRoutingFilter() {
	return useAppSelector(selectRoutingFilter);
}

export function useSruConnectionsFilter() {
	return useAppSelector(selectConnectionsFilter);
}

export function useSruConnectionsSearchScope() {
	return useAppSelector(selectConnectionsSearchScope);
}

export const useEditableConnections = ():
	| EditableConnection[]
	| undefined =>
	useAppSelector(state => state.sruReducer.editableConnections);

/** Returns the effective output source for a given input signal. */
export function useSruEffectiveSource(
	inputName: string
): string | undefined {
	const selector = useMemo(
		() =>
			createSelector(
				[selectEffectiveConnections],
				effective => effective[inputName]
			),
		[inputName]
	);

	return useAppSelector(selector);
}

/** Returns the user-provided description for a given input signal, if any. */
export function useSruUserDescription(
	inputName: string
): string | undefined {
	const selector = useMemo(
		() =>
			createSelector(
				[selectUserDescriptions],
				descriptions => descriptions[inputName]
			),
		[inputName]
	);

	return useAppSelector(selector);
}

/** Returns the user-assigned alias for a given signal name, if any. */
export function useSruSignalAlias(
	signalName: string
): string | undefined {
	const selector = useMemo(
		() =>
			createSelector(
				[selectSignalAliases],
				aliases => aliases[signalName]
			),
		[signalName]
	);

	return useAppSelector(selector);
}

/**
 * Returns whether hardware polarity inversion is enabled for a given SRU
 * input signal.
 */
export function useSruSignalInversion(inputName: string): boolean {
	const selector = useMemo(
		() =>
			createSelector(
				[selectSignalInversions],
				inversions => inversions[inputName] === true
			),
		[inputName]
	);

	return useAppSelector(selector);
}

/** Returns the full map of enabled SRU signal polarity inversions. */
export function useSruSignalInversions(): Record<string, boolean> {
	return useAppSelector(selectSignalInversions);
}

/**
 * Returns user-assigned aliases for the given signal names only, so callers
 * re-render on changes to those signals' aliases but not on changes
 * elsewhere in the alias map.
 */
export function useSruSignalAliasesFor(
	signalNames: readonly string[]
): Record<string, string> {
	const selector = useMemo(
		() =>
			createSelector(
				[selectSignalAliases],
				aliases => {
					const result: Record<string, string> = {};

					for (const name of signalNames) {
						if (aliases[name] !== undefined) {
							result[name] = aliases[name];
						}
					}

					return result;
				},
				{memoizeOptions: {resultEqualityCheck: shallowEqual}}
			),
		[signalNames]
	);

	return useAppSelector(selector);
}

/**
 * Returns the last real source remembered for an SRU input that supports
 * remember/restore, if any. Session-only state used to restore pin-buffer
 * direction and data-input connections.
 */
export function useSruLastRealSignal(
	inputName: string
): string | undefined {
	const selector = useMemo(
		() =>
			createSelector(
				[selectLastRealSignal],
				remembered => remembered[inputName]
			),
		[inputName]
	);

	return useAppSelector(selector);
}

/**
 * Returns user-provided descriptions for the given input signals only, so
 * callers re-render on changes to those inputs' descriptions but not on
 * changes elsewhere in the description map.
 */
export function useSruUserDescriptionsFor(
	inputNames: readonly string[]
): Record<string, string> {
	const selector = useMemo(
		() =>
			createSelector(
				[selectUserDescriptions],
				descriptions => {
					const result: Record<string, string> = {};

					for (const name of inputNames) {
						if (descriptions[name] !== undefined) {
							result[name] = descriptions[name];
						}
					}

					return result;
				},
				{memoizeOptions: {resultEqualityCheck: shallowEqual}}
			),
		[inputNames]
	);

	return useAppSelector(selector);
}

/**
 * Returns input signals whose effective source is the given output.
 *
 * Memoized on the effective connection map so the returned array keeps its
 * identity across unrelated dispatches - callers use it to seed component
 * state and would otherwise be reset on every store update.
 */
export function useSruConnectedInputs(outputName: string): string[] {
	const selector = useMemo(
		() =>
			createSelector([selectEffectiveConnections], effective =>
				Object.entries(effective)
					.filter(([, source]) => source === outputName)
					.map(([input]) => input)
			),
		[outputName]
	);

	return useAppSelector(selector);
}

export function useSruConnectionsByOutput() {
	return useAppSelector(selectConnectionsByOutput);
}

export function useSruConnectionByInput() {
	return useAppSelector(selectConnectionByInput);
}

export function useSruSelectedSignalGroupKey() {
	return useAppSelector(selectSelectedSignalGroupKey);
}

/**
 * Increases on every selection action, even repeat selections of the
 * already-selected signal group. See `SruState.selectionSequence`.
 */
export function useSruSelectionSequence() {
	return useAppSelector(selectSelectionSequence);
}

export function useSruNavigationGroupReveal() {
	return useAppSelector(selectNavigationGroupReveal);
}

export function useSruExpandedSignals() {
	return useAppSelector(selectExpandedSignals);
}
