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

import {
	DynamicForm,
	type TFormControl,
	type TFormData,
	type TFormFieldValue
} from 'cfs-react-library';
import {memo, useMemo} from 'react';
import styles from './PeripheralConfigForm.module.scss';
import BooleanControl from '../../../components/boolean-control/BooleanControl';
import {HexInputField} from 'cfs-react-library';

type ConfigurationFormProps = Readonly<{
	controls: TFormControl[];
	data: TFormData;
	errors?: Record<string, string>;
	resetValues: Record<string, TFormFieldValue>;
	onControlChange: (fieldId: string, value: TFormFieldValue) => void;
	onReset?: (controls: TFormControl[]) => void;
	testId?: string;
	emptyMessage?: string;
}>;

function ConfigurationForm({
	controls,
	data,
	errors,
	resetValues,
	onControlChange,
	onReset,
	testId = 'configuration-form',
	emptyMessage = 'No settings available.'
}: ConfigurationFormProps) {
	const didDefaultValuesChange = useMemo(
		() =>
			Object.entries(data ?? {}).some(
				([controlId, controlValue]) =>
					controls.some(({id}) => id === controlId) &&
					controlValue !== resetValues?.[controlId]
			),
		[data, resetValues, controls]
	);

	const components = useMemo(() => {
		const map: Record<string, React.ReactNode> = {};

		controls.forEach(control => {
			if (control.type === 'boolean') {
				map[control.id] = (
					<BooleanControl
						key={control.id}
						control={control}
						data={data}
						onControlChange={onControlChange}
					/>
				);
			}

			if ((control.type === 'integer') && (control.base === 'Hexadecimal')) {
				map[control.id] = (
					<HexInputField
						dataTest={`${control.id}-hex-input`}
						value={data[control.id] as string}
						error={errors?.[control.id]}
						onValueChange={(hexValue) => {
								onControlChange(control.id, hexValue);
						}}
					/>
				);
			}
		});

		return map;
	}, [controls, data, errors, onControlChange]);

	return (
		<section
			className={styles.controlsContainer}
			data-test={`${testId}:container`}
		>
			{Boolean(controls.length) && didDefaultValuesChange && (
				<div className={styles.info}>
					<span>&lowast;</span>
					<label data-test='package-display-info'>
						Non-default value
					</label>
				</div>
			)}

			{controls.length > 0 ? (
				<div
					className={styles.dynamicFormContainer}
					data-testid={testId}
				>
					<DynamicForm
						controls={controls}
						data={data}
						errors={errors}
						testId={testId}
						components={components}
						onControlChange={onControlChange}
					/>
				</div>
			) : (
				<label data-test={`${testId}:no-settings`}>
					{emptyMessage}
				</label>
			)}

			{Boolean(controls.length) &&
				didDefaultValuesChange &&
				onReset && (
					<label
						className={styles.reset}
						data-test={`${testId}:reset-to-default`}
						onClick={() => {
							onReset(controls);
						}}
					>
						Reset to default
					</label>
				)}
		</section>
	);
}

export default memo(ConfigurationForm);
