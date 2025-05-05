/**
 *
 * Copyright (c) 2024 - 2025 Analog Devices, Inc.
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

import {Button, DropDown} from 'cfs-react-library';
import {getSocCoreList} from '../../../utils/soc-cores';
import {type PartitionCore} from '../../../state/slices/partitions/partitions.reducer';
import styles from './core-permissions.module.scss';
import DeleteIcon from '../../../../../common/icons/Delete';
import Toggle from '@common/components/toggle/Toggle';
import {
	type TLocaleContext,
	useLocaleContext
} from '@common/contexts/LocaleContext';

type CorePermissionsProps = {
	readonly core: PartitionCore;
	readonly memoryType: string;
	readonly onRemoveCore: (coreId: string) => void;
	readonly onUpdateAccess: (coreId: string, value: string) => void;
	readonly onUpdateOwner: (coreId: string, value: boolean) => void;
};

const permissions = {
	readOnly: 'R',
	readWrite: 'R/W',
	readExecute: 'R/X',
	readWriteExecute: 'R/W/X'
};

export function CorePermissions({
	core,
	memoryType,
	onRemoveCore,
	onUpdateAccess,
	onUpdateOwner
}: CorePermissionsProps) {
	const i10n: TLocaleContext | undefined = useLocaleContext()?.memory;

	const dataModelCore = getSocCoreList().find(
		socCore => socCore.Id === core.coreId
	);
	const permissionOptions = dataModelCore
		? Object.values(permissions).filter(permission =>
				dataModelCore.Memory.filter(
					block => block.Type === memoryType
				).some(block =>
					permission
						.split('/')
						.every(level => block.Access.includes(level))
				)
			)
		: [];

	return (
		<div className={styles.container}>
			<div className={styles.row}>
				<div data-test={`permission-label-${core.projectId}`}>
					{core.label}
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
				<DropDown
					controlId={'core-permission' + core.projectId}
					currentControlValue={core.access}
					options={permissionOptions.map(permission => ({
						label: i10n?.access[permission].title,
						value: permission
					}))}
					onHandleDropdown={value => {
						onUpdateAccess(core.projectId, value);
					}}
				/>
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
