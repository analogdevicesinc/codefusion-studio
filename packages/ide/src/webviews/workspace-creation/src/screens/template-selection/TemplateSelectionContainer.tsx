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

import {useCallback, useMemo, useState} from 'react';
import {
	useConfigurationErrors,
	useWorkspaceTemplate
} from '../../state/slices/workspace-config/workspace-config.selector';
import {Chip, Radio, SearchInput, use} from 'cfs-react-library';
import styles from './TemplateSelectionContainer.module.scss';
import NotificationError from '../../components/notification-error/NotificationError';
import CfsSelectionCard from '@common/components/cfs-selection-card/CfsSelectionCard';
import {useAppDispatch} from '../../state/store';
import {
	setWorkspaceTemplate,
	setConfigErrors
} from '../../state/slices/workspace-config/workspace-config.reducer';
import {capitalizeWord} from '@common/utils/string';
import {configErrors} from '../../common/constants/validation-errors';
import type {CfsPluginInfo} from 'cfs-lib';

export default function TemplateSelectionContainer({
	templateListPromise
}: Readonly<{templateListPromise: Promise<CfsPluginInfo[]>}>) {
	const [search, setSearch] = useState<string>('');
	const [selectedPlatform, setSelectedPlatform] = useState('');

	const dispatch = useAppDispatch();
	const {pluginId: templateId} = useWorkspaceTemplate() ?? {};

	const templateList = use(templateListPromise);

	const errors = useConfigurationErrors('multiCoreTemplate');

	const availableSocPlatforms = useMemo(() => {
		const platforms = new Set<string>();

		templateList.forEach(template => {
			if (template.firmwarePlatform) {
				platforms.add(template.firmwarePlatform);
			}
		});

		return Array.from(platforms);
	}, [templateList]);

	const isSearchFound = useCallback(
		(item: string) =>
			item.toLowerCase().includes(search.toLowerCase()),
		[search]
	);

	const filteredTemplateList = templateList.filter(
		({pluginName, pluginDescription, firmwarePlatform}) =>
			(isSearchFound(pluginName) ||
				isSearchFound(pluginDescription)) &&
			(!selectedPlatform ||
				firmwarePlatform?.toLowerCase() ===
					selectedPlatform?.toLowerCase())
	);

	const handleSearchChange = useCallback((newInput: string) => {
		setSearch(newInput);
	}, []);

	const handlePlatformChange = useCallback(
		(newPlatform: string) => {
			if (selectedPlatform && selectedPlatform === newPlatform) {
				setSelectedPlatform('');
			} else {
				setSelectedPlatform(newPlatform);
			}
		},
		[selectedPlatform]
	);

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
				<p>
					No plugins available for your current SoC/Package/Board
					selection.
				</p>
			</div>
		);
	}

	return (
		<section data-test='template-selection:container'>
			<header className={styles.templateHeader}>
				<SearchInput
					inputVal={search}
					placeholder='Search Templates'
					onClear={() => {
						setSearch('');
					}}
					onInputChange={handleSearchChange}
				/>
				<div className={styles.chipsContainer}>
					{availableSocPlatforms.map(platform => (
						<Chip
							key={platform}
							id={platform}
							dataTest={`${platform.toLowerCase()}-chip`}
							label={capitalizeWord(platform)}
							isDisabled={false}
							isActive={selectedPlatform === platform}
							onClick={() => {
								handlePlatformChange(platform);
							}}
						/>
					))}
				</div>
			</header>

			<NotificationError
				error={errors}
				testId='multicore-template-selection-error'
			/>

			<main className={styles.templatesContainer}>
				{filteredTemplateList.length ? (
					filteredTemplateList.map(
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
								isChecked={templateId === pluginId}
								onChange={() => {
									handleTemplateChange({
										pluginId,
										pluginVersion,
										pluginName
									});
								}}
							>
								<div slot='start'>
									<Radio checked={templateId === pluginId} />
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
