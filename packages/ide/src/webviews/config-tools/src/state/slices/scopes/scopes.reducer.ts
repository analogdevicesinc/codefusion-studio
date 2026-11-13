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
import {type PayloadAction, createSlice} from '@reduxjs/toolkit';
import {type ControlsByProjectScope} from '../../../utils/scopes';

export type ScopeId = string;
export type ScopeValue = string;

export type ScopeValueUsage = {
	groupId: string;
	controlId: string;
	value: string;
	controlScope: string;
	projectId: string;
	coreId: string;

	/**
	 * Original plugin-provided scope.
	 * Example: "${CoreId} C identifiers"
	 */
	scope: string;

	/**
	 * Resolved validation bucket.
	 * Example: "CM4 C identifiers"
	 */
	scopeKey: string;

	/**
	 * Identifies the configured item that produced this value.
	 * Examples:
	 * - "Peripherals.I2S.Config.TX_BUFFER_NAME"
	 * - "Partitions.m4_flash.Config.NAME_OVERRIDE"
	 * - "ClockNodes.SYS_OSC Mux.MUX"
	 */
	configPath?: string;

	/**
	 * Concrete item name, meant for UI messages.
	 * Examples: "I2S", "m4_flash", "P0.18"
	 */
	itemId?: string;
};

export type ScopesDictionary = Record<
	ScopeId,
	Record<ScopeValue, ScopeValueUsage[]>
>;

export type ScopeConflict = {
	scopeKey: string;
	value: string;
	entries: ScopeValueUsage[];
};

type ScopesState = {
	scopes: ScopesDictionary;

	/**
	 * Static scoped control metadata fetched during preload.
	 * Used to rebuild the scope dictionary when persisted config values change.
	 */
	controlsByProjectScope: ControlsByProjectScope;
};

export const scopesInitialState: ScopesState = {
	scopes: {},
	controlsByProjectScope: []
};

const scopesSlice = createSlice({
	name: 'Scopes',
	initialState: scopesInitialState,
	reducers: {
		setScopes(state, {payload}: PayloadAction<ScopesDictionary>) {
			state.scopes = payload;
		},
		setControlsByProjectScope(
			state,
			{payload}: PayloadAction<ControlsByProjectScope>
		) {
			state.controlsByProjectScope = payload;
		},
		setScopesState(
			state,
			{
				payload
			}: PayloadAction<{
				scopes: ScopesDictionary;
				controlsByProjectScope: ControlsByProjectScope;
			}>
		) {
			state.scopes = payload.scopes;
			state.controlsByProjectScope = payload.controlsByProjectScope;
		},
		clearScopes(state) {
			state.scopes = {};
			state.controlsByProjectScope = [];
		}
	}
});

export const {
	setScopes,
	setControlsByProjectScope,
	setScopesState,
	clearScopes
} = scopesSlice.actions;

export const scopesReducer = scopesSlice.reducer;
