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
import ControlDropdown from '../control-dropdown/ControlDropdown';
import {
	useAppliedSignalCfg,
	useAssignedPin
} from '../../../../state/slices/pins/pins.selector';
import {useDispatch} from 'react-redux';
import {setResetControlValues} from '../../../../state/slices/pins/pins.reducer';
import PinconfigControlInput from '../pinconfig-control-input/PinconfigControlInput';
import PinconfigControlToggle from '../pinconfig-control-toggle/PinconfigControlToggle';
import {getSocPinDetails} from '../../../../utils/soc-pins';
import {getSocPinResetControlValues} from '../../../../utils/pin-reset-controls';
import {
	useActivePeripheral,
	useActiveSignal,
	useSignalProjectId
} from '../../../../state/slices/peripherals/peripherals.selector';
import {use} from 'cfs-react-library';
import type {ControlCfg} from '@common/types/soc';
import {PIN_CONFIG_PLUGIN_OPTIONS_FORM_ID} from '../pin-config-task';
import {shouldRenderPinConfigControl} from '../../../../utils/rpn-expression-resolver';
import PluginInfo from '../../../../components/plugin-info/plugin-info';
import styles from './PinconfigDisplay.module.scss';
import {areControlValuesEqual} from '../../../../utils/control-defaults';
import {useScopes} from '../../../../state/slices/scopes/scopes.selector';
import {CONTROL_SCOPES} from '../../../../constants/scopes';
import {
	type ScopeValidationOptions,
	validatePluginOptions
} from '../../../../utils/plugin-options-validation';
import {
	type TLocaleContext,
	useLocaleContext
} from '../../../../../../common/contexts/LocaleContext';
import {localizeMessage} from '../../../../../../common/utils/localization';
import {getApplicablePinConfigControls} from './pin-config-controls';

