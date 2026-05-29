/**
 *
 * Copyright (c) 2024-2026 Analog Devices, Inc.
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

import {useCallback, useEffect, useMemo, useState} from 'react';
import {createPortal} from 'react-dom';
import type {
	TFormControl,
	TFormData,
	TFormFieldValue
} from 'cfs-react-library';
import {usePeripheralConfig} from '../../../state/slices/peripherals/peripherals.selector';
import {useAppDispatch} from '../../../state/store';
import {setPeripheralConfig} from '../../../state/slices/peripherals/peripherals.reducer';
import {PERIPHERAL_PLUGIN_OPTIONS_FORM_ID} from './PeripheralConfigTask';
import ConfigurationForm from './ConfigurationForm';
import PluginInfo from '../../../components/plugin-info/plugin-info';
import {getControlsFromCache} from '../../../utils/api';
import {CONTROL_SCOPES} from '../../../constants/scopes';
import {evaluateCondition} from '../../../utils/rpn-expression-resolver';
import type {ControlCfg} from '../../../../../common/types/soc';
import {getPeripheralFormErrors} from '../../../utils/peripheral-errors';
import {
	computePeripheralResetValues,
	getConfigFormatFromSocControls
} from '../../../utils/soc-peripherals';

function PeripheralConfigForm({
	formattedData: fd,
	formattedControls,
	peripheralControls,
	activePeripheral,
	projectId,
	resetValues,
	peripheralOptions,
	pluginOptions
}: Readonly<{
	activePeripheral: string;
	projectId: string;
	formattedData: TFormData;
	formattedControls: TFormControl[];
	peripheralControls: ControlCfg[];
	resetValues: Record<string, TFormFieldValue>;
	peripheralOptions: TFormControl[];
	pluginOptions: TFormControl[];
}>) {
	const dispatch = useAppDispatch();
	const [portalTarget, setPortalTarget] = useState<
		HTMLElement | undefined
	>(
		document.getElementById(PERIPHERAL_PLUGIN_OPTIONS_FORM_ID) ??
			undefined
	);
	const currentConfig = usePeripheralConfig(activePeripheral);

	// For booleans we need to convert the string values to boolean
	const formattedData = useMemo(() => {
		const data = {...fd};

		Object.keys(data).forEach(key => {
			if (
				formattedControls.find(control => control.id === key)
					?.type === 'boolean'
			) {
				if (typeof data[key] === 'string') {
					data[key] = data[key].toUpperCase() === 'TRUE';
				} else if (typeof data[key] === 'number') {
					/* Treat 0 as false, any other number as true. */
					data[key] = data[key] !== 0;
				}
			}
		});

		return data;
	}, [formattedControls, fd]);

	const formErrors: Record<string, string> = getPeripheralFormErrors(
		peripheralControls ?? [],
		formattedData
	);

	const handleOnChange = (
		fieldId: string,
		value: TFormFieldValue
	) => {
		// Convert the boolean values to uppercase string
		if (
			formattedControls.find(control => control.id === fieldId)
				?.type === 'boolean'
		) {
			value = value.toString().toUpperCase();
		}

		if (typeof value === 'number') {
			value = value.toString();
		}

		// Update the user selections in the store
		const newConfig = {
			...(Object.keys(currentConfig).length === 0
				? resetValues
				: currentConfig),
			[fieldId]: value
		};

		// Compute the next control set based on the new config values
		// Used to persist only configuration values that are going to be available on the next render.
		const fullControlSet =
			getControlsFromCache(CONTROL_SCOPES.PERIPHERAL, projectId)?.[
				activePeripheral
			] ?? [];

		const nextControlSet: ControlCfg[] = [];

		for (const control of fullControlSet) {
			if (
				evaluateCondition(
					{projectId, ...newConfig, Name: activePeripheral} as Record<
						string,
						string
					>,
					control.Condition
				)
			) {
				nextControlSet.push(control);
			}
		}

		// Filter out the config options that are not present in the next control set
		for (const key in newConfig) {
			if (!Object.prototype.hasOwnProperty.call(newConfig, key))
				continue;

			const targetControl = nextControlSet.find(
				control => control.Id === key
			);

			if (!targetControl) {
				Reflect.deleteProperty(newConfig, key);

				continue;
			}
		}

		let defaults: Record<string, string> | undefined;

		// Add missing config values that are present in nextControlSet but not in newConfig
		for (const control of nextControlSet) {
			if (
				!Object.prototype.hasOwnProperty.call(newConfig, control.Id)
			) {
				if (!defaults) {
					defaults = computePeripheralResetValues(
						activePeripheral,
						nextControlSet
					);
				}

				newConfig[control.Id] = defaults[control.Id] ?? '';
			}
		}

		// Prepare the config format dictionary
		const configFormat = getConfigFormatFromSocControls(
			peripheralControls
		);

		// If there are enum options that are conditional in a control, then the user may have
		// changed a setting which results in another control changing its permitted values.
		// A problem arises if the current setting of this other control is no longer an
		// acceptable option. We have to detect that, and if it's no longer valid, we reset it
		// to something that _is_ valid.
		// Of course, that change may itself cause additional changes, but we assume conditions only
		// propagate onwards to later controls, so we should not need to iterate to convergence.
		nextControlSet.forEach(c => {
			if (c.Type === 'enum') {
				if (
					!c.EnumValues?.find(
						e =>
							e.Id === newConfig[c.Id] &&
							evaluateCondition(
								{projectId, ...newConfig} as Record<string, string>,
								e.Condition
							)
					)
				) {
					newConfig[c.Id] =
						c.EnumValues?.find(e =>
							evaluateCondition(
								{projectId, ...newConfig} as Record<string, string>,
								e.Condition
							)
						)?.Id ?? '';
				}
			}
		});

		dispatch(
			setPeripheralConfig({
				config: newConfig,
				peripheralId: activePeripheral,
				...(configFormat && {configFormat})
			})
		);
	};

	useEffect(() => {
		const portalTarget = document.getElementById(
			PERIPHERAL_PLUGIN_OPTIONS_FORM_ID
		);
		setPortalTarget(portalTarget ? portalTarget : undefined);
	}, []);

	const handleReset = useCallback(() => {
		dispatch(
			setPeripheralConfig({
				// NOTE: We need to reset all controls,
				// since some parts of the controls may be hidden.
				config: resetValues,
				peripheralId: activePeripheral
			})
		);
	}, [activePeripheral, dispatch, resetValues]);

	return (
		<>
			<ConfigurationForm
				controls={peripheralOptions}
				data={formattedData}
				errors={formErrors}
				resetValues={resetValues}
				testId='peripheral-config:form'
				emptyMessage='There are no available settings to be configured for the selected peripheral.'
				onControlChange={handleOnChange}
				onReset={handleReset}
			/>

			{
				/* Renders the plugin options form as a portal in its corresponding section of the DOM */
				(() =>
					portalTarget ? (
						createPortal(
							<>
								<ConfigurationForm
									controls={pluginOptions}
									data={formattedData}
									errors={formErrors}
									resetValues={resetValues}
									testId='plugin-options:plugin-form'
									emptyMessage='No plugin options available.'
									onControlChange={handleOnChange}
									onReset={handleReset}
								/>
								<PluginInfo projectId={projectId} />
							</>,
							portalTarget
						)
					) : (
						<span>Plugins section missing.</span>
					))()
			}
		</>
	);
}

export default PeripheralConfigForm;
