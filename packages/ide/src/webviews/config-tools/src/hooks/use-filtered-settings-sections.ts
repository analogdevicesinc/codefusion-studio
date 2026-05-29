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
	getSupportsMCUboot
} from '../utils/config';
import {SIDEBAR_SECTIONS} from '../constants/workspace-settings';
import {SETTINGS_PAGES} from '../screens/workspace-settings/settings-pages';

/**
 * Filters settings sidebar sections and page components.
 *
 * Currently, the only conditional section is "Security", which is shown if:
 *  a Zephyr project exists and the SoC is MCUboot-supported.
 *
 * @returns Object containing filtered sidebar sections and settings pages.
 */
export default function useFilteredSettingsSections() {
	const projects = getProjectInfoList();
	const hasZephyrProject =
		projects?.some(p => p.FirmwarePlatform === 'zephyr') ?? false;
	const isSupportedSoc = getSupportsMCUboot();

	const visibility: Record<string, boolean> = {
		security: hasZephyrProject && isSupportedSoc
	};

	const filteredSections = SIDEBAR_SECTIONS.filter(
		section => visibility[section.key] ?? true
	);

	const filteredPages = SETTINGS_PAGES.filter(
		page => visibility[page.key] ?? true
	);

	return {filteredSections, filteredPages};
}
