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

import {
	useCallback,
	useState,
	useMemo,
	useEffect,
	Suspense
} from 'react';
import {ProgressRing, use} from 'cfs-react-library';
import semver from 'semver';
import CodeGenPlugin from './core-config-components/code-gen-plugin/CodeGenPlugin';
import NotificationError from '../../components/notification-error/NotificationError';
import PluginProperties from './PluginProperties';
import {
	useConfigurationErrors,
	useConfiguredCore,
	useCorePluginId,
	useCorePluginVersion,
	useSelectedBoardPackage,
	useSelectedCoreToConfigId,
	useSelectedSoc
} from '../../state/slices/workspace-config/workspace-config.selector';
import type {CfsPluginInfo} from 'cfs-types';
import {useAppDispatch} from '../../state/store';
import {
	resetCorePlatformConfig,
	setConfigErrors
} from '../../state/slices/workspace-config/workspace-config.reducer';

import styles from './CoreConfigContainer.module.scss';
import {fetchPluginProperties} from '../../utils/api';
import {findPluginInfo} from '../../utils/workspace-config';
import WorkspaceEmptyPlugins from '../../components/workspace-empty-plugins/WorkspaceEmptyPlugins';

type CoreConfigContainerProps = Readonly<{
	pluginsPromise: Promise<CfsPluginInfo[]>;
}>;

function CoreConfigContainer({
	pluginsPromise
}: CoreConfigContainerProps) {
	const dispatch = useAppDispatch();
	const selectedSocId = useSelectedSoc();
	const {boardId, packageId} = useSelectedBoardPackage();
	const configErrors = useConfigurationErrors('coreConfig');
	const pluginsList = use(pluginsPromise);
	const coreId = useSelectedCoreToConfigId();
	const persistedPluginId = useCorePluginId(coreId ?? '');
	const persistedPluginVersion = useCorePluginVersion(coreId ?? '');
	const core = useConfiguredCore(coreId ?? '');

	const [selectedPluginInfo, setSelectedPluginInfo] = useState<
		CfsPluginInfo | undefined
	>(() => {
		if (persistedPluginId) {
			return findPluginInfo(
				pluginsList,
				persistedPluginId,
				persistedPluginVersion
			);
		}

		return undefined;
	});

	const propertiesPromise = useMemo(async () => {
		if (selectedPluginInfo) {
			return fetchPluginProperties(selectedPluginInfo, {
				soc: selectedSocId,
				coreId: core.coreId,
				boardId,
				packageId,
				secure: core.Secure
			});
		}

		return [];
	}, [selectedPluginInfo, selectedSocId, boardId, packageId, core]);

	// Remove duplicates from plugins list, keeping the highest version per plugin ID
	// Applied after SoC/core filtering to ensure only compatible plugins are considered
	const filteredPluginList = useMemo(() => {
		const compatible = pluginsList.filter(
			plugin =>
				!plugin.features.workspace &&
				(plugin.supportedSocs?.some(
					soc =>
						soc.name.toLowerCase() ===
							selectedSocId?.toLowerCase() &&
						(!Array.isArray(soc.cores) ||
							soc.cores?.includes(core?.coreId)) &&
						// Board is irrelevant for project plugins — match on
						// SoC and package only.
						(soc.package.toLowerCase() ===
							packageId.toLowerCase() ||
							(soc.name.toLowerCase() === 'max32675c' &&
								soc.package.toLowerCase() === 'tqfn' &&
								packageId.toLowerCase() === 'lga'))
				) ??
					false)
		);

		const bestByPluginId = new Map<string, CfsPluginInfo>();

		for (const plugin of compatible) {
			const existing = bestByPluginId.get(plugin.pluginId);

			if (
				!existing ||
				semver.gt(
					plugin.pluginVersion,
					existing.pluginVersion
				)
			) {
				bestByPluginId.set(plugin.pluginId, plugin);
			}
		}

		return [...bestByPluginId.values()];
	}, [selectedSocId, pluginsList, core, packageId]);

	const handlePluginChange = useCallback(
		(id: string, version: string) => {
			const targetPluginInfo = pluginsList.find(
				p => p.pluginId === id && p.pluginVersion === version
			);

			dispatch(resetCorePlatformConfig({id: coreId ?? ''}));

			if (targetPluginInfo) {
				targetPluginInfo.properties?.project?.forEach(project => {
					// eslint-disable-next-line no-template-curly-in-string
					if (project.default === '${context.coreId}') {
						project.default = core?.coreId || project.default;
					}
				});

				setSelectedPluginInfo(targetPluginInfo);
			}

			// Reset the error state
			if (configErrors.notifications.length) {
				dispatch(
					setConfigErrors({id: 'coreConfig', notifications: []})
				);
			}
		},
		[
			pluginsList,
			configErrors.notifications,
			dispatch,
			coreId,
			core?.coreId
		]
	);

	useEffect(() => {
		if (persistedPluginId) {
			setSelectedPluginInfo(
				findPluginInfo(
					pluginsList,
					persistedPluginId,
					persistedPluginVersion
				)
			);
		} else {
			setSelectedPluginInfo(undefined);
		}
	}, [
		coreId,
		persistedPluginId,
		persistedPluginVersion,
		pluginsList
	]);

	return (
		<div
			data-test='core-config:container'
			className={styles.coresConfigContainer}
		>
			<NotificationError
				error={configErrors}
				testId='core-config:notification-error'
			/>
			<div className={styles.content}>
				{filteredPluginList.length ? (
					<CodeGenPlugin
						selectedPluginId={selectedPluginInfo?.pluginId ?? ''}
						selectedPluginVersion={
							selectedPluginInfo?.pluginVersion ?? ''
						}
						plugins={filteredPluginList ?? []}
						onPluginChange={handlePluginChange}
					/>
				) : (
					<WorkspaceEmptyPlugins
						selectedWorkspaceCreationPath='manual'
						coreName={core.name}
						socName={selectedSocId}
					/>
				)}
				<Suspense fallback={<ProgressRing />}>
					<PluginProperties
						key={`${coreId}|${selectedPluginInfo?.pluginId}`}
						coreId={coreId ?? ''}
						propertiesPromise={propertiesPromise}
						pluginInfo={selectedPluginInfo}
					/>
				</Suspense>
			</div>
		</div>
	);
}

export default CoreConfigContainer;
