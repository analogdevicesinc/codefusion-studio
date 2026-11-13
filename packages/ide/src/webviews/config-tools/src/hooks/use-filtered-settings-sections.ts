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

import {SIDEBAR_SECTIONS} from '../constants/workspace-settings';
import {SETTINGS_PAGES} from '../screens/workspace-settings/settings-pages';
import {getSettingsChildVisibility} from '../screens/workspace-settings/settings-visibility';

/**
 * Filters settings sidebar sections, their children, and page components.
 *
 * Visibility is decided per child rather than per section, since the
 * "Security" section groups controls with different conditions:
 *  - Firewall settings show when the SoC supports Firewall.
 *  - MCUboot settings and Sign Key Management show when a Zephyr project
 *    exists and the SoC is MCUboot-supported.
 *
 * A section is shown only when it has at least one visible child.
 *
 * @returns Filtered sidebar sections (with filtered children), settings
 *   pages, and an `isChildVisible` predicate for individual child keys.
 */
export default function useFilteredSettingsSections() {
	const childVisibility = getSettingsChildVisibility();

	const isChildVisible = (key: string) =>
		childVisibility[key] ?? true;

	const filteredSections = SIDEBAR_SECTIONS.map(section => ({
		...section,
		children: section.children.filter(child =>
			isChildVisible(child.key)
		)
	})).filter(section => section.children.length > 0);

	const visibleSectionKeys = new Set(
		filteredSections.map(section => section.key)
	);

	const filteredPages = SETTINGS_PAGES.filter(page =>
		visibleSectionKeys.has(page.key)
	);

	return {filteredSections, filteredPages, isChildVisible};
}
