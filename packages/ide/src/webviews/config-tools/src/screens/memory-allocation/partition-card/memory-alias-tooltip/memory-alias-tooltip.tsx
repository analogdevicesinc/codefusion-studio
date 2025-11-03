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

import {useMemo} from 'react';
import CfsTooltip from '../../../../../../common/components/cfs-tooltip/CfsTooltip';
import {useLocaleContext} from '../../../../../../common/contexts/LocaleContext';
import type {TLocaleContext} from '../../../../common/types/context';
import {
	convertDecimalToHex,
	getAddressOffset,
	getCoreMemoryAliases,
	offsetAddress
} from '../../../../utils/memory';
import type {Partition} from '../../../../state/slices/partitions/partitions.reducer';
import styles from './memory-alias-tooltip.module.scss';

type MemoryAliasTooltipProps = Readonly<{
	position: {x: number; y: number};
	partition: Partition;
	coreIds: string[];
}>;

export function MemoryAliasTooltip({
	position,
	partition,
	coreIds
}: MemoryAliasTooltipProps): JSX.Element {
	const i10n: TLocaleContext | undefined =
		useLocaleContext()?.memory.blocks;

	const {baseBlock, startAddress} = partition;
	const endAddress = offsetAddress(startAddress, partition.size - 1);

	const memoryAliases = useMemo(
		() => getCoreMemoryAliases(baseBlock.Name, coreIds) ?? [],
		[baseBlock.Name, coreIds]
	);

	const offsetMemoryAliases = useMemo(() => {
		const baseOffset = getAddressOffset(
			baseBlock.AddressStart,
			startAddress
		);

		return memoryAliases.map(alias => {
			const addressStart = offsetAddress(
				alias.AliasBaseAddress,
				baseOffset
			);
			const addressEnd = offsetAddress(
				addressStart,
				partition.size - 1
			);

			return {
				...alias,
				OffsetAddress: addressStart,
				OffsetEndAddress: addressEnd
			};
		});
	}, [
		baseBlock.AddressStart,
		startAddress,
		memoryAliases,
		partition.size
	]);

	return (
		<div className={styles.container}>
			<CfsTooltip
				id='memory-alias-tooltip'
				left={position.x}
				top={position.y}
				isShowingNotch={false}
			>
				<div
					data-test='alias-tooltip-header'
					className={styles.header}
				>
					<h3 className={styles.heading}>
						{partition.displayName.toUpperCase()}
					</h3>
				</div>
				<div
					data-test='alias-tooltip-physical-address'
					className={`${styles.content} ${styles.gap}`}
				>
					<div className={styles.label}>
						{i10n?.['physical-address']}
					</div>
					<div className={styles.value}>
						{convertDecimalToHex(
							parseInt(partition.startAddress, 16)
						)}{' '}
						- {convertDecimalToHex(parseInt(endAddress, 16))}
					</div>
				</div>

				{offsetMemoryAliases.map(alias => (
					<div
						key={alias.OffsetAddress}
						data-test='alias-tooltip-software-address'
						className={`${styles.content} ${styles.gap}`}
					>
						<div className={styles.label}>
							{`${alias.CoreId} ${alias.AliasType} ${i10n?.address}`}
						</div>
						<div className={styles.value}>
							{convertDecimalToHex(parseInt(alias.OffsetAddress, 16))}{' '}
							-{' '}
							{convertDecimalToHex(
								parseInt(alias.OffsetEndAddress, 16)
							)}
						</div>
					</div>
				))}
			</CfsTooltip>
		</div>
	);
}
