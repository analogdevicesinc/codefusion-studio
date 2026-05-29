/**
 *
 * Copyright (c) 2024 - 2025 Analog Devices, Inc.
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
import {useLocaleContext} from '../../../../common/contexts/LocaleContext';
import ConfigUnavailable from '../config-unavailable/config-unavailable';
import ConfigSection from './config-section/ConfigSection';

function ConfigPanel({
	details,
	managePinAssignments,
	onManagePinAssignmentsClick,
	configuration,
	onConfigurationClick,
	pluginConfiguration,
	variant,
	unavailableSections
}: Readonly<{
	details?: React.ReactNode;
	managePinAssignments?: React.ReactNode;
	onManagePinAssignmentsClick?: () => void;
	configuration?: React.ReactNode;
	onConfigurationClick?: () => void;
	pluginConfiguration?: React.ReactNode;
	variant?: 'default' | 'navigate' | 'noChevron';
	unavailableSections?: Record<string, boolean>;
}>) {
	const l10n = useLocaleContext();

	return (
		<>
			{details && (
				<ConfigSection isExpanded title='DETAILS' variant='noChevron'>
					{details}
				</ConfigSection>
			)}
			<ConfigSection
				isExpanded
				dataTest='config-section:manage-pin-assignments'
				title={l10n?.peripherals?.['pin-assignment']?.title}
				variant={managePinAssignments ? 'navigate' : 'noChevron'}
				isUnavailable={!managePinAssignments}
				handleHeaderClick={onManagePinAssignmentsClick}
			>
				{managePinAssignments ?? (
					<ConfigUnavailable
						message={
							l10n?.peripherals?.['pin-assignment']?.notAvailable
						}
						showLockIcon={false}
					/>
				)}
			</ConfigSection>
			{configuration && (
				<ConfigSection
					isExpanded
					dataTest='config-section:configuration'
					title='CONFIGURATION'
					isUnavailable={unavailableSections?.configuration}
					variant={
						unavailableSections?.configuration ? 'noChevron' : variant
					}
					handleHeaderClick={onConfigurationClick}
				>
					{configuration}
				</ConfigSection>
			)}
			{pluginConfiguration && (
				<ConfigSection
					isExpanded
					dataTest='config-panel:plugin-options'
					title='CODE GENERATION PLUGIN'
					isUnavailable={unavailableSections?.plugin}
					variant={
						unavailableSections?.plugin ? 'noChevron' : variant
					}
				>
					{pluginConfiguration}
				</ConfigSection>
			)}
		</>
	);
}

export default memo(ConfigPanel);
