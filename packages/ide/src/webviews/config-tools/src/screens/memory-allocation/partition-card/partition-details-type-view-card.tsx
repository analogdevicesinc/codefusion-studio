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

import {
	removePartition,
	setSideBarState,
	type Partition
} from '../../../state/slices/partitions/partitions.reducer';
import {useAppDispatch} from '../../../state/store';
import {
	convertDecimalToHex,
	formatBytesToKbOrMb,
	getCoreMemoryAliases,
	getEndAddress
} from '../../../utils/memory';
import MemoryCard from '../memory-card/memory-card';
import {Badge, InfoIcon} from 'cfs-react-library';
import DeleteIcon from '../../../../../common/icons/Delete';
import styles from './partition-details-view-card.module.scss';
import {useFilteredCores} from '../../../state/slices/app-context/appContext.selector';
import ConfigIcon16px from '../../../../../common/icons/Config16px';
import {isCoreSecure} from '../../../utils/soc-cores';
import {useCallback, useMemo, useRef, useState} from 'react';
import {MemoryAliasTooltip} from './memory-alias-tooltip/memory-alias-tooltip';

type PartitionDetailsTypeViewCardProp = Readonly<{
	partition: Partition;
	dataTest?: string;
}>;

export default function PartitionDetailsTypeViewCard({
	partition,
	dataTest
}: PartitionDetailsTypeViewCardProp) {
	const dispatch = useAppDispatch();
	const [isHovering, setIsHovering] = useState(false);
	const graphMousePosition = useRef<{x: number; y: number}>({
		x: 0,
		y: 0
	});
	const partitionStartAddress = parseInt(partition.startAddress, 16);
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
	const secureCoreIds = assignedProjects
		.filter(c => isCoreSecure(c))
		.map(c => c.coreId);

	const showInfoIcon = useMemo(
		() =>
			getCoreMemoryAliases(partition.baseBlock.Name, secureCoreIds)
				.length > 0,
		[partition.baseBlock.Name, secureCoreIds]
	);

	const endAddress = getEndAddress(
		partitionStartAddress,
		partition.size
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
							<div className={styles.memoryCardTitle}>
								<h3>{partition.displayName}</h3>
								<p>
									{partition.size
										? formatBytesToKbOrMb(partition.size)
										: '0 KB'}
								</p>
							</div>
						</div>

						<p className={styles.memoryCardDetails}>
							{`${convertDecimalToHex(partitionStartAddress)} - ${convertDecimalToHex(endAddress)}`}
							{showInfoIcon && (
								<div
									data-test={`${partition.displayName}-partition-card-details-info-icon`}
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
									coreIds={secureCoreIds}
								/>
							)}
						</p>
					</div>
				</div>
				<div slot='end'>
					<div className={styles.partitionEnd}>
						{assignedProjects.map(project => (
							<div
								key={project.projectId}
								className={styles.partitionAccessBadge}
							>
								<Badge
									appearance='secondary'
									className={styles.partitionCardInfoBadge}
								>
									{project.label}
								</Badge>
							</div>
						))}
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
