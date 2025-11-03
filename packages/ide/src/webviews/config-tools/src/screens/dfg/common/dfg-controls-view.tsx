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

import {
	Divider,
	DynamicForm,
	type TFormData,
	type TFormFieldValue,
	use
} from 'cfs-react-library';
import {useCallback, useMemo, useRef} from 'react';
import {
	formatControlsForDynamicForm,
	getFormErrors
} from '../../../utils/soc-controls';
import type {
	ConfigFields,
	ControlCfg
} from '../../../../../common/types/soc';
import {computeDefaultValues} from '../../../utils/compute-register-value';
import BooleanControl from '../../../components/boolean-control/BooleanControl';
import styles from './dfg-controls-view.module.scss';

export function DFGControlsView({
	controlsPrms,
	propertyName,
	fieldName,
	data,
	socConfig,
	testId,
	gasketName,
	onControlChange
}: {
	readonly controlsPrms: Promise<Record<string, ControlCfg[]>>;
	readonly propertyName: string;
	readonly fieldName?: 'Source' | 'Destinations';
	readonly data: Record<string, string | number | boolean>;
	readonly socConfig: ConfigFields;
	readonly testId: string;
	readonly gasketName?: string;
	readonly onControlChange: (
		field: string,
		value: TFormFieldValue
	) => void;
}) {
	const controls = use(controlsPrms);

	const controlFields: ControlCfg[] = useMemo(
		() =>
			controls[propertyName]?.filter(
				c => !c.PluginOption && (!socConfig || socConfig[c.Id])
			) ?? [],
		[controls, propertyName, socConfig]
	);

	const pluginControlFields: ControlCfg[] = useMemo(
		() => controls[propertyName]?.filter(c => c.PluginOption) ?? [],
		[controls, propertyName]
	);

	const originalData = useRef(data);

	const modifiedFields = useMemo(
		() =>
			Object.keys(data).reduce<Record<string, boolean>>(
				(acc, key) => {
					if (data[key] !== originalData.current[key]) {
						acc[key] = true;
					}

					return acc;
				},
				{}
			),
		[data]
	);

	const handleControlChange = useCallback(
		(field: string, value: TFormFieldValue) => {
			const ctrlVal =
				typeof value === 'boolean'
					? value
						? 'TRUE'
						: 'FALSE'
					: value.toString();
			onControlChange(field, ctrlVal);
		},
		[onControlChange]
	);

	return (
		<div className={styles.dynamicFormContainer}>
			<ControlsForm
				controlFields={controlFields}
				data={data}
				modifiedFields={modifiedFields}
				socConfig={socConfig}
				testId={testId}
				onControlChange={handleControlChange}
			/>
			{pluginControlFields.length > 0 && (
				<>
					<Divider />
					<h5>
						{fieldName
							? fieldName === 'Source'
								? 'SOURCE'
								: 'DESTINATION'
							: ''}{' '}
						PLUGIN OPTIONS ({gasketName})
					</h5>
					<ControlsForm
						controlFields={pluginControlFields}
						data={{
							...data,
							_ENDPOINT:
								fieldName === 'Source' ? 'SOURCE' : 'DESTINATION'
						}}
						modifiedFields={modifiedFields}
						socConfig={socConfig}
						testId={testId}
						onControlChange={handleControlChange}
					/>
				</>
			)}
		</div>
	);
}

function ControlsForm({
	controlFields,
	data,
	modifiedFields,
	testId,
	socConfig,
	onControlChange
}: {
	readonly controlFields: ControlCfg[];
	readonly data: TFormData;
	readonly modifiedFields: Record<string, boolean>;
	readonly testId: string;
	readonly socConfig: ConfigFields;
	readonly onControlChange: (
		field: string,
		value: TFormFieldValue
	) => void;
}) {
	const controlResetValues = useMemo(
		() => computeDefaultValues(socConfig, controlFields),
		[socConfig, controlFields]
	);

	// For booleans we need to convert the string values to boolean
	const formattedData = useMemo(() => {
		const frmtdata = {...data};

		Object.keys(frmtdata).forEach(key => {
			if (
				controlFields.find(control => control.Id === key)?.Type ===
				'boolean'
			) {
				if (typeof frmtdata[key] === 'string') {
					frmtdata[key] =
						(frmtdata[key] as string).toUpperCase() === 'TRUE';
				}
			}
		});

		Object.keys(controlResetValues).forEach(key => {
			if (frmtdata[key] === undefined) {
				const control = controlFields.find(
					control => control.Id === key
				);

				if (control?.Type === 'boolean') {
					frmtdata[key] = controlResetValues[key] === 'TRUE';
				} else {
					frmtdata[key] = controlResetValues[key];
				}
			}
		});

		return frmtdata;
	}, [controlFields, data, controlResetValues]);

	const formattedControls = useMemo(
		() =>
			formatControlsForDynamicForm(
				controlFields,
				data,
				modifiedFields
			),
		[controlFields, data, modifiedFields]
	);

	const controlErrors = useMemo(
		() =>
			controlFields
				.filter(control => data[control.Id] !== undefined)
				.reduce(
					(acc, control) =>
						getFormErrors(acc, control, data[control.Id]),
					{}
				),
		[controlFields, data]
	);

	const components = useMemo(() => {
		const map: Record<string, React.ReactNode> = {};

		formattedControls.forEach(control => {
			if (control.type === 'boolean') {
				map[control.id] = (
					<BooleanControl
						control={{
							id: control.id,
							type: 'boolean',
							name: control.name,
							description: control.description
						}}
						testId={testId}
						data={formattedData}
						onControlChange={onControlChange}
					/>
				);
			}
		});

		return map;
	}, [formattedControls, formattedData, onControlChange, testId]);

	return (
		<DynamicForm
			controls={formattedControls}
			data={formattedData}
			errors={controlErrors}
			testId={testId}
			components={components}
			onControlChange={onControlChange}
		/>
	);
}
