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
import {memo} from 'react';
import ChevronRight from '@common/icons/ChevronRight';
import styles from './PeripheralSignal.module.scss';
import CircledCheckmark from '@common/icons/CircledCheckmark';
import Core from '../core/Core';

export type PeripheralSignalProps = Readonly<{
	name: string;
	isGrouped?: boolean;
	isSelected?: boolean;
	allocatedCoreId?: string;
	onClick?: () => void;
}>;

function PeripheralSignal({
	name,
	isGrouped,
	isSelected,
	allocatedCoreId,
	onClick
}: PeripheralSignalProps) {
	return (
		<div
			data-test={`peripheral-signal-${name}-container`}
			className={styles.container}
			onClick={onClick}
		>
			<div className={styles.peripheral}>
				<div
					data-test={`peripheral-signal-${name}`}
					className={isGrouped ? styles.groupedSignal : styles.signal}
				>
					{name}
				</div>
				{allocatedCoreId && (
					<div className={styles.core}>
						<Core projectId={allocatedCoreId} />
					</div>
				)}
			</div>
			{allocatedCoreId ? (
				<div
					data-test={`peripheral-signal-${name}-checkmark`}
					className={styles.checkmark}
				>
					<CircledCheckmark />
				</div>
			) : (
				!isSelected &&
				!isGrouped && (
					<div
						data-test={`peripheral-signal-${name}-chevron`}
						className={styles.chevron}
					>
						<ChevronRight />
					</div>
				)
			)}
		</div>
	);
}

export default memo(PeripheralSignal);
