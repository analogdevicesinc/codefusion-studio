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

import styles from './user-created-partitions.module.scss';
import UserCreatedPartitionAccordion from '../user-created-partition-accordion/user-created-partition-accordion';
import {useMemo} from 'react';
import {type TLocaleContext} from '../../../common/types/context';
import {useLocaleContext} from '../../../../../common/contexts/LocaleContext';
import {
	getNonVolatileData,
	getSocMemoryTypeList,
	getVolatileData
} from '../../../utils/memory';
import {useFilteredPartitions} from '../../../state/slices/app-context/appContext.selector';

export default function UserCreatedPartitions() {
	const partitions = useFilteredPartitions();
	const socMemorytypes = getSocMemoryTypeList();

	const i10n: TLocaleContext | undefined = useLocaleContext()?.memory;

	const volatileMemoryData = useMemo(
		() => getVolatileData(partitions, socMemorytypes),
		[partitions, socMemorytypes]
	);

	const nonVolatileMemoryData = useMemo(
		() => getNonVolatileData(partitions, socMemorytypes),
		[partitions, socMemorytypes]
	);

	return (
		<div data-test='user-created-partition'>
			<div className={styles.heading}>
				<div className={styles.title}>
					{i10n?.['user-partition']?.header?.title}
				</div>
			</div>

			{Boolean(volatileMemoryData.length) && (
				<div>
					<div className={styles.memoryHeading}>
						<h5 className={styles.memoryTitle}>
							{i10n?.partition?.partition_type?.volatile?.label}
						</h5>
					</div>
					<div
						className={styles.partitionList}
						data-test='volatile-parition-accordion'
					>
						{volatileMemoryData.map(partition => (
							<UserCreatedPartitionAccordion
								key={partition.displayName}
								partition={partition}
							/>
						))}
					</div>
				</div>
			)}
			{Boolean(nonVolatileMemoryData.length) && (
				<div>
					<div className={styles.memoryHeading}>
						<h5 className={styles.memoryTitle}>
							{i10n?.partition?.partition_type?.['non-volatile']}
						</h5>
					</div>
					<div
						className={styles.partitionList}
						data-test='non-volatile-accordion'
					>
						{nonVolatileMemoryData.map(partition => (
							<UserCreatedPartitionAccordion
								key={partition.displayName}
								partition={partition}
							/>
						))}
					</div>
				</div>
			)}
			{nonVolatileMemoryData.length === 0 &&
				volatileMemoryData.length === 0 && (
					<div className={styles.emptyPartitions}>
						{i10n?.['user-partition']?.empty?.title}
					</div>
				)}
		</div>
	);
}
