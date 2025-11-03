/**
 *
 * Copyright (c) 2025 Analog Devices, Inc.
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
import {PRIMARY} from '@common/constants/core-properties';
import {
	useCurrentCoreConfigStep,
	useSelectedCores
} from '../../../state/slices/workspace-config/workspace-config.selector';
import {
	getBaseCoreName,
	getEnabledCores
} from '../../../utils/workspace-config';
import useIsPrimaryMultipleProjects from '../../../hooks/use-is-primary-multiple-projects';

type CoreConfigHeaderProps = Readonly<{
	core: StateProject;
}>;

function CoreConfigHeader({core}: CoreConfigHeaderProps) {
	const selectedCores = useSelectedCores();
	const enabledCores = getEnabledCores(selectedCores);
	const currentStep = useCurrentCoreConfigStep();
	const shouldShowPrimaryBadge = useIsPrimaryMultipleProjects(
		core?.isPrimary ?? false
	);

	return (
		<div
			className={styles.coreConfigHeader}
			data-test={`core-config:header:${core?.coreId}`}
		>
			<div
				className={styles.coreStepCount}
			>{`${currentStep + 1} of ${enabledCores.length} ${enabledCores.length > 1 ? 'projects' : 'project'}`}</div>
			<div className={styles.coreDetails}>
				<div className={styles.coreName}>
					{getBaseCoreName(core?.name)}
				</div>
				{shouldShowPrimaryBadge && (
					<Badge appearance='secondary'>{PRIMARY}</Badge>
				)}
				{core.Secure && <Badge appearance='secondary'>Secure</Badge>}
				{core.Secure === false && (
					<Badge appearance='secondary'>Non-Secure</Badge>
				)}
			</div>
		</div>
	);
}

export default CoreConfigHeader;
