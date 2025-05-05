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
import {use, type TFormFieldValue} from 'cfs-react-library';
import {type ControlCfg} from '../../../../../common/types/soc';

import styles from './plugin-options-section.module.scss';
import {PluginOptions} from '../plugin-options/PluginOptions';
import {getProjectInfoList} from '../../../utils/config';

type PluginOptionsSectionProps = Readonly<{
	config?: Record<string, any>;
	pluginOptionsPromise: Promise<
		Array<{controls: Record<string, ControlCfg[]>; projectId: string}>
	>;
	onChange: (
		projectId: string,
		controlId: string,
		value: TFormFieldValue
	) => void;
}>;

export const PluginOptionsSection = memo(
	({
		config = {},
		pluginOptionsPromise,
		onChange
	}: PluginOptionsSectionProps) => {
		const pluginOptions = use(pluginOptionsPromise);

		const i10n: TLocaleContext | undefined =
			useLocaleContext()?.memory;

		const projects = getProjectInfoList();

		return (
			<div className={styles.section}>
				<h3>{i10n?.partition['plugin-options']}</h3>
				{pluginOptions.map(pluginOption => {
					const project = projects?.find(
						project => project.ProjectId === pluginOption.projectId
					);

					return (
						<React.Fragment key={pluginOption.projectId}>
							<h5>{project?.Description ?? ''}</h5>
							<PluginOptions
								key={pluginOption.projectId}
								config={config[pluginOption.projectId] ?? {}}
								pluginControls={pluginOption.controls.memory ?? []}
								onChange={(controlId, value) => {
									onChange(pluginOption.projectId, controlId, value);
								}}
							/>
						</React.Fragment>
					);
				})}
			</div>
		);
	}
);
