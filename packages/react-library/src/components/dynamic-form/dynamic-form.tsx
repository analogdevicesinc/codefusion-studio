/* eslint-disable @typescript-eslint/no-explicit-any */
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

import DynamicFormField from './dynamic-form-field.tsx';
import type {
	TFormControl,
	TFormData,
	TFormFieldValue
} from '../../types/dynamic-form.ts';

export default function DynamicForm({
	controls,
	data,
	testId,
	components = {},
	errors = {},
	onControlChange
}: Readonly<{
	controls: TFormControl[];
	data: TFormData;
	testId: string;
	components?: Record<string, any>;
	errors?: Record<string, string>;
	onControlChange: (
		controlId: string,
		value: TFormFieldValue
	) => void;
}>): JSX.Element {
	return (
		<>
			{controls.map(control => (
				<DynamicFormField
					key={control.id}
					control={control}
					value={data[control.id]}
					data-test={testId}
					testId={`${testId}:control-${control.id}`}
					component={components?.[control.id] ?? undefined}
					error={errors[control.id] ?? undefined}
					onControlChange={onControlChange}
				/>
			))}
		</>
	);
}
