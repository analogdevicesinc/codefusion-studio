/**
 *
 * Copyright (c) 2024-2026 Analog Devices, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
import DetailsView from '@common/components/details-view/DetailsView';
import type {Pin} from '@common/types/soc';
import {useAssignedPins} from '../../../state/slices/pins/pins.selector';
import Function from '../function/Function';
import styles from './SideDetailsView.module.scss';
import ConflictIcon from '../../../../../common/icons/Conflict';
import {
	getSocPinDetails,
	getSocPinDictionary
} from '../../../utils/soc-pins';
import {pinInConflict} from '../../../utils/pin-error';

type PinDetailsProps = Readonly<{
	targetPins: Array<Pin[] | undefined>;
	peripheralPins?: Record<string, Pin[]> | undefined;
	handleBackClick: () => void;
}>;

export default function SideDetailsView({
	targetPins,
	peripheralPins = {},
	handleBackClick
}: PinDetailsProps) {
	const assignedPins = useAssignedPins();

	const assignedPinsNames = assignedPins.map(
		assignedPin => assignedPin.Name
	);
	const targetPinsIds = targetPins
		.map(pinArray => pinArray?.map(pin => pin.Name))
		.flat();

	const targetPinsState = targetPins.map(pinArray =>
		pinArray?.map(targetPin => ({
			...targetPin,
			appliedSignals: assignedPins.find(
				assignedPin => assignedPin.Name === targetPin.Name
			)?.appliedSignals
		}))
	);

	const packagePins = getSocPinDictionary();

	return (
		<DetailsView
			handleBackClick={handleBackClick}
			body={targetPinsState.map(pinArray =>
				pinArray?.map(targetPin => {
					const isAssignedPin = assignedPinsNames.includes(
						targetPin.Name
					);
					const isAnyPinAssigned = targetPinsIds.some(
						pinName => pinName && assignedPinsNames.includes(pinName)
					);

					const signals = getSocPinDetails(
						packagePins[targetPin.Name].Name
					)?.Signals;
					const hasSignals = Boolean(signals && signals.length > 0);

					const shouldRenderPin =
						(pinArray.length > 1 && isAssignedPin) ||
						(pinArray.length > 1 &&
							!isAnyPinAssigned &&
							pinArray[0].Name === targetPin.Name) ||
						pinArray.length === 1;

					if (!shouldRenderPin || !hasSignals) return;

					return (
						<div key={targetPin.Name} className={styles.body}>
							<div
								data-testid='pin-details-title'
								id='pin-details-title'
								className={styles.titleContainer}
							>
								<div className={styles.title}>
									<h3>{targetPin.Label}</h3>
									<h3 className={styles.pinName}>{targetPin.Name}</h3>
								</div>
								{targetPin.appliedSignals &&
									pinInConflict(targetPin.appliedSignals) && (
										<div
											className={styles.conflictContainer}
											data-test='pin:tooltip:conflictMarker'
										>
											<div className={styles.notification}>
												<p>Pin conflict</p>
												<ConflictIcon />
											</div>
										</div>
									)}
							</div>

							<section id='pin-details-signals-container'>
								{targetPin.Signals?.map(signal => {
									const signalPins =
										peripheralPins[
											`${signal.Peripheral}__${signal.Name}`
										];

									return (
										<div
											key={`pinDetails:signals:${signal.Peripheral}:${signal.Name}`}
											className={styles.peripheralGroup}
										>
											<div className={styles.groupTitle}>
												{signal.Peripheral}
											</div>
											<Function
												peripheralGroup={signal.Peripheral ?? ''}
												name={signal.Name}
												pins={
													signalPins && signalPins.length > 0
														? signalPins
														: [targetPin]
												}
											/>
										</div>
									);
								})}
							</section>
						</div>
					);
				})
			)}
		/>
	);
}
