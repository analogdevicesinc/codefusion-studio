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
import {createSlice, type PayloadAction} from '@reduxjs/toolkit';
import {
	getSruDefaultConnections,
	getSruInputSignals
} from '../../../utils/sru';
import {
	isPbenBidirectionalSource,
	isPinBufferDataSource
} from '../../../utils/sru-signals';
import type {SruInputSignal, SruOutputSignal} from 'cfs-types';
import type {EditableConnection} from '../../../types/sru';
import {
	SRU_SEARCH_SCOPES,
	type SruSearchScope
} from '../../../screens/signal-routing-unit/connections/constants/search-scope';
import type {SruNavigationSection} from '../../../utils/sru-navigation';

/** Returns a copy of `record` with `key` removed. */
function omitKey<T>(
	record: Record<string, T>,
	key: string
): Record<string, T> {
	return Object.fromEntries(
		Object.entries(record).filter(([k]) => k !== key)
	);
}

export type SruConnectionStatus = 'default' | 'modified';

export type SruFilterState = {
	searchText: string;
	statusFilter: SruConnectionStatus | 'all';
};

export type SruNavigationGroupReveal = {
	sectionKind: SruNavigationSection['kind'];
	group: string;
	sequence: number;
};

const defaultFilterState: SruFilterState = {
	searchText: '',
	statusFilter: 'all'
};

type SruState = {
	/** User-modified connections, keyed by input signal name. Only contains overrides. */
	modifiedConnections: Record<string, string>;
	/** User-provided descriptions for input signals, keyed by input signal name. */
	userDescriptions: Record<string, string>;
	/**
	 * User-assigned display aliases, keyed by signal name (input or output).
	 * Purely presentational - never used for routing or codegen, and
	 * unaffected by `resetSruConnection` since an alias belongs to the
	 * signal's identity, not to a particular connection.
	 */
	signalAliases: Record<string, string>;
	/**
	 * Whether hardware polarity inversion is enabled for an SRU input,
	 * keyed by input signal name. Only contains `true` entries. Deliberately
	 * excluded from `connectionOverrideKeys`: deleting a connection or
	 * de-selecting an input in the output panel must not silently flip its
	 * polarity back to Normal. Only the Reset control
	 * (`resetSruConnectionWithUndo`) clears it, explicitly and with Undo
	 * support, alongside the routing reset it already performs.
	 */
	signalInversions: Record<string, boolean>;
	/**
	 * Last real source routed to each SRU input that supports remember/restore.
	 * Session-only: PBEN bidirectional sources and pin-buffer data inputs.
	 * Keyed by input name.
	 */
	lastRealSignal: Record<string, string>;
	connectionsFilter: SruFilterState;
	connectionsSearchScope: SruSearchScope;
	routingFilter: SruFilterState;
	editableConnections?: EditableConnection[];
	/**
	 * Key of the SRU peripheral signal group selected in the Connections side
	 * panel, or undefined when nothing is selected. See
	 * `SruPeripheralSignalGroup.key`.
	 */
	selectedSignalGroupKey?: string;
	/**
	 * Increases on every `setSelectedSignalGroup` dispatch, even when the
	 * selected key doesn't actually change value. `selectedSignalGroupKey`
	 * alone can't signal "the user selected something again" for a repeat
	 * selection of the same key, since its value is unchanged - this gives
	 * consumers (e.g. re-opening a manually-collapsed accordion when its
	 * already-selected row is clicked again, or re-scrolling a focused
	 * signal card into view) a value that's guaranteed to change on every
	 * selection action.
	 */
	selectionSequence: number;
	/**
	 * Most recent request to reveal a top-level Connections navigation group.
	 * The sequence changes for repeat requests so a manually collapsed group
	 * can be reopened without changing the selected main-panel signal group.
	 */
	navigationGroupReveal?: SruNavigationGroupReveal;
	/**
	 * Names of the SRU signals whose Connections cards are expanded. SRU
	 * signal names are unique across the SoC, so this needs no signal-group
	 * scoping.
	 */
	expandedSignals: string[];
};

/**
 * The per-input override maps that `resetSruConnection` clears and
 * `restoreSruConnection` restores. Both reducers iterate this list
 * instead of naming each map separately, so they can't drift out of
 * sync with each other. Adding a new per-input override to `SruState`
 * requires adding its key here - that's the only place to remember -
 * *unless* the override should survive a connection delete/de-select and
 * be cleared only by the Reset control, like `signalInversions`; see its
 * doc comment on `SruState`.
 */
const connectionOverrideKeys = [
	'modifiedConnections',
	'userDescriptions',
	'lastRealSignal'
] as const satisfies ReadonlyArray<keyof SruState>;

type ConnectionOverrideKey = (typeof connectionOverrideKeys)[number];

export const sruInitialState: SruState = {
	modifiedConnections: {},
	userDescriptions: {},
	signalAliases: {},
	signalInversions: {},
	lastRealSignal: {},
	connectionsFilter: defaultFilterState,
	connectionsSearchScope: SRU_SEARCH_SCOPES.PIN_BUFFERS,
	routingFilter: defaultFilterState,
	editableConnections: undefined,
	selectedSignalGroupKey: undefined,
	selectionSequence: 0,
	navigationGroupReveal: undefined,
	expandedSignals: []
};

