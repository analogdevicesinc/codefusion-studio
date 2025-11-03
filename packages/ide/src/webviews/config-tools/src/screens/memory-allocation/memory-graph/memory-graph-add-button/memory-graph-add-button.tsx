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
import {type MemoryBlock} from '../../../../../../common/types/soc';
import {useAssignableCores} from '../../../../hooks/use-assignable-cores';
import {
	type Partition,
	setSideBarState
} from '../../../../state/slices/partitions/partitions.reducer';
import {useSidebarState} from '../../../../state/slices/partitions/partitions.selector';
import {useAppDispatch} from '../../../../state/store';
import {
	getCoreMemoryBlocks,
	getPartitionBlockNames
} from '../../../../utils/memory';
import styles from './memory-graph-add-button.module.scss';
import {useMemo, useCallback} from 'react';

type MemoryGraphAddButtonProps = Readonly<{
	address: number;
	endAddress: number;
	memoryBlock: MemoryBlock;
	offset: number;
	width: number;
}>;

export function MemoryGraphAddButton({
	address,
	endAddress,
	memoryBlock,
	offset,
	width
}: MemoryGraphAddButtonProps): JSX.Element {
	const dispatch = useAppDispatch();
	const {isSidebarMinimised, sidebarPartition} = useSidebarState();
	const assignableCores = useAssignableCores(memoryBlock);

	const size = endAddress - address + 1;
	const memoryBlocks = getCoreMemoryBlocks();
	const blocksRangeItems = useMemo(
		() => getPartitionBlockNames(memoryBlocks, address, size),
		[memoryBlocks, address, size]
	);

	const handleClick = useCallback(() => {
		if (!isSidebarMinimised) return;

		const preselectCore = assignableCores.length === 1;
		const selectedProjects = preselectCore
			? [{...assignableCores[0], owner: true}]
			: [];

		const updatedPartition: Partition = {
			...sidebarPartition,
			type: memoryBlock.Type,
			startAddress: `${address.toString(16).toUpperCase()}`,
			size,
			baseBlock: memoryBlock,
			projects: selectedProjects,
			blockNames: blocksRangeItems
		};

		dispatch(
			setSideBarState({
				isSidebarMinimised: false,
				sidebarPartition: updatedPartition
			})
		);
	}, [
		isSidebarMinimised,
		assignableCores,
		address,
		size,
		memoryBlock,
		blocksRangeItems,
		dispatch,
		sidebarPartition
	]);

	return (
		<div>
			{isSidebarMinimised && (
				<div
					key={`${memoryBlock.Name}-${address}`}
					data-test={`${memoryBlock.Name}-${address}-add-button`}
					className={styles.buttonContainer}
					style={{left: `${offset}%`, width: `${width}%`}}
					onClick={handleClick}
				>
					<button type='button' className={styles.addButton}>
						+
					</button>
				</div>
			)}
		</div>
	);
}
