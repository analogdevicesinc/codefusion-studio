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
import type {ControlCfg} from '@common/types/soc';
import type {PartitionCore} from '../state/slices/partitions/partitions.reducer';
import {getTypeBasedDefault} from './control-defaults';

export const getAllPluginOptions = (
	config: Record<string, Record<string, string | number | boolean>>,
	pluginOptions: Record<string, Record<string, ControlCfg[]>>,
	projects: PartitionCore[] | undefined
) => {
	const allDataInner = {...config};
	projects?.forEach(project => {
		const {projectId} = project;

		if (!allDataInner[projectId]) {
			allDataInner[projectId] = {};
		}

		const data = allDataInner[projectId];
		const projectConfig = {...data};
		const controls = pluginOptions[projectId];
		allDataInner[projectId] = projectConfig;

		controls?.memory?.forEach(control => {
			if (projectConfig[control.Id] === undefined) {
				if (control.Hint) {
					projectConfig[control.Id] = control.Hint;
				} else {
					projectConfig[control.Id] = getTypeBasedDefault(control);
				}
			}

			if (control.Type === 'boolean') {
				if (typeof projectConfig[control.Id] === 'string') {
					projectConfig[control.Id] =
						(projectConfig[control.Id] as string).toUpperCase() ===
						'TRUE';
				} else if (typeof projectConfig[control.Id] === 'number') {
					/* Treat 0 as false, any other number as true. */
					projectConfig[control.Id] = projectConfig[control.Id] !== 0;
				}
			}
		});
	});

	return allDataInner;
};
