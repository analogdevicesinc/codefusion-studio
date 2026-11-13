/**
 *
 * Copyright (c) 2026 Analog Devices, Inc.
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
import {DropDown, type DropDownOptions} from 'cfs-react-library';
import type {PinBufferDirection} from '../../../../utils/sru-signals';
import styles from './direction-location-row.module.scss';

type DirectionLocationRowProps = Readonly<{
	directionLabel: string | undefined;
	directionOptions: DropDownOptions;
	directionValue: PinBufferDirection | undefined;
	onDirectionChange: (value: PinBufferDirection) => void;
	pinLocationLabel: string | undefined;
	pinLocationValue: string | undefined;
	pinLocationUnassigned: string | undefined;
}>;

/**
 * Header row shown above the Inputs/Outputs/Direction Controls sections for
 * pin-buffer signal groups, matching the Figma "Direction:"/"Pin location:"
 * row. Direction is driven by the group's PBEN SRU source; pin location is
 * the fixed package pin for the subgroup's abstract PIN signal.
 */
export function DirectionLocationRow({
	directionLabel,
	directionOptions,
	directionValue,
	onDirectionChange,
	pinLocationLabel,
	pinLocationValue,
	pinLocationUnassigned
}: DirectionLocationRowProps) {
	const directionControlId = 'sru-pin-buffer-direction';

	return (
		<div className={styles.container} data-test='pin-buffer-controls'>
			<div className={styles.direction}>
				<label
					htmlFor={`${directionControlId}-controlDropdown`}
					className={styles.label}
				>
					{directionLabel}
				</label>
				<DropDown
					controlId={directionControlId}
					size='large'
					currentControlValue={directionValue}
					options={directionOptions}
					dataTest='pin-buffer-controls:direction-select'
					onHandleDropdown={value => {
						onDirectionChange(value as PinBufferDirection);
					}}
				/>
			</div>

			<div className={styles.pinLocation}>
				<span className={styles.label}>{pinLocationLabel}</span>
				<span
					className={styles.value}
					data-test='pin-buffer-controls:pin-location-value'
				>
					{pinLocationValue ?? pinLocationUnassigned}
				</span>
			</div>
		</div>
	);
}
