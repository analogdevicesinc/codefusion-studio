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

import {type TFormControl, type TFormData} from 'cfs-react-library';
import Toggle from '../../../../common/components/toggle/Toggle';
import styles from './BooleanControl.module.scss';

type BooleanControlProps = Readonly<{
	control: TFormControl;
	data: TFormData;
	testId?: string;
	onControlChange: (id: string, value: boolean) => void;
}>;

export default function BooleanControl({
	control,
	data,
	testId = 'boolean-control',
	onControlChange
}: BooleanControlProps) {
	const enabled = data[control.id] as boolean;

	return (
		<div key={control.id} className={styles.booleanControl}>
			<Toggle
				isToggledOn={enabled}
				handleToggle={() => {
					onControlChange(control.id, !enabled);
				}}
				dataTest={`${testId}:${control.id}`}
			/>
			{control.name}
		</div>
	);
}
