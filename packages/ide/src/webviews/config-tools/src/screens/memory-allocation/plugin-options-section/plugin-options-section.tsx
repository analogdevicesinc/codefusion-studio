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

import React, {memo, useCallback} from 'react';
import {type TLocaleContext} from '../../../common/types/context';
import {useLocaleContext} from '../../../../../common/contexts/LocaleContext';
import {type ControlCfg} from '../../../../../common/types/soc';

import styles from './plugin-options-section.module.scss';
import {PluginOptions} from '../plugin-options/PluginOptions';
import {getProjectInfoList} from '../../../utils/config';
import {useActivePartitionProjects} from '../../../state/slices/partitions/partitions.selector';
import {useAppDispatch} from '../../../state/store';
import {updateActivePartitionConfig} from '../../../state/slices/partitions/partitions.reducer';
import {evaluateCondition} from '../../../utils/rpn-expression-resolver';
import ProjectOption from '../../../components/project-option/project-option';

type PluginOptionsSectionProps = Readonly<{
	pluginOptions: Record<string, Record<string, ControlCfg[]>>;
	allOptions: Record<string, any>;
}>;

export const PluginOptionsSection = memo(
	({pluginOptions, allOptions}: PluginOptionsSectionProps) => {
		const dispatch = useAppDispatch();
		const partitionCores = useActivePartitionProjects();

		const i10n: TLocaleContext | undefined =
			useLocaleContext()?.memory;

		const projects = getProjectInfoList();

		const onChangeHandler = useCallback(
			(projectId: string, controlId: string, value: any) => {
				const updates: Record<string, string | number | boolean> = {
					[controlId]: value
				};
				const controls = pluginOptions[projectId];
				const control = controls.memory?.find(
					c => c.Id === controlId
				);

				if (control?.Type === 'boolean') {
					value = value ? 'TRUE' : 'FALSE';
				} else if (control?.Type === 'integer') {
					value = value.toString();
				}

				// If the new value makes any other controls invalid due to conditions, those controls should be reset in the config
				controls.memory?.forEach(c => {
					if (c.Type === 'enum') {
						let validOption: string | undefined;
						let origIsInvalid = false;

						c.EnumValues?.forEach(ev => {
							let shouldMount = true;

							if (ev.Condition) {
								shouldMount = evaluateCondition(
									{
										...(allOptions[projectId] as Record<string, any>),
										...updates
									},
									ev.Condition
								) as boolean;
							}

							if (shouldMount) {
								// Remember the first valid option, in case we need it.
								if (validOption === undefined) validOption = ev.Id;
							} else if (ev.Id === allOptions[projectId][c.Id]) {
								origIsInvalid = true;
							}
						});

						if (origIsInvalid && validOption !== undefined) {
							updates[c.Id] = validOption;
						}
					}
				});
				dispatch(
					updateActivePartitionConfig({
						projectId,
						updates
					})
				);
			},
			[pluginOptions, allOptions, dispatch]
		);

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
							project && (
								<React.Fragment key={projectId}>
									<h5>
										<ProjectOption project={project} />
									</h5>
									<PluginOptions
										key={projectId}
										config={{
											projectId,
											...allOptions[projectId]
										}}
										pluginControls={controls.memory ?? []}
										onChange={(controlId, value) => {
											onChangeHandler(projectId, controlId, value);
										}}
									/>
								</React.Fragment>
							)
						);
					})}
			</div>
		);
	}
);
