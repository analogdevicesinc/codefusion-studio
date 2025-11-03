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

import React, {memo} from 'react';
import {type TLocaleContext} from '../../../common/types/context';
import {useLocaleContext} from '../../../../../common/contexts/LocaleContext';
import {type ControlCfg} from '../../../../../common/types/soc';

import styles from './plugin-options-section.module.scss';
import {PluginOptions} from '../plugin-options/PluginOptions';
import {getProjectInfoList} from '../../../utils/config';
import {
	useActivePartitionConfig,
	useActivePartitionProjects
} from '../../../state/slices/partitions/partitions.selector';
import {useAppDispatch} from '../../../state/store';
import {updateActivePartitionConfig} from '../../../state/slices/partitions/partitions.reducer';

type PluginOptionsSectionProps = Readonly<{
	pluginOptions: Record<string, Record<string, ControlCfg[]>>;
}>;

export const PluginOptionsSection = memo(
	({pluginOptions}: PluginOptionsSectionProps) => {
		const dispatch = useAppDispatch();
		const config = useActivePartitionConfig() ?? {};
		const partitionCores = useActivePartitionProjects();

		const i10n: TLocaleContext | undefined =
			useLocaleContext()?.memory;

		const projects = getProjectInfoList();

		return (
			<div className={styles.section}>
				<h3>{i10n?.partition['plugin-options']}</h3>
				{partitionCores
					?.filter(({projectId}) => Boolean(pluginOptions[projectId]))
					.map(({projectId}) => {
						const project = projects?.find(
							project => project.ProjectId === projectId
						);
						const controls = pluginOptions[projectId];

						return (
							<React.Fragment key={projectId}>
								<h5>{project?.Description ?? ''}</h5>
								<PluginOptions
									key={projectId}
									config={config[projectId] ?? {}}
									pluginControls={controls.memory ?? []}
									onChange={(controlId, value) => {
										dispatch(
											updateActivePartitionConfig({
												projectId: projectId,
												key: controlId,
												value: value
											})
										);
									}}
								/>
							</React.Fragment>
						);
					})}
			</div>
		);
	}
);
