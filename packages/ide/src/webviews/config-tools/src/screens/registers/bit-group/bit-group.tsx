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

import {useMemo} from 'react';
import {computeFieldValue} from '../../../utils/compute-register-value';
import {
	type RegisterConfigField,
	type ConfigField,
	type FieldDictionary
} from '../../../../../common/types/soc';
import styles from './bit-group.module.scss';

type BitGroupProps = {
	readonly registerDetails: FieldDictionary[];
	readonly registerName: string;
	readonly assignedPinsRegisterConfigs: Array<{
		pinConfig: Array<RegisterConfigField | undefined>;
		signalConfig: ConfigField[] | undefined;
	}>;
	readonly registersConfigs: Array<
		Record<string, RegisterConfigField[] | undefined>
	>;
	readonly hoveredField: string | undefined;
	readonly setHoveredField: (id: string | undefined) => void;
	readonly scrollToRow: (id: string) => void;
};

export function BitGroup({
	registerDetails,
	registerName,
	assignedPinsRegisterConfigs,
	registersConfigs,
	hoveredField,
	setHoveredField,
	scrollToRow
}: BitGroupProps) {
	const activeRegisterBits = useMemo(() => {
		const bits = [...registerDetails]
			.map(field => {
				const value = Number(
					computeFieldValue(
						assignedPinsRegisterConfigs,
						registersConfigs,
						registerName,
						field,
						field.reset
					)
				);

				return Array.from({length: field.length}, (_, i) => ({
					// eslint-disable-next-line no-bitwise
					value: field.name === 'RESERVED' ? '-' : (value >> i) & 1,
					position: field.position + i,
					startsField: i === field.length - 1,
					endsField: i === 0,
					fieldId: field.id,
					changed: value !== Number(field.reset)
				}));
			})
			.flat()
			.reverse();
		const bitWords = [];

		for (let i = 0; i < bits.length; i += 16) {
			bitWords.push(bits.slice(i, i + 16));
		}

		return bitWords;
	}, [
		assignedPinsRegisterConfigs,
		registersConfigs,
		registerDetails,
		registerName
	]);

	return (
		<div className={styles.bitGroups} data-test='bit-group'>
			{activeRegisterBits.map(bitWord => (
				<div key={bitWord[0].position} className={styles.word}>
					{bitWord.map(bit => (
						<div
							key={bit.position}
							className={`${styles.bitContainer}
													${bit.endsField ? styles.endsField : ''}
													${bit.changed ? styles.changed : ''}`}
						>
							<span
								className={`${styles.bitValue}
								${hoveredField === bit.fieldId ? styles.hovered : ''}
								${bit.endsField ? styles.radiusEnd : ''}
								${bit.startsField ? styles.radiusStart : ''}`}
								onMouseEnter={() => {
									setHoveredField(bit.fieldId);
								}}
								onMouseLeave={() => {
									setHoveredField(undefined);
								}}
								onClick={() => {
									scrollToRow(bit.fieldId);
								}}
							>
								{bit.value}
							</span>
							<span className={styles.bitPosition}>
								{bit.position}
							</span>
						</div>
					))}
				</div>
			))}
		</div>
	);
}
