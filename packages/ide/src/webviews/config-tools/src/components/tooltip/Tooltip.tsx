/**
 *
 * Copyright (c) 2024 Analog Devices, Inc.
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
import styles from './Tooltip.module.scss';
import ConflictIcon from '@common/icons/Conflict';
import type {PinSignal} from '@common/types/soc';

type TooltipProps = {
	readonly pinId: string;
	readonly pinLabel: string;
	readonly appliedSignals: PinSignal[];
	readonly availableSignals: PinSignal[];
	readonly isReserved: boolean;
	readonly description: string;
};

export default function PinTooltip({
	pinId,
	pinLabel,
	appliedSignals,
	availableSignals,
	isReserved,
	description
}: TooltipProps) {
	const formatSignal = (
		signalName: string,
		peripheral: string | undefined
	) =>
		`${peripheral !== undefined && `${peripheral}.`}${signalName} ${signalName === pinLabel ? '(default)' : ''}`;

	return (
		<div
			className={styles.container}
			data-test={`pin:tooltip:${pinId}`}
		>
			<h3>{`${pinLabel} (${pinId})`}</h3>
			{isReserved ? (
				<div data-test='pin:tooltip:reservedLabel'>
					<h4>Reserved pin:</h4>
					{description}
				</div>
			) : (
				<>
					{appliedSignals.length > 1 && (
						<div
							className={styles['conflict-container']}
							data-test='pin:tooltip:conflictMarker'
						>
							<ConflictIcon />
							<p>Pin conflict</p>
						</div>
					)}
					{appliedSignals.length > 0 && (
						<div
							data-test='pin:tooltip:assigned'
							className={styles.tooltipSection}
						>
							<h4>Functions assigned:</h4>
							{appliedSignals.map(signal => (
								<p
									key={`${signal.Peripheral}-${signal.Name}`}
									data-test={`pin:tooltip:appliedSignal:${signal.Name}`}
								>
									{formatSignal(signal.Name, signal.Peripheral)}
								</p>
							))}
						</div>
					)}
					{appliedSignals.length < 2 && (
						<div
							data-test='pin:tooltip:available'
							className={styles.tooltipSection}
						>
							<h4>Functions available:</h4>
							{availableSignals.map(signal => (
								<p
									key={`${signal.Peripheral}-${signal.Name}`}
									data-test={`pin:tooltip:availableSignal:${signal.Name}`}
								>
									{formatSignal(signal.Name, signal.Peripheral)}
								</p>
							))}
						</div>
					)}
				</>
			)}
		</div>
	);
}
