/**
 *
 * Copyright (c) 2024 Analog Devices, Inc.
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
// Components
import SocSelection from '../../screens/SocSelection/SocSelection';
import WorkspaceOptions from '../../screens/workspace-options/WorkspaceOptions';
import BoardSelection from '../../screens/board-selection/BoardSelection';
import CoresSelection from '../../screens/cores-selection/CoresSelection';
import CoreConfig from '../../screens/core-config/CoreConfig';
import PathSelection from '../../screens/path-selection/PathSelection';
// Common
import NavigationPanel from '@common/components/navigation-panel/NavigationPanel';
// Redux
import {useActiveScreen} from '../../state/slices/app-context/appContext.selector';

import {navigationItems} from '../../common/constants/navigation';

import styles from './app-panel.module.scss';

export default function AppPanel() {
	const activeScreen = useActiveScreen();

	return (
		<div className={styles.appPanelContainer}>
			<NavigationPanel activeNavItem={activeScreen}>
				<SocSelection key={navigationItems.socSelection} />
				<BoardSelection key={navigationItems.boardSelection} />
				<WorkspaceOptions key={navigationItems.workspaceOptions} />
				<CoresSelection key={navigationItems.coresSelection} />
				<CoreConfig key={navigationItems.coreConfig} />
				<PathSelection key={navigationItems.pathSelection} />
			</NavigationPanel>
		</div>
	);
}
