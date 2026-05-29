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

import type {
	ApplicationStatus,
	BuildStatus,
	DeployStatus
} from "@ide-types/ai-hardware-profiling-types";
import {Spinner} from '../../../common/components/spinner/Spinner';
import CircledCheckmarkIcon from '../../../common/icons/CircledCheckmark';
import ConflictIcon from '../../../common/icons/Conflict';
import styles from './HeaderBar.module.scss';
import {capitalizeWord} from '../../../common/utils/string';

type HeaderBarProps = Readonly<{
	applicationStatus: ApplicationStatus;
}>;

export function HeaderBar({
	applicationStatus: {buildStatus, deployStatus}
}: HeaderBarProps) {
	return (
		<div className={styles.headerBar}>
			<span className={styles.buildStatus}>
				{getIconForStatus(buildStatus)} {capitalizeWord(buildStatus)}
			</span>
			<span className={styles.profilingStatus}>
				{getIconForStatus(deployStatus)}{' '}
				{capitalizeWord(deployStatus)}
			</span>
		</div>
	);
}

function getIconForStatus(status: DeployStatus | BuildStatus) {
	switch (status) {
		case 'built':
		case 'stopped':
			return <CircledCheckmarkIcon />;
		case 'building':
		case 'deploying':
		case 'running':
			return <Spinner />;
		case 'error':
		case 'undeployed':
		case 'idle':
			return <ConflictIcon />;
		default:
			return undefined;
	}
}
