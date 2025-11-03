/**
 *
 * Copyright (c) 2024-2025 Analog Devices, Inc.
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

import {memo, useMemo} from 'react';
import CfsSelectionCard from '@common/components/cfs-selection-card/CfsSelectionCard';
import {InfoIcon, Radio} from 'cfs-react-library';
import ConfigSection from '../../layout-components/config-section/ConfigSection';
import type {CatalogCoreInfo} from '../../../../common/types/catalog';

import styles from './CodeGenPlugin.module.scss';

type TCodeGenPlugin = Readonly<{
	selectedPluginId: string;
	selectedPluginVersion: string;
	plugins: CatalogCoreInfo['plugins'];
	onPluginChange: (id: string, version: string) => void;
}>;

function CodeGenPlugin({
	selectedPluginId,
	selectedPluginVersion,
	plugins,
	onPluginChange
}: TCodeGenPlugin) {
	const displayPlugins = useMemo(() => {
		if (!plugins.length) {
			return <div>No data</div>;
		}

		return (
			<div className={styles.plugins}>
				{plugins.map(item => (
					<CfsSelectionCard
						key={item.pluginId}
						id={item.pluginId}
						testId={`coreConfig:card:${item.pluginId}`}
						isChecked={
							selectedPluginId === item.pluginId &&
							selectedPluginVersion === item.pluginVersion
						}
						onChange={() => {
							onPluginChange(item.pluginId, item.pluginVersion);
						}}
					>
						<Radio
							slot='start'
							checked={
								selectedPluginId === item.pluginId &&
								selectedPluginVersion === item.pluginVersion
							}
							onClick={() => {
								onPluginChange(item.pluginId, item.pluginVersion);
							}}
						/>
						<h3 slot='title'>{item.pluginName}</h3>
						<span className={styles.version} slot='end'>
							<InfoIcon />
							{`v${item.pluginVersion}`}
						</span>
					</CfsSelectionCard>
				))}
			</div>
		);
	}, [
		plugins,
		onPluginChange,
		selectedPluginId,
		selectedPluginVersion
	]);

	return (
		<ConfigSection>
			<span slot='title'>Code Generation Plugin</span>

			<div className={styles['code-gen-plugin-content']}>
				{displayPlugins}
			</div>
		</ConfigSection>
	);
}

export default memo(CodeGenPlugin);
