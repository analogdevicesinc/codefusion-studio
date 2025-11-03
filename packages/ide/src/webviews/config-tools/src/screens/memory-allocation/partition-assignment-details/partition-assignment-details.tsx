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

import {MemoryGraph} from '../memory-graph/memory-graph';
import styles from './partition-assignment-details.module.scss';
import {
	useFilteredBlockTypes,
	useFilteredMemoryBlocks,
	useFilteredCores,
	useFilteredPartitions,
	useMemoryScreenActiveView,
	useOpenProjectCards,
	useOpenTypeCards
} from '../../../state/slices/app-context/appContext.selector';
import {Button, HamburgerIcon, MemoryIcon} from 'cfs-react-library';
import {useDispatch} from 'react-redux';
import PartitionProjectView from './partition-project-view';
import PartitionTypeView from './partition-type-view';
import {type Partition} from '../../../state/slices/partitions/partitions.reducer';
import {
	setMemoryScreenActiveView,
	setOpenProjectCards,
	setOpenTypeCards
} from '../../../state/slices/app-context/appContext.reducer';
import {useCallback} from 'react';

export default function PartitionAssignmentDetails() {
	const dispatch = useDispatch();
	const partitions = useFilteredPartitions();
	const filteredBlocks = useFilteredMemoryBlocks();
	const activeView = useMemoryScreenActiveView();
	const openProjectCards = useOpenProjectCards();
	const openTypeCards = useOpenTypeCards();

	const handleProjectCardOpenChange = useCallback(
		(projectId: string, open: boolean) => {
			const next = open
				? [...openProjectCards, projectId].filter(
						(id, idx, arr) => arr.indexOf(id) === idx
					)
				: openProjectCards.filter(id => id !== projectId);

			dispatch(setOpenProjectCards(next));
		},
		[openProjectCards, dispatch]
	);

	const handleTypeCardOpenChange = useCallback(
		(projectId: string, open: boolean) => {
			const next = open
				? [...openTypeCards, projectId].filter(
						(id, idx, arr) => arr.indexOf(id) === idx
					)
				: openTypeCards.filter(id => id !== projectId);

			dispatch(setOpenTypeCards(next));
		},
		[openTypeCards, dispatch]
	);

	const partitionByType: Record<string, Partition[]> =
		partitions.reduce<Record<string, Partition[]>>((acc, item) => {
			if (!acc[item.type]) acc[item.type] = [];
			acc[item.type].push(item);

			return acc;
		}, {});

	const types = Object.keys(partitionByType);

	return (
		<div className={styles.sectionContainer}>
			<div className={styles.memoryDetails}>
				{useFilteredBlockTypes().map(type => (
					<div key={type} className={styles.graphSection}>
						<div className={styles.memoryLabel}>
							<h5>{type.toUpperCase()}</h5>
						</div>
						<MemoryGraph
							dataTest={`memory-graph-${type}`}
							memoryBlocks={filteredBlocks.filter(
								block => block.Type === type
							)}
						/>
					</div>
				))}
			</div>
			<div className={styles.coreSection}>
				<div className={styles.partitionHeader}>
					<div className={styles.partitionCount}>
						<h2>Partitions</h2>
						<h2>{`(${partitions.length})`}</h2>
					</div>
					<div className={styles.partitionViewBy}>
						<div className={styles.viewBy}>
							<h5>View By</h5>
						</div>
						<Button
							appearance='icon'
							dataTest='partition-project-view-button'
							className={`${activeView === 'project' ? styles.selected : ''}`}
							onClick={() => {
								dispatch(setMemoryScreenActiveView('project'));
							}}
						>
							<div className={styles.viewByOption}>
								<MemoryIcon />
								<h5>Project</h5>
							</div>
						</Button>
						<Button
							appearance='icon'
							dataTest='partition-type-view-button'
							className={`${activeView === 'type' ? styles.selected : ''}`}
							onClick={() => {
								dispatch(setMemoryScreenActiveView('type'));
							}}
						>
							<div className={styles.viewByOption}>
								<HamburgerIcon />
								<h5>Type</h5>
							</div>
						</Button>
					</div>
				</div>
				{activeView === 'project' ? (
					<PartitionProjectView
						filteredCores={useFilteredCores}
						partitions={partitions}
						types={types}
						openCards={openProjectCards}
						onCardOpen={handleProjectCardOpenChange}
					/>
				) : (
					<PartitionTypeView
						partitionByType={partitionByType}
						types={types}
						openCards={openTypeCards}
						onCardOpen={handleTypeCardOpenChange}
					/>
				)}
			</div>
		</div>
	);
}
