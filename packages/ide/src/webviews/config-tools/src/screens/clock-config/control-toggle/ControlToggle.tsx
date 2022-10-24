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
import Toggle from '@common/components/toggle/Toggle';
import styles from './ControlToggle.module.scss';
import {useAppDispatch} from '../../../state/store';
import {
	type ClockNodeSet,
	setClockNodeControlValue
} from '../../../state/slices/clock-nodes/clockNodes.reducer';
import {
	useClockNodeState,
	useClockNodeDetailsTargetNode,
	useControl
} from '../../../state/slices/clock-nodes/clockNodes.selector';

type ControlToggleProps = {
	readonly controlId: string;
	readonly isDisabled?: boolean;
	readonly label: string;
	readonly isInTitle?: boolean;
	readonly isFirstGroupItem?: boolean;
};

export default function ControlToggle({
	controlId,
	isDisabled,
	label,
	isInTitle = false,
	isFirstGroupItem = false
}: ControlToggleProps) {
	const dispatch = useAppDispatch();
	const clockNodeDetailsTargetNode = useClockNodeDetailsTargetNode();
	const activeClockNodeDetails = useClockNodeState(
		clockNodeDetailsTargetNode
	);

	const isToggledOn =
		useControl(
			activeClockNodeDetails?.Type,
			clockNodeDetailsTargetNode,
			controlId
		) === 'TRUE';

	const handleToggle = () => {
		if (isDisabled) return;

		const changedClockNode: ClockNodeSet = {
			type: activeClockNodeDetails?.Type,
			name: clockNodeDetailsTargetNode!,
			key: controlId,
			value: isToggledOn ? 'FALSE' : 'TRUE'
		};

		dispatch(setClockNodeControlValue(changedClockNode));
	};

	return (
		<div
			className={`${styles.toggleContainer} ${isInTitle ? styles.titleToggle : styles.bottomMargin} ${isFirstGroupItem ? styles.topMargin : ''} ${isDisabled ? styles.disabled : ''}`}
			data-test={`${controlId}-${activeClockNodeDetails?.Name}`}
		>
			<label data-test={`side-${label}`}>{label}</label>
			<div className={styles.divider} />
			<Toggle
				isToggledOn={isToggledOn}
				handleToggle={handleToggle}
				isDisabled={isDisabled}
			/>
		</div>
	);
}
