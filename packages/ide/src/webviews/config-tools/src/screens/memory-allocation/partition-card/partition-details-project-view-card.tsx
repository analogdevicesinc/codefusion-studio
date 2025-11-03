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

import {Badge, InfoIcon} from 'cfs-react-library';
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
			partition.projects.filter(core =>
				filteredCores.some(
					project => core.projectId === project.ProjectId
				)
			),
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
			<MemoryCard isExpandable={false}>
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

						<p className={styles.memoryCardDetails}>
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
							{assignedProjects?.map(project => (
								<Badge
									key={project.projectId}
									appearance='secondary'
									className={styles.partitionCardInfoBadge}
								>
									{project.label}
								</Badge>
							))}
							<Badge
								appearance='secondary'
								className={styles.partitionCardInfoBadge}
							>
								{i10n?.[currentProject.access]?.title ?? ''}
							</Badge>
						</div>
						<div className={styles.actionButton}>
							<ConfigIcon16px
								data-Test='edit-partition-btn'
								className={styles.configActionButton}
								onClick={() => {
									editPartition(partition);
								}}
							/>
							<DeleteIcon
								data-test='delete-partition-btn'
								className={styles.deleteActionButton}
								onClick={() => {
									deletePartition(partition.startAddress);
								}}
							/>
						</div>
					</div>
				</div>
			</MemoryCard>
		</div>
	);
}
