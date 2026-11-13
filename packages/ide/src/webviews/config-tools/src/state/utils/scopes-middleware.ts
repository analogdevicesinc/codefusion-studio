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
import {
	type ActionCreatorWithPayload,
	createListenerMiddleware
} from '@reduxjs/toolkit';
import type {RootState} from '../store';
import {CONTROL_SCOPES} from '../../constants/scopes';
import {
	setAppliedSignal,
	removeAppliedSignal,
	updateAppliedSignal,
	setAppliedSignalControlValue,
	setResetControlValues
} from '../slices/pins/pins.reducer';
import {
	createPartition,
	editPartition,
	removePartition
} from '../slices/partitions/partitions.reducer';
import {
	setPeripheralAssignment,
	setSignalAssignment,
	setSignalGroupAssignment,
	setPeripheralDescription,
	setSignalDescription,
	setPeripheralConfig,
	removePeripheralAssignment,
	removeSignalAssignment
} from '../slices/peripherals/peripherals.reducer';
import {
	addNewStream,
	removeStream,
	updateGasketOptions,
	updateStream
} from '../slices/gaskets/gasket.reducer';
import {
	formatPinPersistencePayload,
	formatProjectPersistencePayload
} from '../../utils/persistence';
import {
	buildScopesDictionary,
	type ScopesConfig
} from '../../utils/scopes';
import {
	type ScopesDictionary,
	setScopes
} from '../slices/scopes/scopes.reducer';
import {formatDfgStreamsForPersistence} from './dfg-persistence-middleware';

export const scopedValueActions: Array<
	ActionCreatorWithPayload<any>
> = [
	setAppliedSignal,
	removeAppliedSignal,
	updateAppliedSignal,
	setAppliedSignalControlValue,
	setResetControlValues,
	createPartition,
	editPartition,
	removePartition,
	setPeripheralAssignment,
	removePeripheralAssignment,
	removeSignalAssignment,
	setPeripheralConfig,
	setSignalAssignment,
	setSignalGroupAssignment,
	setPeripheralDescription,
	setSignalDescription,
	updateStream,
	addNewStream,
	removeStream,
	updateGasketOptions
];

const DEBOUNCE_MS = 50;

const DYNAMIC_SCOPE_CONTROL_SCOPES = [
	CONTROL_SCOPES.MEMORY,
	CONTROL_SCOPES.PERIPHERAL,
	CONTROL_SCOPES.PIN_CONFIG,
	CONTROL_SCOPES.DFG
] as const;

type DynamicScopeControlScope =
	(typeof DYNAMIC_SCOPE_CONTROL_SCOPES)[number];

function isDynamicScopeControlScope(
	controlScope: string
): controlScope is DynamicScopeControlScope {
	return DYNAMIC_SCOPE_CONTROL_SCOPES.some(
		scope => scope === controlScope
	);
}

function replaceScopeEntriesByControlScope({
	currentScopes,
	updatedScopes,
	controlScopes
}: {
	currentScopes: ScopesDictionary;
	updatedScopes: ScopesDictionary;
	controlScopes: readonly string[];
}): ScopesDictionary {
	const controlScopeSet = new Set(controlScopes);
	const nextScopes: ScopesDictionary = {};

	for (const [scopeKey, values] of Object.entries(currentScopes)) {
		for (const [value, entries] of Object.entries(values)) {
			const retainedEntries = entries.filter(
				entry => !controlScopeSet.has(entry.controlScope)
			);

			if (!retainedEntries.length) continue;

			nextScopes[scopeKey] ??= {};
			nextScopes[scopeKey][value] = retainedEntries;
		}
	}

	for (const [scopeKey, values] of Object.entries(updatedScopes)) {
		for (const [value, entries] of Object.entries(values)) {
			nextScopes[scopeKey] ??= {};
			nextScopes[scopeKey][value] ??= [];
			nextScopes[scopeKey][value].push(...entries);
		}
	}

	return nextScopes;
}

function buildCurrentConfigOptionsFromState(
	state: RootState
): ScopesConfig {
	const projects = formatProjectPersistencePayload(
		state.partitionsReducer.partitions,
		state.peripheralsReducer.assignments,
		state.pinsReducer.pins
	);

	const pins = formatPinPersistencePayload(state.pinsReducer.pins);

	const streams = formatDfgStreamsForPersistence(
		state.gasketsReducer.Streams
	);

	const gaskets = state.gasketsReducer.GasketOptions;

	const configOptions: ScopesConfig = {
		Projects: projects,
		Pins: pins,
		ClockNodes: [],
		DFG: {
			Streams: streams,
			Gaskets: gaskets
		}
	};

	return configOptions;
}

export function getScopesListenerMiddleware(
	actionsArray: Array<ActionCreatorWithPayload<unknown>>
) {
	const listenerMiddleware = createListenerMiddleware();

	listenerMiddleware.startListening({
		predicate: action =>
			actionsArray.some(actionCreator => actionCreator.match(action)),
		async effect(_, listenerApi) {
			listenerApi.cancelActiveListeners();

			await listenerApi.delay(DEBOUNCE_MS);

			const state = listenerApi.getState() as RootState;

			const controlsByProjectScope =
				state.scopesReducer.controlsByProjectScope.filter(entry =>
					isDynamicScopeControlScope(entry.controlScope)
				);

			const updatedScopes = buildScopesDictionary(
				controlsByProjectScope,
				buildCurrentConfigOptionsFromState(state)
			);

			const scopes = replaceScopeEntriesByControlScope({
				currentScopes: state.scopesReducer.scopes,
				updatedScopes,
				controlScopes: DYNAMIC_SCOPE_CONTROL_SCOPES
			});

			listenerApi.dispatch(setScopes(scopes));
		}
	});

	return [listenerMiddleware.middleware];
}
