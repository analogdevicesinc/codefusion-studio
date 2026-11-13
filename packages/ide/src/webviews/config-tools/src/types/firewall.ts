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

export type FirewallStatusOption =
	| 'enabled'
	| 'overrideAllBlocked'
	| 'overrideAllOpen';

export type FirewallZoneAccessMode =
	| 'open'
	| 'restricted'
	| 'blocked';

export type FirewallZoneAccessModeId =
	| 'nonSecureNonPrivileged'
	| 'nonSecurePrivileged'
	| 'secureNonPrivileged'
	| 'securePrivileged';

export type FirewallZone = {
	id: string;
	name: string;
	description: string;
	accessMode: FirewallZoneAccessMode;
	accessModes: Record<FirewallZoneAccessModeId, boolean>;
	/**
	 * Selected initiator/responder entry keys for this zone, in the form
	 * `column::parent::child` (see `getEntryKey`).
	 */
	selectedFirewalls?: string[];
};

/**
 * Identifies the responder whose configuration sidebar is currently open.
 */
export type ResponderConfigTarget = {
	parent: string;
	child: string;
};

/**
 * Editable configuration values for a responder, keyed by its entry key
 * (`column::parent::child`, see `getEntryKey`). Persisted in the Firewall
 * slice until the responder data model provides real values.
 */
export type ResponderConfig = {
	name?: string;
	description?: string;
	startAddress?: string;
};

export type FirewallState = {
	firewallStatus: FirewallStatusOption;
	firewallBinaryFilePath: string;
	firewallZones: FirewallZone[];
	activeZoneId: string | undefined;
	firewallZoneSearchQuery: string;
	manageFirewallsView: boolean;
	manageFirewallsColumn: 'initiators' | 'responders';
	activeResponderConfig: ResponderConfigTarget | undefined;
	responderConfigs: Record<string, ResponderConfig>;
};
