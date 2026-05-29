/**
 *
 * Copyright (c) 2024-2026 Analog Devices, Inc.
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

import {Badge, Button, DropDown} from 'cfs-react-library';
import {getSocCoreList} from '../../../utils/soc-cores';
import {type PartitionCore} from '../../../state/slices/partitions/partitions.reducer';
import styles from './core-permissions.module.scss';
import DeleteIcon from '../../../../../common/icons/Delete';
import Toggle from '@common/components/toggle/Toggle';
import {
	type TLocaleContext,
	useLocaleContext
} from '@common/contexts/LocaleContext';
import {getProjectInfoList} from '../../../utils/config';
import {memo, useMemo} from 'react';
import {getMemoryAccessOverrideForProject} from '../../../utils/memory-access';
import {DEFAULT_PERMISSIONS} from '../../../constants/memory';

type CorePermissionsProps = Readonly<{
	core: PartitionCore;
	memoryType: string;
	onRemoveCore: (coreId: string) => void;
	onUpdateAccess: (coreId: string, value: string) => void;
	onUpdateOwner: (coreId: string, value: boolean) => void;
}>;

export const CorePermissions = memo(
	({
		core,
		memoryType,
		onRemoveCore,
		onUpdateAccess,
		onUpdateOwner
	}: CorePermissionsProps) => {
		const i10n: TLocaleContext | undefined =
			useLocaleContext()?.memory;
		const projects = getProjectInfoList();

		const dataModelCore = getSocCoreList().find(
			socCore => socCore.Id === core.coreId
		);

		const accessOverride = getMemoryAccessOverrideForProject(
			core.projectId,
			memoryType
		);

		const permissionOptions = useMemo(
			() =>
				dataModelCore && accessOverride === undefined
					? Object.values(DEFAULT_PERMISSIONS).filter(permission =>
							dataModelCore.Memory.filter(
								block => 'Type' in block && block.Type === memoryType
							).some(block =>
								permission
									.split('/')
									// eslint-disable-next-line max-nested-callbacks
									.every(level => block.Access.includes(level))
							)
						)
					: (accessOverride ?? []),
			[accessOverride, dataModelCore, memoryType]
		);

		const secure = useMemo(() => {
			const project = projects?.find(
				p => p.ProjectId === core.projectId
			);

			return project?.Secure;
		}, [projects, core.projectId]);

		return (
			<div className={styles.container}>
				<div className={styles.row}>
					<div data-test={`permission-label-${core.projectId}`}>
						{core.label}{' '}
						{secure !== undefined && (
							<Badge appearance='secondary' className={styles.badge}>
								{secure
									? (i10n?.partition.badge.secure ?? 'Secure')
									: (i10n?.partition.badge.non_secure ??
										'Non-Secure')}
							</Badge>
						)}
					</div>
					<Button
						appearance='icon'
						dataTest={`remove-core-${core.projectId}`}
						onClick={() => {
							onRemoveCore(core.projectId);
						}}
					>
						<DeleteIcon />
					</Button>
				</div>
				<div className={styles.row}>
					{permissionOptions.length > 0 ? (
						<DropDown
							controlId={'core-permission' + core.projectId}
							currentControlValue={core.access}
							options={permissionOptions.map(permission => ({
								label:
									i10n?.access?.[permission]?.title ?? permission,
								value: permission
							}))}
							onHandleDropdown={value => {
								onUpdateAccess(core.projectId, value);
							}}
						/>
					) : (
						<span
							data-test={`no-permission-${core.projectId}`}
							className={styles.noPermission}
						>
							{i10n?.noPermissions ??
								'Permissions handled in Plugin options'}
						</span>
					)}
					<div className={styles.toggleContainer}>
						<span>{i10n?.core?.owner}</span>
						<Toggle
							isToggledOn={core.owner}
							handleToggle={() => {
								onUpdateOwner(core.projectId, !core.owner);
							}}
						/>
					</div>
				</div>
			</div>
		);
	}
);
