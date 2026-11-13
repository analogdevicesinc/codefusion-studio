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

import {type ComponentType} from 'react';
import KeyManagement from '../sign-key-management/sign-key-management';
import MCUBootSettings from '../mcuboot-settings/mcuboot-settings';
import FirewallSettings from '../firewall-settings/firewall-settings';
import SettingsSection from '../settings-section/settings-section';

/**
 * Child components for the 'security' section, keyed by their
 * SIDEBAR_SECTIONS child key. Render order comes from SIDEBAR_SECTIONS.
 */
const SECURITY_CHILDREN: Record<string, ComponentType> = {
	'firewall-status': FirewallSettings,
	'mcuboot-config': MCUBootSettings,
	'key-management': KeyManagement
};

function WorkspaceSecuritySettings() {
	return (
		<SettingsSection
			sectionKey='security'
			childComponents={SECURITY_CHILDREN}
		/>
	);
}

export default WorkspaceSecuritySettings;
