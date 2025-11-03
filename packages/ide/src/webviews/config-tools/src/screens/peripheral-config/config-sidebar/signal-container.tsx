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

import {DropDown} from 'cfs-react-library';
import PinAssignmentInfo from '../core-summary/PinAssignmentInfo';
import ConflictIcon from '../../../../../common/icons/Conflict';
import Toggle from '../../../../../common/components/toggle/Toggle';
import styles from './signal-container.module.scss';
import {type Pin} from '../../../../../common/types/soc';

type SignalContainerProps = Readonly<{
	signal: string;
	peripheral: string;
	pins: Pin[];
	handleDropdown: (value: string) => void;
	targetPinId: string;
	isToggledOn: boolean;
	handleToggle: () => void;
	isPinConflict?: number | boolean;
	isPinAssignmentMissing?: number | boolean;
}>;

function SignalContainer({
	signal,
	peripheral,
	pins,
	handleDropdown,
	targetPinId,
	isToggledOn,
	handleToggle,
	isPinConflict,
	isPinAssignmentMissing
}: SignalContainerProps) {
	return (
		<div
			data-test={`signal-assignment:${signal}`}
			className={styles.container}
		>
			<span
				data-test='signal-assignment:name'
				className={styles.signalName}
			>
				{signal}
			</span>

			<PinAssignmentInfo
				signal={signal}
				peripheral={peripheral}
				showRequiredLabel={false}
				showDash={false}
			/>
			{!isToggledOn &&
				(pins.length === 1 ? (
					<div>{pins[0].Name}</div>
				) : (
					<div>
						<DropDown
							controlId='pin-permission'
							currentControlValue={targetPinId}
							size='small'
							options={pins.map(pin => ({
								label: pin.Name,
								value: pin.Name
							}))}
							onHandleDropdown={handleDropdown}
						/>
					</div>
				))}
			<Toggle
				isToggledOn={isToggledOn}
				handleToggle={handleToggle}
				dataTest={`${peripheral}-${signal}`}
			/>
			{Boolean(isPinAssignmentMissing) || isPinConflict ? (
				<ConflictIcon data-test='signal-assignment:conflict' />
			) : (
				<div className={styles.placeholder} />
			)}
		</div>
	);
}

export default SignalContainer;
