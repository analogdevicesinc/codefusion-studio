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

import {Badge} from 'cfs-react-library';
import {type StateProject} from '../../../common/types/state';
import styles from '../CoreConfigContainer.module.scss';
import {
	NON_SECURE,
	PRIMARY,
	SECURE
} from '@common/constants/core-properties';
import {
	useCurrentCoreConfigStep,
	useEnabledCores
} from '../../../state/slices/workspace-config/workspace-config.selector';
import {
	doesCoreHaveProperty,
	getBaseCoreName
} from '../../../utils/workspace-config';
import useIsPrimaryMultipleProjects from '../../../hooks/use-is-primary-multiple-projects';

type CoreConfigHeaderProps = Readonly<{
	core: StateProject;
}>;

function CoreConfigHeader({core}: CoreConfigHeaderProps) {
	const enabledCores = useEnabledCores();
	const currentStep = useCurrentCoreConfigStep();
	const shouldShowPrimaryBadge = useIsPrimaryMultipleProjects(
		core?.isPrimary ?? false
	);

	return (
		<div
			className={styles.coreConfigHeader}
			data-test={`core-config:header:${core?.coreId}`}
		>
			<div className={styles.coreStepCount}>{`${currentStep + 1} of ${
				enabledCores.length
			} ${enabledCores.length > 1 ? 'projects' : 'project'}`}</div>
			<div className={styles.coreDetails}>
				<div className={styles.coreName}>
					{getBaseCoreName(core?.name)}
				</div>
				{shouldShowPrimaryBadge && (
					<Badge appearance='secondary'>{PRIMARY}</Badge>
				)}
				{doesCoreHaveProperty(core, 'Secure') && (
					<Badge appearance='secondary'>
						{core?.Secure ? SECURE : NON_SECURE}
					</Badge>
				)}
			</div>
		</div>
	);
}

export default CoreConfigHeader;
