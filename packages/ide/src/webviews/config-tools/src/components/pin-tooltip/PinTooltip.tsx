/**
 *
 * Copyright (c) 2024-2025 Analog Devices, Inc.
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
import styles from './PinTooltip.module.scss';
import ConflictIcon from '@common/icons/Conflict';
import CfsTooltip from '../../../../common/components/cfs-tooltip/CfsTooltip';
import {usePin} from '../../state/slices/pins/pins.selector';
import {
	gap,
	notchHeight,
	notchWidth
} from '../../screens/clock-config/constants/tooltip';
import {getSocPinDetails} from '../../utils/soc-pins';
import {isPinReserved} from '../../utils/is-pin-reserved';
import {pinInConflict} from '../../utils/pin-error';

type PinTooltipProps = {
	readonly pinId: string;
};

export default function PinTooltip({pinId}: PinTooltipProps) {
	const {appliedSignals} = usePin(pinId);
	const {Label, Signals, Description} = getSocPinDetails(pinId) ?? {};
	const isReserved = isPinReserved(pinId);

	const availableSignals =
		Signals?.filter(
			signal =>
				!appliedSignals.find(
					appliedSignal => appliedSignal.Name === signal.Name
				)
		) ?? [];

	const formatSignal = (
		signalName: string,
		peripheral: string | undefined
	) =>
		`${peripheral !== undefined && `${peripheral}.`}${signalName} ${signalName === Label ? '(default)' : ''}`;

	const {
		top: pinTop = 0,
		bottom: pinBottom = 0,
		left: pinLeft = 0
	} = document
		.getElementById(`pin:${pinId}`)
		?.getBoundingClientRect() ?? {};

	const {
		top: containerTop = 0,
		bottom: containerBottom = 0,
		left: containerLeft = 0
	} = document
		.getElementById('pinmux-main-panel')
		?.getBoundingClientRect() ?? {};

	let top: number | undefined =
		pinBottom - containerTop + notchHeight + gap;
	let bottom;
	const left = pinLeft - containerLeft - notchWidth / 4;
	const tooltipHeigth = 150;

	if (pinBottom + tooltipHeigth > containerBottom) {
		top = undefined;
		bottom = containerBottom - pinTop + gap;
	}

	return (
		<CfsTooltip
			id={pinId}
			header={
				<div className={styles.title}>
					<div className={styles.label}>{Label}</div>
					<div className={styles.pin}>{pinId}</div>
				</div>
			}
			classNames={`${styles.container} ${styles.root}`}
			top={top}
			bottom={bottom}
			left={left}
		>
			<div className={styles.bodyContent}>
				{isReserved ? (
					<div data-test='pin:tooltip:reservedLabel'>
						<h4>Reserved pin:</h4>
						{Description}
					</div>
				) : (
					<>
						{pinInConflict(appliedSignals) && (
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
						{!pinInConflict(appliedSignals) && (
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
		</CfsTooltip>
	);
}
