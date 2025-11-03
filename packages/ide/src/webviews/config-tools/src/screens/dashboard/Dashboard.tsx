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

import {useLocaleContext} from '../../../../common/contexts/LocaleContext';
import {type TLocaleContext} from '../../common/types/context';
import SingleColumnLayout from '@common/components/single-column-layout/single-column-layout';
import {getCfsConfigDict} from '../../utils/config';
import styles from './Dashboard.module.scss';
import SystemPlannerConfigToolsList from './system-planner-config-tools-list/system-planner-config-tools-list';
import WorksProjectsTable from './workspace-projects-table/workspace-projects-table';
import {helpDoclinks} from '../../common/constants/mocked-help-links';

function Dashboard() {
	const i10n: TLocaleContext | undefined =
		useLocaleContext()?.dashboard;
	const socConfig = getCfsConfigDict();

	return (
		<SingleColumnLayout
			variant='low-density'
			body={
				<div className={styles.dashboardContainer}>
					<div className={styles.dashboardLeftPanel}>
						<div className={styles.socDetailsContainer}>
							<h1>{socConfig?.Soc.toUpperCase() ?? ''}</h1>
							<div>{`${socConfig?.BoardName ?? ''} ${socConfig?.Package ?? ''}`}</div>
						</div>
						<div className={styles.helpSection}>
							<h3>{i10n?.helpSection?.title}</h3>
							<div className={styles.helpLinksList}>
								<div className={styles.helpLink}>
									{helpDoclinks['config-tools'].documentation.map(
										item => (
											<div key={item.name}>
												<a href={item.url}>
													{
														i10n?.helpSection?.[
															'cfs-configuration-tools-overview'
														]
													}
												</a>
											</div>
										)
									)}

									{socConfig?.Soc
										? helpDoclinks[
												socConfig?.Soc.toUpperCase()
											]?.documentation.map(item => (
												<div key={item.name}>
													<a href={item.url}>{item.name}</a>
												</div>
											))
										: ''}
								</div>
							</div>
						</div>
					</div>
					<div className={styles.mainContent}>
						<SystemPlannerConfigToolsList />
						<WorksProjectsTable />
					</div>
				</div>
			}
		/>
	);
}

export default Dashboard;
