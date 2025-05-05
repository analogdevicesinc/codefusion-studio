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

import CfsTooltip from '../../../../../../common/components/cfs-tooltip/CfsTooltip';
import {type Partition} from '../../../../state/slices/partitions/partitions.reducer';
import styles from './memory-graph-tooltip.module.scss';
import {
	convertBytesToKbOrMb,
	convertDecimalToHex,
	getEndAddress
} from '../../../../utils/memory';
import {type TLocaleContext} from '../../../../common/types/context';
import {useLocaleContext} from '../../../../../../common/contexts/LocaleContext';

type MemoryGraphTooltipProps = {
	readonly position: number;
	readonly partition: Partition;
};

export function MemoryGraphTooltip({
	position,
	partition
}: MemoryGraphTooltipProps): JSX.Element {
	const i10n: TLocaleContext | undefined =
		useLocaleContext()?.memory['user-partition'];
	const partitionEndAddress = getEndAddress(
		parseInt(partition.startAddress, 16),
		partition.size
	);

	return (
		<div className={styles.container}>
			<CfsTooltip
				id='memory-graph-tooltip'
				left={position}
				top={22}
				isShowingNotch={false}
			>
				<div className={styles.header}>
					<h3 className={styles.heading}>
						{partition.displayName.toUpperCase()}
					</h3>
					<div className={styles.size}>
						({convertBytesToKbOrMb(partition.size, true)})
					</div>
				</div>
				<div className={styles.content}>
					<div className={styles.label}>
						{i10n?.['assigned-cores'].label}
					</div>
					<div className={styles.value}>
						{partition.projects.map(core => core.label).join(', ')}
					</div>
				</div>
				<div className={`${styles.content} ${styles.gap}`}>
					<div className={styles.label}>{i10n?.range}</div>
					<div className={styles.value}>
						{convertDecimalToHex(
							parseInt(partition.startAddress, 16)
						)}{' '}
						- {convertDecimalToHex(partitionEndAddress)}
					</div>
				</div>
			</CfsTooltip>
		</div>
	);
}
