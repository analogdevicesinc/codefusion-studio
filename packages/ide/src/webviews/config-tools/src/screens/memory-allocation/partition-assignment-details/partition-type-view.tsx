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

import {type Partition} from '../../../state/slices/partitions/partitions.reducer';
import PartitionTypeViewCard from '../partition-assignment-details-card/partition-type-view-card';
import styles from './partition-assignment-details.module.scss';

type PartitionTypeViewProps = Readonly<{
	partitionByType: Record<string, Partition[]>;
	types: string[];
	openCards: string[];
	onCardOpen: (type: string, open: boolean) => void;
}>;

export default function PartitionTypeView({
	partitionByType,
	types,
	openCards,
	onCardOpen
}: PartitionTypeViewProps) {
	const TypeView = types?.map(type => (
		<PartitionTypeViewCard
			key={type}
			partitions={partitionByType[type]}
			type={type}
			isOpen={openCards.includes(type)}
			setOpen={open => {
				onCardOpen(type, open);
			}}
		/>
	));

	return (
		<div
			className={styles.partitionViewByCards}
			data-test='partition-type-view'
		>
			{TypeView}
		</div>
	);
}
