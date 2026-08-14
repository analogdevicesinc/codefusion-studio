/**
 *
 * Copyright (c) 2025-2026 Analog Devices, Inc.
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
import {useCallback, useEffect, useMemo} from 'react';
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
import {areControlValuesEqual} from '../../../utils/control-defaults';
import {LocalizedMessage} from '@common/components/l10n/LocalizedMessage';
import styles from './dfg-controls-view.module.scss';

export function DFGControlsView({
	controlsPrms,
	propertyName,
	fieldName,
	data,
	socConfig,
	testId,
	gasketName,
	emptyMessage,
	onHasErrorsChange,
	onControlChange
}: Readonly<{
	controlsPrms: Promise<Record<string, ControlCfg[]>>;
	propertyName: string;
	fieldName?: 'Source' | 'Destinations';
	data: Record<string, string | number | boolean>;
	socConfig: ConfigFields;
	testId: string;
	gasketName?: string;
	emptyMessage?: string;
	onHasErrorsChange?: (hasErrors: boolean) => void;
	onControlChange: (
		field: string,
		value: TFormFieldValue | undefined
	) => void;
}>) {
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

	const pluginControlErrors = useMemo(
		() =>
			pluginControlFields
				.filter(control => data[control.Id] !== undefined)
				.reduce(
					(acc, control) =>
						getFormErrors(acc, control, data[control.Id]),
					{}
				),
		[pluginControlFields, data]
	);

	const hasErrors =
		Object.keys(controlErrors).length > 0 ||
		Object.keys(pluginControlErrors).length > 0;

	if (hasErrors) {
		onHasErrorsChange?.(true);
	}

	const handleControlChange = useCallback(
		(field: string, value: TFormFieldValue | undefined) => {
			const ctrlVal =
				typeof value === 'boolean'
					? value
						? 'TRUE'
						: 'FALSE'
					: value?.toString();
			onControlChange(field, ctrlVal);
		},
		[onControlChange]
	);

	if (
		controlFields.length === 0 &&
		pluginControlFields.length === 0
	) {
		return <div>{emptyMessage ?? ''}</div>;
	}

	return (
		<div className={styles.dynamicFormContainer}>
			{controlFields.length > 0 && (
				<ControlsForm
					controlFields={controlFields}
					data={data}
					controlErrors={controlErrors}
					socConfig={socConfig}
					testId={testId}
					onControlChange={handleControlChange}
				/>
			)}
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
						controlErrors={pluginControlErrors}
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
	controlErrors,
	testId,
	socConfig,
	onControlChange
}: Readonly<{
	controlFields: ControlCfg[];
	data: TFormData;
	controlErrors: Record<string, string>;
	testId: string;
	socConfig: ConfigFields;
	onControlChange: (
		field: string,
		value: TFormFieldValue | undefined
	) => void;
}>) {
	const controlResetValues = useMemo(
		() => computeDefaultValues(socConfig, controlFields),
		[socConfig, controlFields]
	);

	const controlsWithoutModifiedLabels = useMemo(
		() => formatControlsForDynamicForm(controlFields, data, {}),
		[controlFields, data]
	);

	const getControlDefaultValue = useCallback(
		(control: (typeof controlsWithoutModifiedLabels)[number]) => {
			const resetValue = controlResetValues[control.id];

			if (resetValue !== undefined) {
				return resetValue;
			}

			if (control.default !== undefined) {
				return control.default;
			}

			if (control.type === 'enum') {
				return control.enum?.[0]?.value;
			}

			if (control.type === 'boolean') return false;
			if (control.type === 'integer') return 0;

			return '';
		},
		[controlResetValues]
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
					frmtdata[key] = frmtdata[key].toUpperCase() === 'TRUE';
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

		// Sync UI defaults into form data so unchanged default values are persisted.
		controlsWithoutModifiedLabels.forEach(control => {
			if (frmtdata[control.id] !== undefined) return;

			const defaultValue = getControlDefaultValue(control);

			if (defaultValue === undefined || defaultValue === '') return;

			if (control.type === 'boolean') {
				frmtdata[control.id] =
					typeof defaultValue === 'string'
						? defaultValue.toUpperCase() === 'TRUE'
						: Boolean(defaultValue);
			} else {
				frmtdata[control.id] = defaultValue;
			}
		});

		return frmtdata;
	}, [
		controlFields,
		data,
		controlResetValues,
		controlsWithoutModifiedLabels,
		getControlDefaultValue
	]);

	const modifiedFields = useMemo(
		() =>
			controlsWithoutModifiedLabels.reduce<Record<string, boolean>>(
				(acc, control) => {
					const defaultValue = getControlDefaultValue(control);

					if (
						!areControlValuesEqual(
							formattedData[control.id] ?? defaultValue,
							defaultValue
						)
					) {
						acc[control.id] = true;
					}

					return acc;
				},
				{}
			),
		[
			controlsWithoutModifiedLabels,
			formattedData,
			getControlDefaultValue
		]
	);

	const formattedControls = useMemo(
		() =>
			formatControlsForDynamicForm(
				controlFields,
				data,
				modifiedFields
			),
		[controlFields, data, modifiedFields]
	);

	const hasNonDefaultValues =
		Object.values(modifiedFields).some(Boolean);

	// Keep persisted config in sync with the controls currently visible in the UI.
	useEffect(() => {
		const visibleControlIds = new Set(
			formattedControls.map(control => control.id)
		);

		formattedControls.forEach(control => {
			const value = getControlDefaultValue(control);

			if (
				value !== undefined &&
				value !== '' &&
				data[control.id] === undefined
			) {
				onControlChange(control.id, value);
			}
		});

		controlFields.forEach(control => {
			if (
				!visibleControlIds.has(control.Id) &&
				data[control.Id] !== undefined
			) {
				onControlChange(control.Id, undefined);
			}
		});
	}, [
		formattedControls,
		controlFields,
		data,
		onControlChange,
		getControlDefaultValue
	]);

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
		<>
			{hasNonDefaultValues && (
				<div
					className={styles.info}
					data-test={`${testId}:non-default-value`}
				>
					<span>*</span>
					<label>
						<LocalizedMessage id='dfg.nonDefaultValue' />
					</label>
				</div>
			)}
			<DynamicForm
				controls={formattedControls}
				data={formattedData}
				errors={controlErrors}
				testId={testId}
				components={components}
				onControlChange={onControlChange}
			/>
		</>
	);
}
