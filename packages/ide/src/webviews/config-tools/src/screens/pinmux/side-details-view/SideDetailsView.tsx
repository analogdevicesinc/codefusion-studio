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
import {
	useAssignedPins,
	usePackagePins
} from '../../../state/slices/pins/pins.selector';
import Function from '../function/Function';
import styles from './SideDetailsView.module.scss';

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
	const assignedPinsNames = useAssignedPins().map(
		assignedPin => assignedPin.details.Name
	);
	const targetPinsNames = targetPins
		.map(pinArray => pinArray?.map(pin => pin.Name))
		.flat();

	const packagePins = usePackagePins();

	return (
		<DetailsView
			handleBackClick={handleBackClick}
			body={
				errorMsg ? (
					<div style={{textAlign: 'center'}}>{errorMsg}</div>
				) : (
					targetPins.map(pinArray =>
						pinArray?.map(targetPin => {
							const isAssignedPin = assignedPinsNames.includes(
								targetPin.Name
							);
							const isAnyPinAssigned = targetPinsNames.some(
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
										className={styles.title}
									>
										<h3>{targetPin?.Label}</h3>
										<h3 className={styles.pinName}>
											{targetPin?.Name}
										</h3>
									</div>
									<section id='pin-details-signals-container'>
										{(
											packagePins[targetPin.Name].details.Signals ??
											[]
										).length === 1 ? (
											<>
												<h4>RESERVED PIN</h4>
												<p>{`${targetPin?.Description}`}</p>
											</>
										) : (
											targetPin?.Signals?.map(signal => (
												<div
													key={`pinDetails:signals:${signal.Peripheral}:${signal.Name}`}
													className={styles.peripheralGroup}
												>
													<h4>{signal.Peripheral}</h4>
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
