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
	SocFirewall,
	SocFirewallInitiator,
	SocFirewallResponderGroup,
	SocMultiFormatInteger
} from 'cfs-types';

let firewall: SocFirewall | undefined;

/**
 * Stores the firewall section of the SoC data model for the lifetime of the
 * session. Called once during system planner initialization.
 * @param socFirewall The firewall definition from the SoC data model.
 */
export function initializeFirewall(socFirewall?: SocFirewall) {
	firewall = socFirewall;
}

/**
 * @returns `true` when the loaded SoC defines firewalls.
 */
export function hasFirewallSupport(): boolean {
	return firewall !== undefined;
}

/**
 * @returns The initiators defined by the SoC, as a flat list.
 */
export function getSocFirewallInitiators(): SocFirewallInitiator[] {
	return firewall?.Initiators ?? [];
}

/**
 * @returns The responder groups defined by the SoC.
 */
export function getSocFirewallResponderGroups(): SocFirewallResponderGroup[] {
	return firewall?.ResponderGroups ?? [];
}

/**
 * Normalizes an address the data model may express as either a number or a
 * `0x`-prefixed string into a lower-case `0x`-prefixed hex string.
 *
 * Addresses are compared with exact string equality when resolving region
 * information, so every address has to pass through here to be comparable.
 * @param value The address to format.
 * @returns The formatted address, or `undefined` when there is no value.
 */
export function formatSocAddress(
	value: SocMultiFormatInteger | undefined
): string | undefined {
	if (value === undefined) return undefined;

	if (typeof value === 'number') {
		return `0x${value.toString(16)}`;
	}

	return `0x${value.replace(/^0x/i, '').toLowerCase()}`;
}
