/**
 *
 * Copyright (c) 2026 Analog Devices, Inc.
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
	DataGrid,
	DataGridCell,
	DataGridRow
} from 'cfs-react-library';
import ChevronRight from '@common/icons/ChevronRight';
import styles from './manage-access-permissions.module.scss';
import {
	type TLocaleContext,
	useLocaleContext
} from '../../../../../../common/contexts/LocaleContext';
import {getProjectInfoList} from '../../../../utils/config';

export function ManageAccessPermissions() {
	const l10n: TLocaleContext | undefined =
		useLocaleContext()?.firewallOverview;

	const projectInfoList = getProjectInfoList() ?? [];

	return (
		<div
			className={styles.manageAccessPermissions}
			data-test='manage-access-permissions'
		>
			<div className={styles.titleRow}>
				<h1>
					{l10n?.manageAccessPermissions?.title ??
						'Manage Access Permissions'}
				</h1>
				<Badge
					appearance='secondary'
					dataTest='manage-access-permissions:count'
				>
					{projectInfoList.length}
				</Badge>
			</div>
			<DataGrid
				className={styles.table}
				gridTemplateColumns='1fr 1fr'
				dataTest='manage-access-permissions:table'
			>
				<DataGridRow rowType='header' className={styles.tableHeader}>
					<DataGridCell cellType='columnheader' gridColumn='1'>
						{l10n?.manageAccessPermissions?.columns?.coreInitiator ??
							'CORE INITIATOR'}
					</DataGridCell>
					<DataGridCell cellType='columnheader' gridColumn='2'>
						{l10n?.manageAccessPermissions?.columns?.firewalls ??
							'FIREWALLS'}
					</DataGridCell>
				</DataGridRow>
				{projectInfoList.map(project => (
					<DataGridRow
						key={project.CoreId}
						className={styles.tableRow}
					>
						<DataGridCell gridColumn='1'>
							<span className={styles.coreInitiatorCell}>
								{project.Name}
							</span>
						</DataGridCell>
						<DataGridCell gridColumn='2'>
							<span className={styles.firewallsCell}>
								0
								<ChevronRight />
							</span>
						</DataGridCell>
					</DataGridRow>
				))}
			</DataGrid>
		</div>
	);
}
