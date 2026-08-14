/**
 *
 * Copyright (c) 2024-2026 Analog Devices, Inc.
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

import {
	useCallback,
	useState,
	useMemo,
	useLayoutEffect,
	useRef
} from 'react';
import semver from 'semver';
import {
	useConfigurationErrors,
	useWorkspaceTemplate,
	useWorkspaceTemplateType
} from '../../state/slices/workspace-config/workspace-config.selector';
import {Radio, SearchInput, use} from 'cfs-react-library';
import {
	createHighlightForElements,
	isHighlightsAPISupported
} from '../../../../common/utils/highlightApi';
import styles from './TemplateSelectionContainer.module.scss';
import CfsSelectionCard from '@common/components/cfs-selection-card/CfsSelectionCard';
import {LocalizedMessage} from '@common/components/l10n/LocalizedMessage';
import NoSearchResults from '@common/components/no-search-results/NoSearchResults';
import {useAppDispatch} from '../../state/store';
import {
	setWorkspaceTemplate,
	setConfigErrors,
	setWorkspaceTemplateType
} from '../../state/slices/workspace-config/workspace-config.reducer';
import {configErrors} from '../../common/constants/validation-errors';
import type {CfsPluginInfo as BaseCfsPluginInfo} from 'cfs-types';

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

	const [searchValue, setSearchValue] = useState('');
	const containerRef = useRef<HTMLElement>(null);

	const highlightGroup = 'template-search-highlight';

	const allTemplates = use(templateListPromise);

	// Filter templates based on host platform and deduplicate to
	// the highest version per pluginId
	const templateList = useMemo(() => {
		const compatible = allTemplates.filter(
			template =>
				!template.supportedHostPlatforms ||
				template.supportedHostPlatforms.includes(os)
		);

		const bestByPluginId = new Map<CfsPluginInfo['pluginId'], CfsPluginInfo>();

		for (const template of compatible) {
			const existing = bestByPluginId.get(template.pluginId);

			if (
				!existing ||
				semver.gt(
					template.pluginVersion,
					existing.pluginVersion
				)
			) {
				bestByPluginId.set(template.pluginId, template);
			}
		}

		return [...bestByPluginId.values()];
	}, [allTemplates, os]);

	// Filter templates based on search input
	const filteredTemplateList = useMemo(() => {
		const trimmedSearch = searchValue.trim();

		if (!trimmedSearch) {
			return templateList;
		}

		const searchLower = trimmedSearch.toLowerCase();

		return templateList.filter(
			template =>
				template.pluginName?.toLowerCase().includes(searchLower) ||
				template.pluginDescription
					?.toLowerCase()
					.includes(searchLower)
		);
	}, [searchValue, templateList]);

	useLayoutEffect(() => {
		if (!isHighlightsAPISupported()) {
			return;
		}

		CSS.highlights.delete(highlightGroup);

		if (containerRef.current && searchValue.trim()) {
			const highlightableElements =
				containerRef.current.getElementsByClassName(
					styles.highlightable as string
				);
			const highlight = createHighlightForElements(
				highlightableElements,
				searchValue.trim().toLowerCase()
			);
			CSS.highlights.set(highlightGroup, highlight);
		}

		return () => {
			CSS.highlights.delete(highlightGroup);
		};
	}, [searchValue, filteredTemplateList, highlightGroup]);

	const errors = useConfigurationErrors('multiCoreTemplate');

	const workspaceTemplateType = useWorkspaceTemplateType();

	const handleTemplateChange = useCallback(
		({
			pluginId,
			pluginVersion,
			pluginName
		}: Partial<CfsPluginInfo>) => {
			dispatch(
				setWorkspaceTemplate({
					pluginId,
					pluginVersion,
					pluginName
				})
			);

			if (errors.notifications.length) {
				dispatch(
					setConfigErrors({
						id: configErrors.multiCoreTemplate,
						notifications: []
					})
				);
			}
		},
		[dispatch, errors.notifications]
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

			<main ref={containerRef} className={styles.templatesContainer}>
				<div role='search' className={styles.searchInputContainer}>
					<SearchInput
						dataTest='templateSelection:search-input'
						inputVal={searchValue}
						placeholder={
							l10n?.['workspace-options']?.['workspace-template']?.[
								'search-placeholder'
							] ?? 'Search templates...'
						}
						rightAdornment={
							<span className={styles.rightAdornment}>
								<LocalizedMessage
									id={
										filteredTemplateList.length === 1
											? 'search.matchesAvailableSingular'
											: 'search.matchesAvailable'
									}
									params={{
										matchesCount:
											filteredTemplateList.length.toLocaleString(
												'en-US'
											)
									}}
								/>
							</span>
						}
						onInputChange={setSearchValue}
						onClear={() => {
							setSearchValue('');
						}}
					/>
				</div>

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
									<h3 className={styles.highlightable}>
										{pluginName}
									</h3>
									<p className={styles.highlightable}>
										{pluginDescription}
									</p>
								</div>
							</CfsSelectionCard>
						)
					)
				) : (
					<NoSearchResults search={searchValue} />
				)}
			</main>
		</section>
	);
}
