/**
 *
 * Copyright (c) 2024 - 2025 Analog Devices, Inc.
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

import {useCallback} from 'react';
import {
	useConfigurationErrors,
	useWorkspaceTemplate,
	useWorkspaceTemplateType
} from '../../state/slices/workspace-config/workspace-config.selector';
import {Radio, use} from 'cfs-react-library';
import styles from './TemplateSelectionContainer.module.scss';
import CfsSelectionCard from '@common/components/cfs-selection-card/CfsSelectionCard';
import {useAppDispatch} from '../../state/store';
import {
	setWorkspaceTemplate,
	setConfigErrors,
	setWorkspaceTemplateType
} from '../../state/slices/workspace-config/workspace-config.reducer';
import {configErrors} from '../../common/constants/validation-errors';
import type {CfsPluginInfo as BaseCfsPluginInfo} from 'cfs-lib';

type CfsPluginInfo = BaseCfsPluginInfo & {
	supportedHostPlatforms?: string[];
};

import {
	type TLocaleContext,
	useLocaleContext
} from '../../../../common/contexts/LocaleContext';
import WorkspaceEmptyPlugins from '../../components/workspace-empty-plugins/WorkspaceEmptyPlugins';

export default function TemplateSelectionContainer({
	templateListPromise,
	hostPlatformPromise
}: Readonly<{
	templateListPromise: Promise<CfsPluginInfo[]>;
	hostPlatformPromise: Promise<string>;
}>) {
	const l10n: TLocaleContext | undefined = useLocaleContext();

	const dispatch = useAppDispatch();
	const {pluginId: templateId} = useWorkspaceTemplate() ?? {};
	const os = use(hostPlatformPromise);
	// Filter templates based on host platform
	const templateList = use(templateListPromise).filter(
		template =>
			!template.supportedHostPlatforms ||
			template.supportedHostPlatforms.includes(os)
	);

	const errors = useConfigurationErrors('multiCoreTemplate');

	const workspaceTemplateType = useWorkspaceTemplateType();

	const handleTemplateChange = useCallback(
		({
			pluginId,
			pluginVersion,
			pluginName
		}: Partial<CfsPluginInfo>) => {
			if (pluginId !== templateId) {
				dispatch(
					setWorkspaceTemplate({
						pluginId,
						pluginVersion,
						pluginName
					})
				);
			}

			if (errors.notifications.length) {
				dispatch(
					setConfigErrors({
						id: configErrors.multiCoreTemplate,
						notifications: []
					})
				);
			}
		},
		[dispatch, templateId, errors.notifications]
	);

	if (templateList.length === 0) {
		return (
			<div className={styles.templatesContainer}>
				<WorkspaceEmptyPlugins selectedWorkspaceCreationPath='predefined' />
			</div>
		);
	}

	return (
		<section data-test='workspace-options:template-selection:container'>
			<header className={styles.templateHeader}>
				<h2>
					{l10n?.['workspace-options']?.['workspace-template']?.title}
				</h2>
				<span>
					{
						l10n?.['workspace-options']?.['workspace-template']
							?.description
					}
				</span>
			</header>

			<main className={styles.templatesContainer}>
				{templateList.length ? (
					templateList.map(
						({
							pluginId,
							pluginName,
							pluginDescription,
							pluginVersion
						}) => (
							<CfsSelectionCard
								key={pluginId}
								testId={`templateSelection:card:${pluginId}`}
								id={pluginId}
								isChecked={
									templateId === pluginId &&
									workspaceTemplateType === 'predefined'
								}
								onChange={() => {
									dispatch(setWorkspaceTemplateType('predefined'));
									handleTemplateChange({
										pluginId,
										pluginVersion,
										pluginName
									});
								}}
							>
								<div slot='start'>
									<Radio
										checked={
											templateId === pluginId &&
											workspaceTemplateType === 'predefined'
										}
									/>
								</div>
								<div slot='title' className={styles.template}>
									<h3>{pluginName}</h3>
									<p>{pluginDescription}</p>
								</div>
							</CfsSelectionCard>
						)
					)
				) : (
					<p>
						No templates found for your current search parameters.
					</p>
				)}
			</main>
		</section>
	);
}
