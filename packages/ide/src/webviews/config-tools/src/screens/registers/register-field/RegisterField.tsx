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
import {Fragment} from 'react';
import {computeFieldValue} from '../../../utils/compute-register-value';

import styles from './RegisterField.module.scss';
import {DataGrid, DataGridCell, DataGridRow} from 'cfs-react-library';

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

			<DataGrid className={styles.fieldTable}>
				<DataGridRow rowType='header'>
					<DataGridCell gridColumn='1' cellType='columnheader'>
						Bits
					</DataGridCell>
					<DataGridCell gridColumn='2' cellType='columnheader'>
						Access
					</DataGridCell>
					<DataGridCell gridColumn='3' cellType='columnheader'>
						Value
					</DataGridCell>
					<DataGridCell gridColumn='4' cellType='columnheader'>
						Reset value
					</DataGridCell>
				</DataGridRow>
				<DataGridRow>
					{[
						`${position + (length - 1)}:${position}`,
						access,
						value,
						'0x' + reset.toString(16)
					].map((item, index) => (
						<DataGridCell
							key={`${name}- ${index + 1}`}
							gridColumn={String(index + 1)}
							dataTest={`${name}-${index}-data-grid-cell`}
						>
							{item}
						</DataGridCell>
					))}
				</DataGridRow>
			</DataGrid>
		</div>
	);
}

export default RegisterField;
