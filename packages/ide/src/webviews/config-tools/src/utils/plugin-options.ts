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

		Object.keys(projectConfig).forEach(controlId => {
			const control = controls?.memory?.find(c => c.Id === controlId);

			if (control?.Type === 'boolean') {
				if (typeof projectConfig[controlId] === 'string') {
					projectConfig[controlId] =
						projectConfig[controlId].toUpperCase() === 'TRUE';
				} else if (typeof projectConfig[controlId] === 'number') {
					/* Treat 0 as false, any other number as true. */
					projectConfig[controlId] = projectConfig[controlId] !== 0;
				}
			}
		});

		// Any controls that don't have a value set, use the Hint if available
		controls?.memory?.forEach(control => {
			if (projectConfig[control.Id] === undefined) {
				if (control.Hint !== undefined) {
					projectConfig[control.Id] = control.Hint;
				}
			}
		});
	});

	return allDataInner;
};
