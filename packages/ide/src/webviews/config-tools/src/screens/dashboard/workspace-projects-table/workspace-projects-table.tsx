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

import {DataGrid, DataGridCell, DataGridRow} from 'cfs-react-library';
import styles from './workspace-projects-table.module.scss';
import {type TLocaleContext} from '../../../common/types/context';
import {useLocaleContext} from '../../../../../common/contexts/LocaleContext';
import {getProjectInfoList} from '../../../utils/config';
import WorkspaceProjectsRow from '../workspace-projects-row/workspace-projects-row';

function WorksProjectsTable() {
	const i10n: TLocaleContext | undefined =
		useLocaleContext()?.dashboard?.workspace_projects_table;
	const projectInfoList = getProjectInfoList();

	return (
		<div className={styles.workspaceTableContainer}>
			<h2>{i10n?.table?.title}</h2>
			<div className={styles.gridContainer}>
				<DataGrid
					className={styles.workspaceTable}
					dataTest='workspace-table'
				>
					<DataGridRow
						rowType='header'
						className={styles.workspaceTableHeader}
					>
						<DataGridCell
							gridColumn='1'
							cellType='columnheader'
							className={styles.coreCol}
						>
							{i10n?.column?.core}
						</DataGridCell>
						<DataGridCell
							gridColumn='2'
							cellType='columnheader'
							className={styles.workspaceCol}
						>
							{i10n?.column?.['code-generation']}
						</DataGridCell>
						<DataGridCell
							gridColumn='3'
							cellType='columnheader'
							className={styles.colHeader}
						>
							{i10n?.column?.['allocated-peripherals']}
						</DataGridCell>
						<DataGridCell
							gridColumn='4'
							cellType='columnheader'
							className={styles.colHeader}
						>
							{i10n?.column?.['assigned-pins']}
						</DataGridCell>
						<DataGridCell
							gridColumn='5'
							cellType='columnheader'
							className={styles.colHeader}
						>
							{i10n?.column?.['memory-partitions']}
						</DataGridCell>
					</DataGridRow>
					{projectInfoList?.map(project => (
						<WorkspaceProjectsRow
							key={project.ProjectId}
							project={project}
						/>
					))}
				</DataGrid>
			</div>
		</div>
	);
}

export default WorksProjectsTable;
