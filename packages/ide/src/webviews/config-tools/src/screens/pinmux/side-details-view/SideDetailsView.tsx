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
import DetailsView from '@common/components/details-view/DetailsView';
import type {Pin} from '@common/types/soc';
import {useAssignedPins} from '../../../state/slices/pins/pins.selector';
import Function from '../function/Function';
import styles from './SideDetailsView.module.scss';
import ConflictIcon from '../../../../../common/icons/Conflict';
import {getSocPinDictionary} from '../../../utils/soc-pins';
import {isPinReserved} from '../../../utils/is-pin-reserved';

type PinDetailsProps = {
	readonly targetPins: Array<Pin[] | undefined>;
	readonly handleBackClick: () => void;
	readonly errorMsg?: string;
};

export default function SideDetailsView({
	targetPins,
	handleBackClick,
	errorMsg
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
			body={
				errorMsg ? (
					<div style={{textAlign: 'center'}}>{errorMsg}</div>
				) : (
					targetPinsState.map(pinArray =>
						pinArray?.map(targetPin => {
							const isAssignedPin = assignedPinsNames.includes(
								targetPin.Name
							);
							const isAnyPinAssigned = targetPinsIds.some(
								pinName =>
									pinName && assignedPinsNames.includes(pinName)
							);

							const shouldRenderPin =
								(pinArray.length > 1 && isAssignedPin) ||
								(pinArray.length > 1 &&
									!isAnyPinAssigned &&
									pinArray[0].Name === targetPin.Name) ||
								pinArray.length === 1;

							if (!shouldRenderPin) return;

							return (
								<div
									key={`${targetPin?.Name}`}
									className={styles.body}
								>
									<div
										data-testid='pin-details-title'
										id='pin-details-title'
										className={styles.titleContainer}
									>
										<div className={styles.title}>
											<h3>{targetPin?.Label}</h3>
											<h3 className={styles.pinName}>
												{targetPin?.Name}
											</h3>
										</div>
										{targetPin.appliedSignals &&
											targetPin.appliedSignals.length > 1 && (
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
										{isPinReserved(
											packagePins[targetPin.Name].Name
										) ? (
											<div className={styles.reservedPinContainer}>
												<h4>RESERVED PIN</h4>
												<p>{`${targetPin?.Description}`}</p>
											</div>
										) : (
											targetPin?.Signals?.map(signal => (
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
														pins={pinArray}
													/>
												</div>
											))
										)}
									</section>
								</div>
							);
						})
					)
				)
			}
		/>
	);
}
