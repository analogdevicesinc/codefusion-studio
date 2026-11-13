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
import {useLocaleContext} from '@common/contexts/LocaleContext';
import {
	availableIcons,
	settingsIcon
} from '../constants/navigation-icons';
import {getAICores} from '../utils/ai-tools';
import {getClockNodeDictionary} from '../utils/clock-nodes';
import {
	getProjectInfoList,
	getSupportsFirewall,
	getSupportsMCUboot
} from '../utils/config';
import {getGasketDictionary} from '../utils/dfg';
import {getCoreMemoryDictionary} from '../utils/memory';
import {getSocPeripheralDictionary} from '../utils/soc-peripherals';
import {getSocPinDictionary} from '../utils/soc-pins';

const navL10nKeyMap: Record<string, string> = {
	[navigationItems.dashboard]: 'dashboard',
	[navigationItems.peripherals]: 'peripheral-allocation',
	[navigationItems.pinmux]: 'pin-config',
	[navigationItems.clockConfig]: 'clock-config',
	[navigationItems.dfg]: 'data-flow-gasket',
	[navigationItems.memory]: 'memory-allocation',
	[navigationItems.signalRoutingUnit]: 'signal-routing-unit',
	[navigationItems.firewallConfig]: 'firewall-config',
	[navigationItems.registers]: 'registers',
	[navigationItems.aiTools]: 'embedded-ai-tools',
	[navigationItems.mcubootConfig]: 'mcuboot-config',
	[navigationItems.profiling]: 'profiling',
	[navigationItems.generate]: 'generate-code',
	[navigationItems.settings]: 'settings'
};

/**
 * Determines which navigation icons should be displayed based on the current SoC and project data.
 *
 * The hook filters `availableIcons` by checking the presence or conditions of related system data:
 * - DFG icon: shown if any gaskets exist.
 * - Clock Config icon: shown if any clock nodes exist.
 * - Memory icon: shown if any core memory entries exist.
 * - Pinmux icon: shown if more than one SoC pin exists (to avoid dummy pin-only setups).
 * - AI Tools icon: shown if AI cores are present.
 * - FlexNoC Config icon: shown only when the SoC is ADAU2042 (temporary until the data model exposes a FlexNoC capability flag).
 * - Signal Routing Unit icon: shown if any peripheral defines an SRU configuration.
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
	const isFirewallSupported = getSupportsFirewall();
	const l10n = useLocaleContext()?.navigation as
		| Record<string, string>
		| undefined;

	const resolveLabel = (icon: {id: string; tooltipLabel: string}) => {
		const key = navL10nKeyMap[icon.id];

		return (key && l10n?.[key]) ?? icon.tooltipLabel;
	};

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

		if (icon.id === navigationItems.firewallConfig) {
			// Only show FlexNoC config if the SoC is ADAU2042, this is temporary until the datamodel is updated
			// to provide a way to determine if FlexNoC is supported for a given SoC.
			return isFirewallSupported;
		}

		if (icon.id === navigationItems.signalRoutingUnit) {
			const peripherals = getSocPeripheralDictionary();

			return Object.values(peripherals).some(
				peripheral => peripheral.sru
			);
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
		(hasZephyrProject && isSupportedSoc) || isFirewallSupported
			? [settingsIcon]
			: [];

	return {
		mainIcons: filteredIcons.map(icon => ({
			...icon,
			tooltipLabel: resolveLabel(icon)
		})),
		footerIcons: footerIcons.map(icon => ({
			...icon,
			tooltipLabel: resolveLabel(icon)
		}))
	};
}
