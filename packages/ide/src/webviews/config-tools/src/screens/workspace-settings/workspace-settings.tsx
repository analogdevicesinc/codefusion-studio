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

import CfsTwoColumnLayout from '@common/components/cfs-main-layout/CfsMainLayout';
import WorkspaceSettingsSidebar from './sidebar/workspace-settings-sidebar';
import useFilteredSettingsSections from '../../hooks/use-filtered-settings-sections';
import {useActiveSettingsPage} from '../../state/slices/app-context/appContext.selector';
import styles from './workspace-settings.module.scss';

function WorkspaceSettings() {
	const activePageKey = useActiveSettingsPage();
	const {filteredPages} = useFilteredSettingsSections();

	const activeKey = activePageKey || filteredPages[0]?.key;
	const selectedPage = filteredPages.find(
		page => page.key === activeKey
	);
	const ActiveSettings = selectedPage?.component;

	return (
		<div className={styles.settingsContainer}>
			<CfsTwoColumnLayout>
				<div slot='side-panel' style={{height: '100%'}}>
					<WorkspaceSettingsSidebar />
				</div>
				<div>{ActiveSettings && <ActiveSettings />}</div>
			</CfsTwoColumnLayout>
		</div>
	);
}

export default WorkspaceSettings;
