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

import {
	useCallback,
	useState,
	useMemo,
	useEffect,
	Suspense
} from 'react';
import {ProgressRing, use} from 'cfs-react-library';
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
import type {CfsPluginInfo} from 'cfs-lib';
import {useAppDispatch} from '../../state/store';
import {
	resetCorePlayformConfig,
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
	const {packageId, boardId} = useSelectedBoardPackage();
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
				boardId
			});
		}

		return [];
	}, [selectedPluginInfo, selectedSocId, boardId, core]);

	const filteredPluginList = useMemo(() => {
		const filter = (plugin: CfsPluginInfo) => {
			const normalizedPackageId = packageId.replace(/[\s-]+/g, '');

			return (
				!plugin.features.workspace &&
				(plugin.supportedSocs?.some(
					soc =>
						soc.name?.toLowerCase() ===
							selectedSocId?.toLowerCase() &&
						soc.package?.toLowerCase() ===
							normalizedPackageId.toLowerCase() &&
						(boardId === '' ||
							(soc.board?.toLowerCase() ?? '') ===
								boardId.toLowerCase())
				) ??
					false)
			);
		};

		return pluginsList.filter(filter);
	}, [selectedSocId, packageId, boardId, pluginsList]);

	const handlePluginChange = useCallback(
		(id: string, version: string) => {
			const targetPluginInfo = pluginsList.find(
				p => p.pluginId === id && p.pluginVersion === version
			);

			dispatch(resetCorePlayformConfig({id: coreId ?? ''}));

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
