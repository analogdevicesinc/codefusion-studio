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
import CfsTwoColumnLayout from '@common/components/cfs-main-layout/CfsMainLayout';
import {Button} from 'cfs-react-library';
import {useEffect, useState} from 'react';
import styles from './MemoryAllocation.module.scss';
import {type MemoryBlock} from '../../../../common/types/soc';
import MemoryAccordion from './memory-accordion/memory-accordion';
import {useSidebarState} from '../../state/slices/partitions/partitions.selector';
import {PartitionSidebar} from './partition-sidebar/partition-sidebar';
import UserCreatedPartitions from './user-created-partitions/user-created-partitions';
import PartitionAssignmentDetails from './partition-assignment-details/partition-assignment-details';
import {useAppDispatch} from '../../state/store';
import {MemoryFiltering} from './memory-filtering/memory-filtering';
import {type TLocaleContext} from '../../common/types/context';
import {useLocaleContext} from '../../../../common/contexts/LocaleContext';
import {setSideBarState} from '../../state/slices/partitions/partitions.reducer';
import {useFilteredMemoryBlocks} from '../../state/slices/app-context/appContext.selector';
import EightColumnLayout from '../../components/eight-column-layout/EightColumnLayout';

function MemoryAllocation() {
	// We need to keep the sidebar in the DOM for the animation to work.
	// So the touched state needs to be reset when the sidebar is opened.
	const [isPartitionFormTouched, setIsPartitionFormTouched] =
		useState(false);
	const {isSidebarMinimised, sidebarPartition} = useSidebarState();
	const dispatch = useAppDispatch();
	const memoryBlocks: MemoryBlock[] = useFilteredMemoryBlocks();
	const i10n: TLocaleContext | undefined = useLocaleContext()?.memory;
	const [innerWidth, setInnerWidth] = useState(window.innerWidth);
	const [innerHeight, setInnerHeight] = useState(window.innerHeight);

	useEffect(() => {
		const handleResize = () => {
			setInnerWidth(window.innerWidth);
			setInnerHeight(window.innerHeight);
		};

		window.addEventListener('resize', handleResize);

		return () => {
			window.removeEventListener('resize', handleResize);
		};
	}, []);

	const openSlider = (): void => {
		if (isSidebarMinimised) {
			dispatch(
				setSideBarState({isSidebarMinimised: false, sidebarPartition})
			);
		}
	};

	const closeSlider = (): void => {
		dispatch(
			setSideBarState({
				isSidebarMinimised: true,
				sidebarPartition: {
					displayName: '',
					type: '',
					baseBlock: {
						Name: '',
						Description: '',
						AddressStart: '',
						AddressEnd: '',
						Width: 0,
						Access: '',
						Location: '',
						Type: ''
					},
					blockNames: [],
					startAddress: '',
					size: 0,
					projects: [],
					config: {}
				}
			})
		);

		if (isPartitionFormTouched) {
			setIsPartitionFormTouched(false);
		}
	};

	return innerWidth < 900 || innerHeight < 475 ? (
		<EightColumnLayout
			header='Memory Allocation'
			subtitle='This feature is not currently supported for windows this size. If possible please increase the size of this window.'
		/>
	) : (
		<CfsTwoColumnLayout>
			<div className={styles.header} slot='header'>
				<MemoryFiltering />
				<PartitionSidebar
					isFormTouched={isPartitionFormTouched}
					partition={sidebarPartition}
					onClose={closeSlider}
					onFormTouched={setIsPartitionFormTouched}
				/>
			</div>
			<div slot='side-panel'>
				<div>
					<div className={styles.heading}>
						<div className={styles.title}>
							{i10n?.blocks['memory-blocks']}
						</div>
						<div className={styles.caption}>
							{i10n?.blocks['available-total']}
						</div>
					</div>
					{memoryBlocks.length > 0 ? (
						memoryBlocks?.map(block => (
							<MemoryAccordion key={block.Name} memoryBlock={block} />
						))
					) : (
						<div
							className={styles.noData}
							data-test='no-memory-blocks'
						>
							{i10n?.blocks['no-blocks-found']}
						</div>
					)}
				</div>
				<div className={styles.btnContainer}>
					<Button
						className={styles.btn}
						dataTest='create-partition-btn'
						disabled={!isSidebarMinimised}
						onClick={() => {
							openSlider();
						}}
					>
						{i10n?.partition.create}
					</Button>
				</div>
				<UserCreatedPartitions />
			</div>

			<div slot='center' className={styles.partitionDetailsContainer}>
				<PartitionAssignmentDetails />
			</div>
		</CfsTwoColumnLayout>
	);
}

export default MemoryAllocation;
