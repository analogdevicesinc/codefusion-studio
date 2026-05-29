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

import WorkspaceSecuritySettings from './security-settings/workspace-security-settings';

/**
 * Maps sidebar section keys to their corresponding page components.
 * Used by WorkspaceSettings to render the active settings page content.
 */
export const SETTINGS_PAGES = [
	{key: 'security', component: WorkspaceSecuritySettings}
];
