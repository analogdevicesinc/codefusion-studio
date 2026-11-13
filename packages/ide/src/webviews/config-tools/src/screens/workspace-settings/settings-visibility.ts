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
	getProjectInfoList,
	getSupportsFirewall,
	getSupportsMCUboot
} from '../../utils/config';

/**
 * Computes visibility for each settings child by its SIDEBAR_SECTIONS key.
 *
 * Kept free of `settings-pages` and the sidebar hook so both the hook and
 * the section components can consume it without a circular import.
 *
 * @returns Map of child key to whether it should be shown.
 */
export function getSettingsChildVisibility(): Record<
	string,
	boolean
> {
	const projects = getProjectInfoList();
	const hasZephyrProject =
		projects?.some(p => p.FirmwarePlatform === 'zephyr') ?? false;
	const isMcubootSupported = hasZephyrProject && getSupportsMCUboot();
	const isFirewallSupported = getSupportsFirewall();

	return {
		'firewall-status': isFirewallSupported,
		'mcuboot-config': isMcubootSupported,
		'key-management': isMcubootSupported
	};
}

/**
 * @param key SIDEBAR_SECTIONS child key.
 * @returns `true` when the child has no rule or its rule allows it.
 */
export function isSettingsChildVisible(key: string): boolean {
	return getSettingsChildVisibility()[key] ?? true;
}
