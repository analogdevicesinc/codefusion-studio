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

import {Badge, Button, InfoIcon} from 'cfs-react-library';
import {
	type PartitionCore,
	type Partition,
	removePartition,
	setSideBarState
} from '../../../state/slices/partitions/partitions.reducer';
import MemoryCard from '../memory-card/memory-card';
import DeleteIcon from '../../../../../common/icons/Delete';
import styles from './partition-details-view-card.module.scss';
import type {TLocaleContext} from '../../../common/types/context';
import {useLocaleContext} from '@common/contexts/LocaleContext';
import {
	convertDecimalToHex,
	formatBytesToKbOrMb,
	getCoreMemoryAliases,
	getEndAddress
} from '../../../utils/memory';
import {useAppDispatch} from '../../../state/store';
import {type ProjectInfo} from '../../../utils/config';
import {useFilteredCores} from '../../../state/slices/app-context/appContext.selector';
import ConfigIcon16px from '../../../../../common/icons/Config16px';
import {useCallback, useMemo, useRef, useState} from 'react';
import {MemoryAliasTooltip} from './memory-alias-tooltip/memory-alias-tooltip';
import {isProjectSecure} from '../../../utils/soc-cores';
import Tooltip from '../../../../../common/components/tooltip/Tooltip';
import {
	NON_SECURE_ABBR,
	SECURE_ABBR
} from '../../../../../common/constants/core-properties';
import {getMemoryAccessOverrideForProject} from '../../../utils/memory-access';

type PartitionDetailsProjectViewCardProp = Readonly<{
	partition: Partition;
	project: ProjectInfo;
	dataTest?: string;
}>;

export default function PartitionDetailsProjectViewCard({
	partition,
	project,
	dataTest
}: PartitionDetailsProjectViewCardProp) {
	const i10n: TLocaleContext | undefined =
		useLocaleContext()?.memory?.access;
	const dispatch = useAppDispatch();
	const graphMousePosition = useRef<{x: number; y: number}>({
		x: 0,
		y: 0
	});
	const [isHovering, setIsHovering] = useState(false);
	const currentProject = partition.projects.find(
		(partitionCore: PartitionCore) =>
			project.ProjectId === partitionCore.projectId
	);
	const filteredCores = useFilteredCores();
	const assignedProjects = useMemo(
		() =>
			partition.projects
				.filter(core =>
					filteredCores.some(c => c.ProjectId === core.projectId)
				)
				.map(core => ({
					...core,
					secure: filteredCores.find(
						c => c.ProjectId === core.projectId
					)?.Secure
				})),
		[partition.projects, filteredCores]
	);

	const onInfoIconHover = useCallback(
		(event: React.MouseEvent<HTMLElement>) => {
			const bounds =
				event.currentTarget.parentElement?.getBoundingClientRect();

			if (bounds) {
				const isNearBottom = window.innerHeight - bounds.bottom < 150;
				let y: number;

				if (isNearBottom) {
					y = event.clientY - bounds.top - 55;
				} else {
					y = event.clientY - bounds.bottom + 55;
				}

				graphMousePosition.current = {
					x: event.clientX - bounds.left,
					y
				};
				setIsHovering(true);
			}
		},
		[]
	);

	if (!currentProject) return null;

	/** NOTE If no override exists for this project and memory type,
	 * default to showing the project's access permissions.
	 * If an override exists but has no defined access (aka Plugin options handle this),
	 * default to no access (undefined) which hides the badge.
	 * So we have those three scenarios:
	 * - No overrides -> Default behavior
	 * - Override but no options -> Show message aka managed in plugins
	 * - Multiple overrides -> Show in dropdown
	 **/
	const overriddenAccess = getMemoryAccessOverrideForProject(
		currentProject.projectId,
		partition.type
	);
	const projectAccess =
		overriddenAccess?.length === 0
			? undefined
			: currentProject.access;

	const secureCoreId = isProjectSecure(currentProject.projectId)
		? currentProject.coreId
		: '';

	const showInfoIcon = Boolean(
		secureCoreId &&
			getCoreMemoryAliases(partition.baseBlock.Name, [secureCoreId])
				.length > 0
	);

	const partitionStartAddress = parseInt(partition.startAddress, 16);
	const endAddress = getEndAddress(
		partitionStartAddress,
		partition.size
	);

	function deletePartition(startAddress: string) {
		dispatch(removePartition({startAddress}));
	}

	function editPartition(partition: Partition) {
		dispatch(
			setSideBarState({
				isSidebarMinimised: false,
				sidebarPartition: partition
			})
		);
	}

	return (
		<div className={styles.partitionsCards} data-test={dataTest}>
			<MemoryCard isExpandable={false} isParent={false}>
				<div slot='title'>
					<div className={styles.memoryCardTitleSection}>
						<div className={styles.memoryCardTitleInfo}>
							<div
								className={styles.memoryCardTitle}
								data-test={`${currentProject.projectId}-partition-card-title`}
							>
								<h3>{partition.displayName}</h3>
								<p>
									{partition.size
										? formatBytesToKbOrMb(partition.size)
										: '0 KB'}
								</p>
							</div>
							<Badge appearance='secondary'>{partition.type}</Badge>
						</div>

						<p
							className={styles.memoryCardDetails}
							data-test='partition-address'
						>
							{`${convertDecimalToHex(partitionStartAddress)} - ${convertDecimalToHex(endAddress)}`}
							{showInfoIcon && (
								<div
									data-test={`${currentProject.projectId}-partition-card-details-info-icon`}
									className={styles.infoIcon}
									onMouseEnter={onInfoIconHover}
									onMouseLeave={() => {
										setIsHovering(false);
									}}
								>
									<InfoIcon />
								</div>
							)}
							{isHovering && (
								<MemoryAliasTooltip
									position={graphMousePosition.current}
									partition={partition}
									coreIds={[secureCoreId]}
								/>
							)}
						</p>
					</div>
				</div>
				<div slot='end'>
					<div className={styles.partitionEnd}>
						<div className={styles.partitionAccessBadge}>
							{assignedProjects?.map(assignedProject => (
								<Badge
									key={assignedProject.projectId}
									appearance='secondary'
									className={styles.partitionCardInfoBadge}
								>
									{assignedProject.label}
									{assignedProject.secure !== undefined && (
										<>
											{' '}
											(
											{assignedProject.secure
												? SECURE_ABBR
												: NON_SECURE_ABBR}
											)
										</>
									)}
								</Badge>
							))}
							{projectAccess && (
								<Badge
									appearance='secondary'
									className={styles.partitionCardInfoBadge}
								>
									{i10n?.[projectAccess]?.title ?? projectAccess}
								</Badge>
							)}
						</div>
						<div className={styles.actionButton}>
							<Tooltip title='Configure' type='long'>
								<Button
									dataTest='edit-partition-btn'
									appearance='icon'
									onClick={() => {
										editPartition(partition);
									}}
								>
									<ConfigIcon16px
										className={styles.configActionButton}
									/>
								</Button>
							</Tooltip>
							<Tooltip title='Remove' type='long'>
								<Button
									dataTest='delete-partition-btn'
									appearance='icon'
									onClick={() => {
										deletePartition(partition.startAddress);
									}}
								>
									<DeleteIcon className={styles.deleteActionButton} />
								</Button>
							</Tooltip>
						</div>
					</div>
				</div>
			</MemoryCard>
		</div>
	);
}
