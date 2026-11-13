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

import {type FirewallColumn} from '../../screens/firewall-config/firewall-data';
import {type FirewallZone} from '../../types/firewall';
import {logTelemetryEvent} from '../../utils/api';
import {type RootState} from '../store';
import {CONFIG_TOOLS_TELEMETRY_ACTIONS} from './telemetry-reporter';

export type FirewallEntryRemovedPayload = {
	id: string;
	column: FirewallColumn;
	parent: string;
	child: string;
};

export type FirewallZoneUpdatePayload = {
	id: string;
	updates: Partial<Omit<FirewallZone, 'id' | 'accessMode'>>;
};

export function reportFirewallZoneAdded(): void {
	void logTelemetryEvent(
		CONFIG_TOOLS_TELEMETRY_ACTIONS.FIREWALL_ZONE_CREATED
	);
}

export function reportFirewallEntryRemoved(
	payload: FirewallEntryRemovedPayload
): void {
	void logTelemetryEvent(
		getFirewallChangeEvents()[payload.column].removed,
		{count: 1}
	);
}

export function reportFirewallZoneUpdated(
	payload: FirewallZoneUpdatePayload,
	originalState: RootState
): void {
	const {id, updates} = payload;

	const zone = originalState.firewallReducer.firewallZones.find(
		zone => zone.id === id
	);

	if (!zone) {
		return;
	}

	if (updates.accessModes) {
		void logTelemetryEvent(
			CONFIG_TOOLS_TELEMETRY_ACTIONS.ACCESS_MODES_CONFIGURED,
			updates.accessModes
		);
	}

	if (updates.selectedFirewalls) {
		reportFirewallChanges(
			zone.selectedFirewalls ?? [],
			updates.selectedFirewalls
		);
	}
}

function reportFirewallChanges(
	initialFirewalls: string[],
	updatedFirewalls: string[]
): void {
	for (const [column, events] of Object.entries(
		getFirewallChangeEvents()
	)) {
		const prefix = `${column}::`;
		const isKeyInColumn = (key: string) => key.startsWith(prefix);

		const addedCount = updatedFirewalls.filter(
			key => isKeyInColumn(key) && !initialFirewalls.includes(key)
		).length;

		const removedCount = initialFirewalls.filter(
			key => isKeyInColumn(key) && !updatedFirewalls.includes(key)
		).length;

		if (addedCount > 0) {
			void logTelemetryEvent(events.added, {count: addedCount});
		}

		if (removedCount > 0) {
			void logTelemetryEvent(events.removed, {count: removedCount});
		}
	}
}

function getFirewallChangeEvents(): Record<
	FirewallColumn,
	{added: string; removed: string}
> {
	return {
		initiators: {
			added: CONFIG_TOOLS_TELEMETRY_ACTIONS.INITIATOR_ADDED,
			removed: CONFIG_TOOLS_TELEMETRY_ACTIONS.INITIATOR_REMOVED
		},
		responders: {
			added: CONFIG_TOOLS_TELEMETRY_ACTIONS.RESPONDER_ADDED,
			removed: CONFIG_TOOLS_TELEMETRY_ACTIONS.RESPONDER_REMOVED
		}
	};
}
