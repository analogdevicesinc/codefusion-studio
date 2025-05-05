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

import {
	Badge,
	MultiSelect,
	type MultiSelectOption
} from 'cfs-react-library';
import styles from './AssignedCores.module.scss';
import {type PartitionCore} from '../../../state/slices/partitions/partitions.reducer';
import {CorePermissions} from '../core-permissions/core-permissions';
import {getSocCoreList} from '../../../utils/soc-cores';
import {type TLocaleContext} from '../../../common/types/context';
import {useLocaleContext} from '../../../../../common/contexts/LocaleContext';
import {
	getProjectInfoList,
	type ProjectInfo
} from '../../../utils/config';
import {useMemo} from 'react';

type AssignedCoresSectionProps = {
	readonly assignedCores: PartitionCore[];
	readonly errors: {
		displayName: string;
		type: string;
		cores: string;
		startAddress: string;
		size: string;
	};
	readonly memoryType: string;
	readonly onCoreChange: (cores: PartitionCore[]) => void;
};

export function AssignedCoresSection({
	assignedCores,
	errors,
	memoryType,
	onCoreChange
}: AssignedCoresSectionProps) {
	const i10n: TLocaleContext | undefined =
		useLocaleContext()?.memory?.['user-partition'];
	const socCores = getSocCoreList();
	const projects = getProjectInfoList();
	const sortedCores = [...assignedCores].sort((a, b) =>
		a.projectId.localeCompare(b.projectId)
	);

	const formatDropdownText = () => {
		if (assignedCores.length === 0) {
			return 'Select cores';
		}

		if (assignedCores.length === 1) {
			return assignedCores[0].label;
		}

		return `${assignedCores.length} Cores Selected`;
	};

	// Get the cores that can access this memory type
	const optionsFromProjects = (projects: ProjectInfo[] | undefined) =>
		projects
			?.filter(project => {
				const socCore = socCores.find(
					core => core.Id === project.CoreId
				);

				return socCore?.Memory.some(
					memory => memory.Type === memoryType
				);
			})
			.map(project => ({
				label: (
					<div>
						{project.Description}&nbsp;
						{project.Secure ? (
							<Badge appearance='secondary'>S</Badge>
						) : project.Secure === false ? (
							<Badge appearance='secondary'>NS</Badge>
						) : (
							''
						)}
					</div>
				),
				value: project.ProjectId,
				coreId: project.CoreId
			})) ?? [];

	const chipText = useMemo(() => {
		if (assignedCores.length !== 1) {
			return '';
		}

		if (assignedCores.length === 1) {
			const projectInfo = projects?.find(project =>
				assignedCores?.find(
					core => core.projectId === project.ProjectId
				)
			);

			return `${projectInfo?.Secure ? 'S' : projectInfo?.Secure === false ? 'NS' : ''}`;
		}
	}, [assignedCores, projects]);

	return (
		<div className={styles.section}>
			<h3>{i10n?.['assigned-cores']?.label}</h3>
			<MultiSelect
				error={errors?.cores}
				disabled={!optionsFromProjects(projects).length}
				dropdownText={formatDropdownText()}
				options={optionsFromProjects(projects)}
				dataTest='assigned-cores-multiselect'
				chipText={chipText}
				initialSelectedOptions={optionsFromProjects(
					projects?.filter(core =>
						assignedCores.some(c => c.projectId === core.ProjectId)
					)
				)}
				onSelection={(selectedCores: MultiSelectOption[]) => {
					onCoreChange(
						selectedCores.map(core => {
							const existingCore = assignedCores.find(
								c => c.projectId === core.value
							);
							const projectInfo = projects?.find(
								project => project.ProjectId === core.value
							);

							if (existingCore) {
								return existingCore;
							}

							const label = projectInfo?.Description;

							return {
								projectId: core.value,
								label: label ?? '',
								coreId: projectInfo?.CoreId ?? '',
								access: 'R',
								owner: assignedCores.length === 0
							} satisfies PartitionCore;
						})
					);
				}}
			/>
			{sortedCores.map(core => (
				<CorePermissions
					key={core.projectId}
					core={core}
					memoryType={memoryType}
					onRemoveCore={coreId => {
						onCoreChange(
							assignedCores.filter(c => c.projectId !== coreId)
						);
					}}
					onUpdateAccess={(id, value) => {
						onCoreChange(
							assignedCores.map(core =>
								core.projectId === id
									? {...core, access: value}
									: core
							)
						);
					}}
					onUpdateOwner={(id, value) => {
						onCoreChange(
							assignedCores.map(core =>
								core.projectId === id
									? {...core, owner: value}
									: {...core, owner: false}
							)
						);
					}}
				/>
			))}
		</div>
	);
}
