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

import type {ReactNode} from 'react';
import {
	Button,
	DynamicForm,
	type TFormControl,
	type TFormData,
	type TFormFieldValue
} from 'cfs-react-library';
import styles from './key-form-layout.module.scss';

type KeyFormLayoutProps = {
	readonly title: string | undefined;
	readonly controls: TFormControl[];
	readonly formData: TFormData;
	readonly testId: string;
	readonly cancelLabel: string | undefined;
	readonly submitLabel: string | undefined;
	readonly components?: Record<string, ReactNode>;
	readonly errors?: Record<string, string>;
	readonly onControlChange: (
		controlId: string,
		value: TFormFieldValue
	) => void;
	readonly onCancel: () => void;
	readonly onSubmit: () => void;
};

function KeyFormLayout({
	title,
	controls,
	formData,
	testId,
	cancelLabel,
	submitLabel,
	components,
	onControlChange,
	errors,
	onCancel,
	onSubmit
}: KeyFormLayoutProps) {
	return (
		<div className={styles.keyFormContainer} data-test={testId}>
			<div className={styles.header}>{title}</div>
			<div className={styles.formContainer}>
				<DynamicForm
					controls={controls}
					data={formData}
					testId={testId}
					components={components}
					errors={errors}
					onControlChange={onControlChange}
				/>
			</div>
			<div className={styles.buttonContainer}>
				<Button
					appearance='secondary'
					dataTest={`${testId}:cancel`}
					onClick={onCancel}
				>
					{cancelLabel}
				</Button>
				<Button
					appearance='primary'
					dataTest={`${testId}:submit`}
					onClick={onSubmit}
				>
					{submitLabel}
				</Button>
			</div>
		</div>
	);
}

export default KeyFormLayout;
