/**
 *
 * Copyright (c) 2025-2026 Analog Devices, Inc.
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
import {navigationItems} from '../../../common/constants/navigation';
import {
	availableIcons,
	settingsIcon
} from '../constants/navigation-icons';
import {getAICores} from '../utils/ai-tools';
import {getClockNodeDictionary} from '../utils/clock-nodes';
import {
	getProjectInfoList,
	getSupportsMCUboot
} from '../utils/config';
import {getGasketDictionary} from '../utils/dfg';
import {getCoreMemoryDictionary} from '../utils/memory';
import {getSocPinDictionary} from '../utils/soc-pins';

/**
 * Determines which navigation icons should be displayed based on the current SoC and project data.
 *
 * The hook filters `availableIcons` by checking the presence or conditions of related system data:
 * - DFG icon: shown if any gaskets exist.
 * - Clock Config icon: shown if any clock nodes exist.
 * - Memory icon: shown if any core memory entries exist.
 * - Pinmux icon: shown if more than one SoC pin exists (to avoid dummy pin-only setups).
 * - AI Tools icon: shown if AI cores are present.
 * - MCUboot Config icon: shown if a Zephyr project exists and the SoC is in the supported list.
 * - Profiling icon: shown if any project targets the Zephyr firmware platform.
 * - Settings icon (footer): shown if a Zephyr project exists and the SoC is MCUboot-supported.
 *
 * @returns Object containing filtered main icons and footer icons.
 */
export default function useFilteredNavigationIcons() {
	const aiCores = getAICores();
	const projects = getProjectInfoList();
	const hasZephyrProject =
		projects?.some(p => p.FirmwarePlatform === 'zephyr') ?? false;
	const isSupportedSoc = getSupportsMCUboot();

	const filteredIcons = availableIcons.filter(icon => {
		if (icon.id === navigationItems.dfg) {
			return Object.keys(getGasketDictionary()).length;
		}

		if (icon.id === navigationItems.clockConfig) {
			return Object.keys(getClockNodeDictionary()).length;
		}

		if (icon.id === navigationItems.memory) {
			return Object.keys(getCoreMemoryDictionary()).length;
		}

		if (icon.id === navigationItems.pinmux) {
			// Only show pinmux if there is more than one pin in the SoC package.
			// Sometimes to keep Yoda/Soc Schema happy, we populate one dummy pin but the package is still unsupported.
			return Object.keys(getSocPinDictionary()).length > 1;
		}

		if (icon.id === navigationItems.aiTools) {
			return aiCores.length;
		}

		if (icon.id === navigationItems.mcubootConfig) {
			return hasZephyrProject && isSupportedSoc;
		}

		if (icon.id === navigationItems.profiling) {
			return (
				projects?.some(p => p.FirmwarePlatform === 'zephyr') ?? false
			);
		}

		return true;
	});

	const footerIcons =
		hasZephyrProject && isSupportedSoc ? [settingsIcon] : [];

	return {mainIcons: filteredIcons, footerIcons};
}