const sruSlice = createSlice({
	name: 'sru',
	initialState: sruInitialState,
	reducers: {
		setSruConnection(
			state,
			{payload}: PayloadAction<{input: string; source: string}>
		) {
			if (
				payload.source === getSruDefaultConnections()[payload.input]
			) {
				state.modifiedConnections = omitKey(
					state.modifiedConnections,
					payload.input
				);
			} else {
				state.modifiedConnections[payload.input] = payload.source;
			}

			if (
				isPbenBidirectionalSource(
					getSruInputSignals()[payload.input],
					payload.source
				) ||
				isPinBufferDataSource(
					getSruInputSignals()[payload.input],
					payload.source
				)
			) {
				state.lastRealSignal[payload.input] = payload.source;
			}
		},
		resetSruConnection(state, {payload}: PayloadAction<string>) {
			for (const key of connectionOverrideKeys) {
				state[key] = omitKey(state[key], payload);
			}
		},
		restoreSruConnection(
			state,
			{
				payload
			}: PayloadAction<
				{input: string} & Partial<
					Record<ConnectionOverrideKey, string>
				>
			>
		) {
			// `undefined` for a given key means the input had no entry in
			// that map before the reset (not "set it to undefined") - the
			// key is deleted rather than written, mirroring
			// `resetSruConnection`.
			for (const key of connectionOverrideKeys) {
				const value = payload[key];

				state[key] =
					value === undefined
						? omitKey(state[key], payload.input)
						: {...state[key], [payload.input]: value};
			}
		},
		setUserDescription(
			state,
			{payload}: PayloadAction<{input: string; description: string}>
		) {
			if (payload.description) {
				state.userDescriptions[payload.input] = payload.description;
			} else {
				state.userDescriptions = omitKey(
					state.userDescriptions,
					payload.input
				);
			}
		},
		setSignalAlias(
			state,
			{payload}: PayloadAction<{signalName: string; alias: string}>
		) {
			const alias = payload.alias.trim();

			if (alias) {
				state.signalAliases[payload.signalName] = alias;
			} else {
				state.signalAliases = omitKey(
					state.signalAliases,
					payload.signalName
				);
			}
		},
		setSignalInversion(
			state,
			{payload}: PayloadAction<{input: string; inverted: boolean}>
		) {
			if (payload.inverted) {
				state.signalInversions[payload.input] = true;
			} else {
				state.signalInversions = omitKey(
					state.signalInversions,
					payload.input
				);
			}
		},
		setRoutingFilter(
			state,
			{payload}: PayloadAction<Partial<SruFilterState>>
		) {
			state.routingFilter = {...state.routingFilter, ...payload};
		},
		clearRoutingFilter(state) {
			state.routingFilter = {searchText: '', statusFilter: 'all'};
		},
		setConnectionsFilter(
			state,
			{payload}: PayloadAction<Partial<SruFilterState>>
		) {
			state.connectionsFilter = {
				...state.connectionsFilter,
				...payload
			};
		},
		setSruConnectionsSearchScope(
			state,
			{payload}: PayloadAction<SruSearchScope>
		) {
			state.connectionsSearchScope = payload;
		},
		selectSruInput(
			state,
			{
				payload
			}: PayloadAction<{
				peripheralName: string;
				input: SruInputSignal;
			}>
		) {
			state.editableConnections = [
				{
					peripheralName: payload.peripheralName,
					input: payload.input
				}
			];
		},
		selectSruOutput(
			state,
			{
				payload
			}: PayloadAction<{
				peripheralName: string;
				output: SruOutputSignal;
			}>
		) {
			state.editableConnections = [
				{
					peripheralName: payload.peripheralName,
					output: payload.output
				}
			];
		},
		clearEditableConnections(state) {
			state.editableConnections = undefined;
		},
		setSelectedSignalGroup(
			state,
			{payload}: PayloadAction<string | undefined>
		) {
			state.selectedSignalGroupKey = payload;
			state.selectionSequence++;
			// Close any stale detail panel left open from a previously
			// selected signal. Signal-selecting callers that also want the
			// panel open for a new signal dispatch `selectSruInput`/
			// `selectSruOutput` immediately after in the same handler.
			state.editableConnections = undefined;
		},
		revealNavigationGroup(
			state,
			{
				payload
			}: PayloadAction<Omit<SruNavigationGroupReveal, 'sequence'>>
		) {
			state.navigationGroupReveal = {
				...payload,
				sequence: (state.navigationGroupReveal?.sequence ?? 0) + 1
			};
		},
		clearNavigationGroupReveal(state) {
			state.navigationGroupReveal = undefined;
		},
		toggleSignalExpanded(state, {payload}: PayloadAction<string>) {
			state.expandedSignals = state.expandedSignals.includes(payload)
				? state.expandedSignals.filter(name => name !== payload)
				: [...state.expandedSignals, payload];
		},
		setExpandedSignals(state, {payload}: PayloadAction<string[]>) {
			state.expandedSignals = payload;
		}
	}
});

export const {
	setSruConnection,
	resetSruConnection,
	restoreSruConnection,
	setUserDescription,
	setSignalAlias,
	setSignalInversion,
	setRoutingFilter,
	clearRoutingFilter,
	setConnectionsFilter,
	setSruConnectionsSearchScope,
	selectSruInput,
	selectSruOutput,
	clearEditableConnections,
	setSelectedSignalGroup,
	revealNavigationGroup,
	clearNavigationGroupReveal,
	toggleSignalExpanded,
	setExpandedSignals
} = sruSlice.actions;
export const sruReducer = sruSlice.reducer;
