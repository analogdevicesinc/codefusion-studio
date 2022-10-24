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
import type {
	ConfigField,
	FieldDictionary,
	RegisterDictionary
} from '@common/types/soc';
import {
	VSCodeDataGrid,
	VSCodeDataGridRow,
	VSCodeDataGridCell
} from '@vscode/webview-ui-toolkit/react';
import {Fragment} from 'react';
import {computeFieldValue} from '../../../utils/compute-register-value';

import styles from './registerField.module.scss';

type RegisterFieldProps = {
	readonly assignedPinsRegisterConfigs: Array<{
		pinConfig: Array<ConfigField | undefined>;
		signalConfig: ConfigField[] | undefined;
	}>;
	readonly modifiedClockNodesConfigs: Array<
		Record<string, ConfigField[] | undefined>
	>;
	readonly activeRegister: RegisterDictionary;
	readonly field: FieldDictionary;
};

function RegisterField({
	assignedPinsRegisterConfigs,
	modifiedClockNodesConfigs,
	activeRegister,
	field
}: RegisterFieldProps) {
	const {
		name,
		documentation,
		enumVals,
		position,
		access,
		length,
		reset
	} = field;

	const value = computeFieldValue(
		assignedPinsRegisterConfigs,
		modifiedClockNodesConfigs,
		activeRegister.name,
		field,
		reset
	);

	return (
		<div key={name} className={styles.fieldContainer}>
			<h2 className={styles.name}>{name}</h2>
			<p style={{margin: '0 0 18px 0'}}>{documentation}</p>
			{enumVals?.length && (
				<div className={styles.controlValDescription}>
					{enumVals.map(item => (
						<Fragment key={item.id}>
							<div className={styles.docsContainer}>
								<span className={styles.itemValue}>{item.value}</span>
								<span>{item.documentation}</span>
							</div>
						</Fragment>
					))}
				</div>
			)}
			<div className={styles.fieldTable}>
				<VSCodeDataGrid>
					<VSCodeDataGridRow rowType='header'>
						<VSCodeDataGridCell gridColumn='1'>
							Bits
						</VSCodeDataGridCell>
						<VSCodeDataGridCell gridColumn='2'>
							Access
						</VSCodeDataGridCell>
						<VSCodeDataGridCell gridColumn='3'>
							Value
						</VSCodeDataGridCell>
						<VSCodeDataGridCell gridColumn='4'>
							Reset value
						</VSCodeDataGridCell>
					</VSCodeDataGridRow>
					<VSCodeDataGridRow>
						{[
							`${position + (length - 1)}:${position}`,
							access,
							value,
							'0x' + reset.toString(16)
						].map((item, index) => (
							<VSCodeDataGridCell
								key={item}
								gridColumn={String(index + 1)}
								cellType='columnheader'
								data-test={`${name}-${index}-data-grid-cell`}
							>
								{item}
							</VSCodeDataGridCell>
						))}
					</VSCodeDataGridRow>
				</VSCodeDataGrid>
			</div>
		</div>
	);
}

export default RegisterField;
