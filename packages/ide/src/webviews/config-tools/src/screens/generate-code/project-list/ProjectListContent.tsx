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

import {Fragment} from 'react/jsx-runtime';
import {navigationItems as navItems} from '@common/constants/navigation';

import ProjectListContentItem from './ProjectListContentItem';
import type {ProjectInfo} from '../../../utils/config';

import styles from './ProjectListContent.module.scss';

export default function ProjectListContent({
	project,
	errors
}: Readonly<{
	project: ProjectInfo;
	errors: {
		show: boolean;
		param: {
			memory: number;
			peripheral: number;
			pin: number;
			clock: number;
		};
	};
}>) {
	const {memory, peripheral, pin, clock} = errors?.param || {};

	return (
		<>
			<div className={`${styles.card} ${styles.attributes}`}>
				<Fragment key={project.ProjectId}>
					<div>Plugin ID</div>
					{project.PluginId ? (
						<div>{project.PluginId}</div>
					) : (
						<span>&#9472;</span>
					)}
				</Fragment>
			</div>
			{errors.show && (
				<div
					className={`${styles.card} ${styles.issues}`}
					data-test={`cfsSelectionCard:${project.ProjectId}:content:errors-container`}
				>
					<div className={styles.title}>Issues</div>
					{Boolean(memory) && (
						<ProjectListContentItem
							error={memory}
							path={navItems.memory}
							label='Memory Allocation.'
						/>
					)}
					{Boolean(peripheral) && (
						<ProjectListContentItem
							error={peripheral}
							path={navItems.peripherals}
							label='Peripheral Allocation.'
						/>
					)}
					{Boolean(pin) && (
						<ProjectListContentItem
							error={pin}
							path={navItems.pinmux}
							label='Pin Config.'
						/>
					)}
					{Boolean(clock) && (
						<ProjectListContentItem
							error={clock}
							path={navItems.clockConfig}
							label='Clock Config.'
						/>
					)}
				</div>
			)}
		</>
	);
}
