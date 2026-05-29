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

import {useRef} from 'react';
import {
	type TLocaleContext,
	useLocaleContext
} from '../../../../../common/contexts/LocaleContext';
import KeyManagement from '../sign-key-management/sign-key-management';
import MCUBootSettings from '../mcuboot-settings/mcuboot-settings';
import useSettingsSectionObserver from '../../../hooks/use-settings-section-observer';
import styles from './workspace-security-settings.module.scss';

/**
 * Section IDs matching the children keys defined in
 * SIDEBAR_SECTIONS for the 'security' section.
 * Kept separate to avoid a circular dependency with constants.ts.
 */
const SECURITY_CHILD_IDS = ['mcuboot-config', 'key-management'];

function WorkspaceSecuritySettings() {
	const containerRef = useRef<HTMLDivElement>(null);
	const i10n: TLocaleContext | undefined =
		useLocaleContext()?.settings;

	useSettingsSectionObserver(SECURITY_CHILD_IDS, containerRef);

	return (
		<div ref={containerRef} className={styles.container}>
			<div className={styles.header}>
				<h1>{i10n?.security?.title}</h1>
			</div>
			<div className={styles.settingsContainer}>
				<MCUBootSettings />
				<KeyManagement />
			</div>
		</div>
	);
}

export default WorkspaceSecuritySettings;
