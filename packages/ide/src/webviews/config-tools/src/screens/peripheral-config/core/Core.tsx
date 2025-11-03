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
import {memo} from 'react';
import styles from './Core.module.scss';
import {Badge} from 'cfs-react-library';
import {getProjectInfoList} from '../../../utils/config';
import useIsPrimaryMultipleProjects from '../../../hooks/use-is-primary-multiple-projects';
import {
	EX_MANAGED_ABBR as EM,
	PRIMARY_ABBR as P,
	SECURE_ABBR as S,
	NON_SECURE_ABBR as NS
} from '../../../../../common/constants/core-properties';

export type CoreProps = Readonly<{
	projectId: string;
}>;

function Core({projectId}: CoreProps) {
	const projectConfig = getProjectInfoList()?.find(
		p => p.ProjectId === projectId
	);
	const shouldShowPrimaryBadge = useIsPrimaryMultipleProjects(
		projectConfig?.IsPrimary ?? false
	);

	return (
		<div className={styles.container} data-test={`core-${projectId}`}>
			{projectConfig?.Name}
			<div className={styles.badgeContainer}>
				{shouldShowPrimaryBadge && (
					<Badge
						dataTest={`core-${projectId}-badge-primary`}
						className={styles.badge}
						appearance='secondary'
					>
						{P}
					</Badge>
				)}
				{projectConfig && projectConfig.ExternallyManaged && (
					<Badge
						dataTest={`core-${projectId}-badge-externally-managed`}
						className={styles.badge}
						appearance='secondary'
					>
						{EM}
					</Badge>
				)}
				{projectConfig && projectConfig?.Secure && (
					<Badge
						dataTest={`core-${projectId}-badge-secure`}
						className={styles.badge}
						appearance='secondary'
					>
						{S}
					</Badge>
				)}
				{projectConfig && projectConfig?.Secure === false && (
					<Badge
						dataTest={`core-${projectId}-badge-secure`}
						className={styles.badge}
						appearance='secondary'
					>
						{NS}
					</Badge>
				)}
			</div>
		</div>
	);
}

export default memo(Core);
