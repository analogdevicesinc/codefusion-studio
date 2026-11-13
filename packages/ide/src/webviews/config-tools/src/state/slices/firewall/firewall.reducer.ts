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
	type FirewallStatusOption,
	type FirewallZone,
	type FirewallState,
	type ResponderConfig,
	type ResponderConfigTarget
} from '../../../types/firewall';
import {getFirewallZoneAccessMode} from '../../../screens/firewall-config/firewall-zones/constants';
import {
	type FirewallColumn,
	getDefaultResponderStartAddress,
	getEntryKey,
	getMemoryRegionResponderKeys
} from '../../../screens/firewall-config/firewall-data';

export const firewallInitialState: FirewallState = {
	firewallStatus: 'enabled',
	firewallBinaryFilePath: '',
	firewallZones: [],
	activeZoneId: undefined,
	firewallZoneSearchQuery: '',
	manageFirewallsView: false,
	manageFirewallsColumn: 'initiators',
	activeResponderConfig: undefined,
	responderConfigs: {}
};

/**
 * Removes responder config overrides that are no longer referenced by any zone,
 * clearing the active responder config when it points at a pruned responder.
 * Run this whenever zone selections are replaced or a zone is deleted.
 */
function pruneUnreferencedResponderConfigs(state: FirewallState) {
	for (const key of Object.keys(state.responderConfigs)) {
		const stillReferenced = state.firewallZones.some(zone =>
			zone.selectedFirewalls?.includes(key)
		);

		if (stillReferenced) continue;

		if (
			state.activeResponderConfig &&
			getEntryKey(
				'responders',
				state.activeResponderConfig.parent,
				state.activeResponderConfig.child
			) === key
		) {
			state.activeResponderConfig = undefined;
		}

		// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
		delete state.responderConfigs[key];
	}
}

/**
 * Programmable-region responders have no address in the data model, so their
 * default is recorded as soon as they are added to a zone rather than waiting
 * for the configuration panel to be opened.
 */
function seedMemoryRegionStartAddresses(
	state: FirewallState,
	selectedFirewalls: string[]
) {
	const defaultAddress = getDefaultResponderStartAddress();

	if (!defaultAddress) return;

	const selected = new Set(selectedFirewalls);

	getMemoryRegionResponderKeys().forEach(key => {
		if (
			!selected.has(key) ||
			state.responderConfigs[key]?.startAddress
		)
			return;

		state.responderConfigs[key] = {
			...state.responderConfigs[key],
			startAddress: defaultAddress
		};
	});
}

const firewallSlice = createSlice({
	name: 'firewall',
	initialState: firewallInitialState,
	reducers: {
		setFirewallStatus(
			state,
			{payload}: PayloadAction<FirewallStatusOption>
		) {
			state.firewallStatus = payload;
		},
		setFirewallBinaryFilePath(
			state,
			{payload}: PayloadAction<string>
		) {
			state.firewallBinaryFilePath = payload;
		},
		addFirewallZone(state, {payload}: PayloadAction<FirewallZone>) {
			const zone: FirewallZone = {
				...payload,
				accessMode: getFirewallZoneAccessMode(payload.accessModes)
			};
			state.firewallZones = [...state.firewallZones, zone];
			state.activeZoneId = zone.id;
		},
		removeFirewallZone(
			state,
			{payload}: PayloadAction<{id: string}>
		) {
			state.firewallZones = state.firewallZones.filter(
				zone => zone.id !== payload.id
			);

			pruneUnreferencedResponderConfigs(state);

			if (state.activeZoneId === payload.id) {
				state.activeZoneId = state.firewallZones[0]?.id;
			}

			if (state.firewallZones.length === 0) {
				state.firewallZoneSearchQuery = '';
			}
		},
		setActiveZoneId(
			state,
			{payload}: PayloadAction<string | undefined>
		) {
			state.activeZoneId = payload;
		},
		updateFirewallZone(
			state,
			{
				payload
			}: PayloadAction<{
				id: string;
				updates: Partial<Omit<FirewallZone, 'id' | 'accessMode'>>;
			}>
		) {
			const zone = state.firewallZones.find(z => z.id === payload.id);

			if (zone) {
				Object.assign(zone, payload.updates);
				zone.accessMode = getFirewallZoneAccessMode(zone.accessModes);

				if (payload.updates.selectedFirewalls) {
					seedMemoryRegionStartAddresses(
						state,
						payload.updates.selectedFirewalls
					);
				}
			}

			// Replacing a zone's selection can orphan responder overrides.
			if (payload.updates.selectedFirewalls) {
				pruneUnreferencedResponderConfigs(state);
			}
		},
		setFirewallZoneSearchQuery(
			state,
			{payload}: PayloadAction<string>
		) {
			state.firewallZoneSearchQuery = payload;
		},
		setManageFirewallsView(state, {payload}: PayloadAction<boolean>) {
			state.manageFirewallsView = payload;
		},
		setManageFirewallsColumn(
			state,
			{payload}: PayloadAction<'initiators' | 'responders'>
		) {
			state.manageFirewallsColumn = payload;
		},
		setActiveResponderConfig(
			state,
			{payload}: PayloadAction<ResponderConfigTarget | undefined>
		) {
			state.activeResponderConfig = payload;
		},
		removeFirewallEntry(
			state,
			{
				payload
			}: PayloadAction<{
				id: string;
				column: FirewallColumn;
				parent: string;
				child: string;
			}>
		) {
			const zone = state.firewallZones.find(z => z.id === payload.id);

			if (!zone) return;

			const key = getEntryKey(
				payload.column,
				payload.parent,
				payload.child
			);

			zone.selectedFirewalls = (zone.selectedFirewalls ?? []).filter(
				entry => entry !== key
			);

			if (payload.column !== 'responders') return;

			// A per-zone removal always closes the sidebar for that responder,
			// even when another zone still references it.
			if (
				state.activeResponderConfig?.parent === payload.parent &&
				state.activeResponderConfig?.child === payload.child
			) {
				state.activeResponderConfig = undefined;
			}

			pruneUnreferencedResponderConfigs(state);
		},
		updateResponderConfig(
			state,
			{
				payload
			}: PayloadAction<{
				parent: string;
				child: string;
				updates: Partial<ResponderConfig>;
			}>
		) {
			const key = getEntryKey(
				'responders',
				payload.parent,
				payload.child
			);
			state.responderConfigs[key] = {
				...state.responderConfigs[key],
				...payload.updates
			};
		}
	}
});

export const {
	setFirewallStatus,
	setFirewallBinaryFilePath,
	addFirewallZone,
	removeFirewallZone,
	setActiveZoneId,
	updateFirewallZone,
	setFirewallZoneSearchQuery,
	setManageFirewallsView,
	setManageFirewallsColumn,
	setActiveResponderConfig,
	removeFirewallEntry,
	updateResponderConfig
} = firewallSlice.actions;
export const firewallReducer = firewallSlice.reducer;
