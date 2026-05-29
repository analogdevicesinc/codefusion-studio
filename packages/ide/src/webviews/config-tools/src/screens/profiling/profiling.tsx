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
	Badge,
	Button,
	CollapseAllIcon,
	ExpandAllIcon
} from 'cfs-react-library';
import {
	getProjectInfoList,
	type ProjectInfo
} from '../../utils/config';
import styles from './profiling.module.scss';
import {useLocaleContext} from '../../../../common/contexts/LocaleContext';
import ZephelinConfigurationHeader from './zephelin-configuration-header';
import {useState} from 'react';

export function Profiling() {
	const projects = getProjectInfoList();
	const i10n = useLocaleContext()?.profiling;
	const [expandedProjects, setExpandedProjects] = useState<
		Record<string, boolean>
	>(reduceToExpandedRecord(projects, false));

	const expandAll = () => {
		setExpandedProjects(reduceToExpandedRecord(projects, true));
	};

	const collapseAll = () => {
		setExpandedProjects(reduceToExpandedRecord(projects, false));
	};

	const toggleExpand = (projectId: string) => {
		const project = projects?.find(p => p.ProjectId === projectId);

		if (!project || project.ExternallyManaged) {
			return;
		}

		setExpandedProjects(prevExpandedProjects => ({
			...prevExpandedProjects,
			[projectId]: !prevExpandedProjects[projectId]
		}));
	};

	return (
		<div className={styles.page}>
			<div className={styles.container}>
				<header className={styles.header}>
					<div className={styles.titleContainer}>
						<h1 className={styles.title}>
							{i10n.title}
							<Badge appearance='primary'>BETA</Badge>
						</h1>
						<p className={styles.titleDescription}>{i10n.subtitle}</p>
					</div>
					<div className={styles.headerControls}>
						<Button
							appearance='icon'
							disabled={Object.values(expandedProjects).every(
								expanded => expanded
							)}
							className={styles.icon}
							onClick={expandAll}
						>
							<ExpandAllIcon />
						</Button>

						<Button
							appearance='icon'
							disabled={Object.values(expandedProjects).every(
								expanded => !expanded
							)}
							className={styles.icon}
							onClick={collapseAll}
						>
							<CollapseAllIcon />
						</Button>
					</div>
				</header>

				<div className={styles.configSections}>
					{projects
						?.filter(p => p.FirmwarePlatform === 'zephyr')
						.map(p => (
							<ZephelinConfigurationHeader
								key={p.ProjectId}
								project={p}
								isExpanded={Boolean(expandedProjects[p.ProjectId])}
								onToggleExpand={toggleExpand}
							/>
						))}
				</div>
			</div>
		</div>
	);
}

function reduceToExpandedRecord(
	projects: ProjectInfo[] | undefined,
	target: boolean
): Record<string, boolean> {
	if (!projects) {
		return {};
	}

	return projects.reduce<Record<string, boolean>>((acc, project) => {
		if (!project.ExternallyManaged) {
			acc[project.ProjectId] = target;
		}

		return acc;
	}, {});
}
