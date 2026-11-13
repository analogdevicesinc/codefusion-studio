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

import {Fragment} from 'react/jsx-runtime';
import {navigationItems as navItems} from '@common/constants/navigation';

import ProjectListContentItem from './ProjectListContentItem';
import type {ProjectInfo} from '../../../utils/config';
import type {TLocaleContext} from '../../../common/types/context';
import {useLocaleContext} from '../../../../../common/contexts/LocaleContext';
import {localizeMessage} from '../../../../../common/utils/localization';

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
			dfg: number;
			mcuboot: number;
			firewall: number;
			profiling: number;
		};
	};
}>) {
	const {
		memory,
		peripheral,
		pin,
		clock,
		dfg,
		mcuboot,
		firewall,
		profiling
	} = errors?.param || {};
	const l10n: TLocaleContext | undefined =
		useLocaleContext()?.generateCode;

	return (
		<>
			<div className={`${styles.card} ${styles.attributes}`}>
				<Fragment key={project.ProjectId}>
					<div>{localizeMessage(l10n, 'pluginId')}</div>
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
					<div className={styles.title}>
						{localizeMessage(l10n, 'issuesTitle')}
					</div>
					{Boolean(memory) && (
						<ProjectListContentItem
							error={memory}
							path={navItems.memory}
							label={localizeMessage(l10n, 'issueLabels.memory')}
						/>
					)}
					{Boolean(peripheral) && (
						<ProjectListContentItem
							error={peripheral}
							path={navItems.peripherals}
							label={localizeMessage(l10n, 'issueLabels.peripheral')}
						/>
					)}
					{Boolean(pin) && (
						<ProjectListContentItem
							error={pin}
							path={navItems.pinmux}
							label={localizeMessage(l10n, 'issueLabels.pin')}
						/>
					)}
					{Boolean(clock) && (
						<ProjectListContentItem
							error={clock}
							path={navItems.clockConfig}
							label={localizeMessage(l10n, 'issueLabels.clock')}
						/>
					)}
					{Boolean(dfg) && (
						<ProjectListContentItem
							error={dfg}
							path={navItems.dfg}
							label={localizeMessage(l10n, 'issueLabels.dfg')}
						/>
					)}
					{Boolean(mcuboot) && (
						<ProjectListContentItem
							error={mcuboot}
							path={navItems.mcubootConfig}
							label={localizeMessage(l10n, 'issueLabels.mcuboot')}
						/>
					)}
					{Boolean(firewall) && (
						<ProjectListContentItem
							error={firewall}
							path={navItems.firewallConfig}
							label={localizeMessage(l10n, 'issueLabels.firewall')}
						/>
					)}
					{Boolean(profiling) && (
						<ProjectListContentItem
							error={profiling}
							path={navItems.profiling}
							label={localizeMessage(l10n, 'issueLabels.profiling')}
						/>
					)}
				</div>
			)}
		</>
	);
}