export default function PinconfigDisplay({
	controlsPromise,
	pinId,
	projectId
}: Readonly<{
	controlsPromise: Promise<Record<string, ControlCfg[]>>;
	pinId?: string;
	projectId?: string;
}>) {
	const dispatch = useDispatch();
	const activePeripheral = useActivePeripheral();
	const activeSignal = useActiveSignal()?.split(' ')[1];
	const controls = use(controlsPromise);
	const scopes = useScopes();
	const i10n: TLocaleContext | undefined = useLocaleContext()?.pinmux;
	const pinConfigL10n = useLocaleContext()?.pinConfig as
		| Record<string, string>
		| undefined;

	const pinConfigControls = useMemo(
		() =>
			controls.PinConfig?.length
				? controls.PinConfig.reduce<Record<string, ControlCfg>>(
						(acc, control) => {
							acc[control.Id] = control;

							return acc;
						},
						{}
					)
				: {},
		[controls]
	);

	const activePin = useAssignedPin({
		peripheral: activePeripheral ?? '',
		signal: activeSignal ?? ''
	});
	const resolvedPinId = activePin?.pinId ?? pinId;

	const {PinCfg: userSelections} =
		useAppliedSignalCfg(
			resolvedPinId,
			activePeripheral,
			activeSignal
		) ?? {};

	const resetValues = getSocPinResetControlValues(
		resolvedPinId,
		activeSignal,
		activePeripheral,
		controls.PinConfig
	);

	const signalPinCfg = getSocPinDetails(
		resolvedPinId ?? ''
	)?.Signals?.find(
		signal =>
			signal.Name === activeSignal &&
			signal.Peripheral === activePeripheral
	)?.PinConfig;

	// Filter out controls that should not render for the current configuration
	const filteredControls = useMemo(
		() =>
			getApplicablePinConfigControls(
				controls.PinConfig ?? [],
				signalPinCfg,
				userSelections,
				activeSignal
			),
		[controls.PinConfig, signalPinCfg, userSelections, activeSignal]
	);

	const formatScopeConflictMessage = useCallback<
		ScopeValidationOptions['formatConflictMessage']
	>(
		({value, conflictingItems}) =>
			localizeMessage(i10n, 'scope-conflict.error', {
				value,
				conflictingItems
			}),
		[i10n]
	);
	const scopeValidation = useMemo<
		ScopeValidationOptions | undefined
	>(() => {
		if (!projectId || !activeSignal) {
			return undefined;
		}

		return {
			scopes,
			controlScope: CONTROL_SCOPES.PIN_CONFIG,
			projectId,
			itemId: activeSignal,
			formatConflictMessage: formatScopeConflictMessage
		};
	}, [activeSignal, formatScopeConflictMessage, projectId, scopes]);
	const formErrors = useMemo(
		() =>
			validatePluginOptions(
				userSelections ?? {},
				filteredControls.map(({control}) => control),
				scopeValidation
			),
		[filteredControls, scopeValidation, userSelections]
	);

	// Categorize controls into standard and plugin types
	const [standardControls, pluginControls] = useMemo(() => {
		const standard: string[] = [];
		const plugin: string[] = [];

		filteredControls.forEach(({id, control}) => {
			if (control?.PluginOption) {
				plugin.push(id);
			} else {
				standard.push(id);
			}
		});

		return [standard, plugin];
	}, [filteredControls]);
	const [pluginOptionsPortalTarget, setPluginOptionsPortalTarget] =
		useState<HTMLElement>();

	useEffect(() => {
		setPluginOptionsPortalTarget(
			document.getElementById(PIN_CONFIG_PLUGIN_OPTIONS_FORM_ID) ??
				undefined
		);
	}, [pluginControls.length]);

	const didDefaultValuesChange = Object.entries(
		userSelections ?? {}
	).some(
		([key, value]) =>
			!areControlValuesEqual(value, resetValues?.[key])
	);

	const isInput = (controlId: string) =>
		['integer', 'text'].includes(pinConfigControls[controlId]?.Type);

	const handleReset = () => {
		if (!controls?.PinConfig.length) return;

		dispatch(
			setResetControlValues({
				Peripheral: activePeripheral,
				Name: activeSignal,
				pinId: resolvedPinId,
				controls: controls?.PinConfig,
				// Preserve current plugin options values if available
				resetValues: {...userSelections, ...resetValues}
			})
		);
	};

	const renderControls = (controlIds: string[]) => {
		if (
			Object.keys(pinConfigControls).length === 0 ||
			controlIds.length === 0
		) {
			return (
				<div className={styles.info}>
					<p>
						There are no available settings to be configured for the
						selected peripheral.
					</p>
				</div>
			);
		}

		return controlIds
			.map(controlId => {
				const controlValue = userSelections?.[controlId];
				const defaultValue = resetValues?.[controlId];

				const controlCfg = filteredControls.find(
					control => control.id === controlId
				)?.control;

				if (!controlCfg) {
					return null;
				}

				if (controlCfg.Type === 'boolean') {
					return (
						<PinconfigControlToggle
							key={`${activeSignal}-${resolvedPinId}-${controlId}`}
							controlCfg={controlCfg}
							controlValue={controlValue}
							defaultControlValue={defaultValue}
							pinId={resolvedPinId}
							peripheral={activePeripheral}
							signal={activeSignal}
							projectId={projectId}
						/>
					);
				}

				if (isInput(controlId)) {
					return (
						<PinconfigControlInput
							key={`${activeSignal}-${resolvedPinId}-${controlId}`}
							controlCfg={controlCfg}
							controlValue={controlValue}
							defaultControlValue={defaultValue}
							pinId={resolvedPinId}
							peripheral={activePeripheral}
							signal={activeSignal}
							projectId={projectId}
							scopeError={formErrors[controlId]}
						/>
					);
				}

				return (
					<ControlDropdown
						key={`${activeSignal}-${resolvedPinId}-${controlId}`}
						controlCfg={controlCfg}
						controlValue={controlValue}
						isDefaultValue={areControlValuesEqual(
							controlValue ?? defaultValue,
							defaultValue
						)}
						pinId={resolvedPinId}
						peripheral={activePeripheral}
						signal={activeSignal}
						projectId={projectId}
					/>
				);
			})
			.filter((control): control is JSX.Element => control !== null);
	};

	const signalProjectId = useSignalProjectId(
		activePeripheral ?? '',
		activeSignal ?? ''
	);

	// Render plugin controls as portal
	const renderPluginControls = () => {
		if (!pluginOptionsPortalTarget) {
			return null;
		}

		return createPortal(
			<section className={styles.controlContainer}>
				{Object.keys(pinConfigControls).length === 0 ||
				pluginControls.length === 0 ? (
					<div className={styles.info}>
						<p>
							{pinConfigL10n?.noPluginOptions ??
								'No plugin options available.'}
						</p>
					</div>
				) : (
					renderControls(pluginControls)
				)}

				<PluginInfo projectId={signalProjectId} />
			</section>,
			pluginOptionsPortalTarget
		);
	};

	// This function checks the current user selections against the valid options for this pin/signal
	// and returns an updated config object with any invalid values reset to default.
	const getValidConfigValues = () => {
		const nextValues = {...userSelections};

		for (const controlId of Object.keys(userSelections ?? {})) {
			const value = userSelections?.[controlId];
			if (value === undefined) continue;

			const control = pinConfigControls[controlId];
			const defaultValue = resetValues?.[controlId];

			// Control not available for this pin
			if (!control?.PluginOption && !signalPinCfg?.[controlId]) {
				nextValues[controlId] = defaultValue;
				continue;
			}

			// Enum invalid
			if (control?.EnumValues && signalPinCfg?.[controlId]) {
				const allowed = Object.keys(signalPinCfg[controlId] ?? {});

				if (!allowed.includes(String(value))) {
					nextValues[controlId] = defaultValue;
					continue;
				}
			}

			// Hidden by condition
			if (
				control &&
				!shouldRenderPinConfigControl(
					control,
					nextValues,
					activeSignal ?? ''
				)
			) {
				nextValues[controlId] = defaultValue;
			}
		}

		return nextValues;
	};

	// We need to reset invalid control values if user changes the pin,
	// that way we can avoid showing invalid (blank) values in the dropdowns/inputs.
	useEffect(() => {
		if (!resolvedPinId || !controls?.PinConfig.length) return;

		const validConfigValues = getValidConfigValues();

		const didConfigChange = Object.keys({
			...userSelections,
			...validConfigValues
		}).some(key => userSelections?.[key] !== validConfigValues[key]);

		if (!didConfigChange) return;

		dispatch(
			setResetControlValues({
				Peripheral: activePeripheral,
				Name: activeSignal,
				pinId: resolvedPinId,
				controls: controls.PinConfig,
				resetValues: validConfigValues
			})
		);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [resolvedPinId]);

	return (
		<>
			<section className={styles.controlContainer}>
				{didDefaultValuesChange ? (
					<div
						className={styles.info}
						data-test='package-display-info'
					>
						<p>* non-default value</p>
					</div>
				) : null}

				{renderControls(standardControls)}

				{didDefaultValuesChange && (
					<button
						type='button'
						className={styles.reset}
						data-test='reset-to-default'
						onClick={handleReset}
					>
						Reset to default
					</button>
				)}
			</section>
			{renderPluginControls()}
		</>
	);
}
