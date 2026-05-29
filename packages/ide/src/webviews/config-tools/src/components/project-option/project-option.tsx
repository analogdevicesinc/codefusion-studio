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
import {
	SECURE_ABBR,
	NON_SECURE_ABBR
} from '@common/constants/core-properties';
import {type ProjectInfo} from '../../utils/config';
import {memo} from 'react';

function ProjectOption({project}: {readonly project: ProjectInfo}) {
	return (
		<div title={project.Description}>
			{project.Name}&nbsp;
			{project.Secure ? (
				<Badge appearance='secondary'>{SECURE_ABBR}</Badge>
			) : project.Secure === false ? (
				<Badge appearance='secondary'>{NON_SECURE_ABBR}</Badge>
			) : (
				''
			)}
		</div>
	);
}

export default memo(ProjectOption);
