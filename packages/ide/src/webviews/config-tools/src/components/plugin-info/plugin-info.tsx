/**
 *
 * Copyright (c) 2025 Analog Devices, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import {capitalizeWord} from '../../../../common/utils/string';
import {
	getCfsConfigDict,
	getAssignedPlugin
} from '../../utils/config';
import styles from './plugin-info.module.scss';

type PluginInfoProps = Readonly<{
	projectId: string;
}>;

function PluginInfo({projectId}: PluginInfoProps) {
	const socConfig = getCfsConfigDict();
	const pluginInfo = getAssignedPlugin(projectId);

	return (
		<div className={styles.pluginInfoContainer}>
			<p data-test='plugin-info:firmware'>
				{`${(socConfig?.Soc ?? '').toUpperCase()} ${capitalizeWord(pluginInfo?.firmwarePlatform ?? '')}`}
			</p>
			<p data-test='plugin-info:version'>{`Version ${pluginInfo?.pluginVersion ?? 'unknown'}`}</p>
		</div>
	);
}

export default PluginInfo;
