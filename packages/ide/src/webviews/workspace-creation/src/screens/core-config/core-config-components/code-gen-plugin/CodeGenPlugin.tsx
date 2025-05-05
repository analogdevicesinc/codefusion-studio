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

import {memo, useCallback, useMemo, useState} from 'react';
import CfsSelectionCard from '@common/components/cfs-selection-card/CfsSelectionCard';
import {Chip, Radio} from 'cfs-react-library';
import ConfigSection from '../../layout-components/config-section/ConfigSection';
import type {CatalogCoreInfo} from '../../../../common/types/catalog';

import styles from './CodeGenPlugin.module.scss';
import {capitalizeWord} from '../../../../../../common/utils/string';

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
	const [filterId, setFilterId] = useState('');

	const availablePlatforms = useMemo(() => {
		const platforms = new Set<string>();

		plugins.forEach(plugin => platforms.add(plugin.firmwarePlatform));

		return Array.from(platforms);
	}, [plugins]);

	const filteredPlugins = useMemo(
		() =>
			plugins.filter(
				plugin => !filterId || plugin.firmwarePlatform === filterId
			),
		[plugins, filterId]
	);

	const handleChipClick = useCallback(
		(itemId: string) => {
			setFilterId(prev => (prev === itemId ? '' : itemId));
		},
		[setFilterId]
	);

	const displayPlugins = useMemo(() => {
		if (!filteredPlugins.length) {
			return <div>No data</div>;
		}

		return (
			<div className={styles.plugins}>
				{filteredPlugins.map(item => (
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
						<div slot='content' className={styles['card-body']}>
							<span>Summary:</span>{' '}
							<span>{item.pluginDescription}</span>
							<span>Author:</span> <span>{item.author}</span>
							<span>Plugin path:</span> <span>{item.pluginPath}</span>
						</div>
						<span className={styles.version} slot='end'>
							{item.pluginVersion}
						</span>
					</CfsSelectionCard>
				))}
			</div>
		);
	}, [
		filteredPlugins,
		onPluginChange,
		selectedPluginId,
		selectedPluginVersion
	]);

	const displayFilters = useMemo(
		() => (
			<div className={styles.filters}>
				{availablePlatforms.map(item => (
					<Chip
						key={item}
						id={item}
						label={capitalizeWord(item)}
						isDisabled={false}
						isActive={filterId === item}
						onClick={() => {
							handleChipClick(item);
						}}
					/>
				))}
			</div>
		),
		[handleChipClick, availablePlatforms, filterId]
	);

	return (
		<ConfigSection>
			<span slot='title'>Code Generation Plugin</span>

			<div className={styles['code-gen-plugin-content']}>
				{displayFilters}
				{displayPlugins}
			</div>
		</ConfigSection>
	);
}

export default memo(CodeGenPlugin);
