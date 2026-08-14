/**
 *
 * Copyright (c) 2024-2026 Analog Devices, Inc.
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

import {memo} from 'react';
import {useLocaleContext} from '@common/contexts/LocaleContext';
import ConfigSection from './config-section/ConfigSection';

function ConfigPanel({
	details,
	managePinAssignments,
	onManagePinAssignmentsClick,
	configuration,
	onConfigurationClick,
	pluginConfiguration,
	variant,
	unavailableSections,
	isExternallyManaged
}: Readonly<{
	details?: React.ReactNode;
	managePinAssignments?: React.ReactNode;
	onManagePinAssignmentsClick?: () => void;
	configuration?: React.ReactNode;
	onConfigurationClick?: () => void;
	pluginConfiguration?: React.ReactNode;
	variant?: 'default' | 'navigate' | 'noChevron';
	unavailableSections?: Record<
		'pinAssignment' | 'configuration' | 'plugin',
		boolean
	>;
	isExternallyManaged?: boolean;
}>) {
	const l10n = useLocaleContext();

	const shouldShowPinAssignmentSection =
		Boolean(managePinAssignments) &&
		!unavailableSections?.pinAssignment;
	const shouldShowPluginSection =
		Boolean(pluginConfiguration) && !unavailableSections?.plugin;
	// Configuration section is parent to Plugin Configuration, so show
	// Configuration section if any Plugin Configuration option is present
	const shouldShowConfigurationSection =
		shouldShowPluginSection ||
		(Boolean(configuration) && !unavailableSections?.configuration) ||
		isExternallyManaged;

	return (
		<>
			{details && (
				<ConfigSection isExpanded title='DETAILS' variant='noChevron'>
					{details}
				</ConfigSection>
			)}
			{shouldShowPinAssignmentSection && (
				<ConfigSection
					isExpanded
					dataTest='config-section:manage-pin-assignments'
					title={l10n?.peripherals?.['pin-assignment']?.title}
					isUnavailable={unavailableSections?.pinAssignment}
					variant='navigate'
					handleHeaderClick={onManagePinAssignmentsClick}
				>
					{managePinAssignments}
				</ConfigSection>
			)}
			{shouldShowConfigurationSection && (
				<ConfigSection
					isExpanded
					dataTest='config-section:configuration'
					isUnavailable={unavailableSections?.configuration}
					title='CONFIGURATION'
					variant={variant}
					handleHeaderClick={onConfigurationClick}
				>
					{configuration}
				</ConfigSection>
			)}
			{shouldShowPluginSection && (
				<ConfigSection
					isExpanded
					dataTest='config-panel:plugin-options'
					isUnavailable={unavailableSections?.plugin}
					title='CODE GENERATION PLUGIN'
					variant={variant}
				>
					{pluginConfiguration}
				</ConfigSection>
			)}
		</>
	);
}

export default memo(ConfigPanel);
