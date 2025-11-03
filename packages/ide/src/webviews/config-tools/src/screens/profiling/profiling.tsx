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

import {Badge} from 'cfs-react-library';
import {getProjectInfoList} from '../../utils/config';
import styles from './profiling.module.scss';
import {useLocaleContext} from '../../../../common/contexts/LocaleContext';
import {ZephelinConfigSection} from './zephelin-config-section';

export function Profiling() {
	const projects = getProjectInfoList();
	const i10n = useLocaleContext();

	return (
		<div className={styles.page}>
			<div className={styles.header}>
				<div>
					<h1 className={styles.pageTitle}>
						{i10n?.profiling.title}{' '}
						<Badge appearance='secondary'>BETA</Badge>
					</h1>
					<span className={styles.pageTitleDescription}>
						{i10n?.profiling.subtitle}
					</span>
				</div>
			</div>
			<div className={styles.configSections}>
				{projects?.map(p => (
					<ZephelinConfigSection
						key={p.ProjectId}
						projectId={p.ProjectId}
					/>
				))}
			</div>
		</div>
	);
}
