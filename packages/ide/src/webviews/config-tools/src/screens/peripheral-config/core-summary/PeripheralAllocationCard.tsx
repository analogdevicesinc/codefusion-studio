/**
 *
 * Copyright (c) 2024-2025 Analog Devices, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES or conditions of any kind, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import {Card} from 'cfs-react-library';
import type {
	FormattedPeripheral,
	FormattedPeripheralSignal
} from '@common/types/soc';
import SignalEntry from './SignalEntry';
import PeripheralEntry from './PeripheralEntry';
import type {PeripheralConfig} from '../../../types/peripherals';
import styles from './CoreSummaryEntry.module.scss';
import {useState} from 'react';
import ChevronRight from '../../../../../common/icons/ChevronRight';
import {getPreallocatedPeripherals} from '../../../utils/soc-peripherals';
import {getControlsFromCache} from '../../../utils/api';
import {CONTROL_SCOPES} from '../../../constants/scopes';

type PeripheralAllocationCardProps = Readonly<{
	projectId: string;
	// Unify the type of peripheral when refactoring function config
	peripheral:
		| FormattedPeripheral<FormattedPeripheralSignal>
		| PeripheralConfig;
}>;

function PeripheralAllocationCard({
	projectId,
	peripheral
}: PeripheralAllocationCardProps) {
	const [isOpen, setIsOpen] = useState<boolean>(false);
	const signalCount = Object.keys(peripheral.signals).length;

	const projectControls = getControlsFromCache(
		CONTROL_SCOPES.PERIPHERAL,
		projectId
	);

	const isPreassigned =
		getPreallocatedPeripherals()[projectId]?.some(
			preallocatedPeripheral =>
				preallocatedPeripheral.name === peripheral.name
		) ?? false;

	return (
		<Card
			key={peripheral.name}
			disableHoverEffects
			id={peripheral.name}
		>
			<div
				data-test={`core:${projectId}:allocation:${peripheral.name}`}
				className={`${styles.cardContent} ${styles.cardContentColumn}`}
			>
				<div className={styles.cardHeader}>
					<PeripheralEntry
						projectId={projectId}
						peripheralName={peripheral.name}
						preassigned={isPreassigned}
						controls={projectControls ?? {}}
					/>

					{!isPreassigned && signalCount > 0 && (
						<div
							data-test={`core:${projectId}:allocation:${peripheral.name}:chevron`}
							className={`${styles.chevron}${isOpen ? ` ${styles.iconOpen}` : ''}`}
							onClick={() => {
								setIsOpen(!isOpen);
							}}
						>
							<ChevronRight />
						</div>
					)}
				</div>
				{isOpen && signalCount > 0 ? (
					<section className={styles.signalsSection}>
						{Object.values(peripheral.signals).map(signal => (
							<SignalEntry
								key={signal.name}
								signal={signal.name}
								peripheral={peripheral.name}
							/>
						))}
					</section>
				) : null}
			</div>
		</Card>
	);
}

export default PeripheralAllocationCard;
