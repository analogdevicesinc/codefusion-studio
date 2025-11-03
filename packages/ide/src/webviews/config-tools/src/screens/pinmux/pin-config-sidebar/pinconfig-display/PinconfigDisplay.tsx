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
import {useMemo} from 'react';
import {createPortal} from 'react-dom';
import ControlDropdown from '../control-dropdown/ControlDropdown';
import {
	useAppliedSignalCfg,
	useAssignedPin
} from '../../../../state/slices/pins/pins.selector';
import {useDispatch} from 'react-redux';
import {setResetControlValues} from '../../../../state/slices/pins/pins.reducer';
import PinconfigControlInput from '../pinconfig-control-input/PinconfigControlInput';
import {getSocPinDetails} from '../../../../utils/soc-pins';
import {getSocPinResetControlValues} from '../../../../utils/pin-reset-controls';
import {
	useActivePeripheral,
	useActiveSignal,
	useGetAllocatedProjectId
} from '../../../../state/slices/peripherals/peripherals.selector';
import {use} from 'cfs-react-library';
import type {ControlCfg} from '@common/types/soc';
import {PIN_CONFIG_PLUGIN_OPTIONS_FORM_ID} from '../pin-config-task';
import {shouldRenderControl} from '../../../../utils/rpn-expression-resolver';
import PluginInfo from '../../../../components/plugin-info/plugin-info';
import styles from './PinconfigDisplay.module.scss';

type ControlItem = {
	id: string;
	control: ControlCfg;
};

export default function PinconfigDisplay({
	controlsPromise,
	projectId
}: Readonly<{
	controlsPromise: Promise<Record<string, ControlCfg[]>>;
	projectId?: string;
}>) {
	const dispatch = useDispatch();
	const activePeripheral = useActivePeripheral();
	const activeSignal = useActiveSignal()?.split(' ')[1];
	const controls = use(controlsPromise);

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

	const {PinCfg: userSelections} =
		useAppliedSignalCfg(
			activePin?.pinId,
			activePeripheral,
			activeSignal
		) ?? {};

	const resetValues = getSocPinResetControlValues(
		activePin?.pinId,
		activeSignal,
		activePeripheral,
		controls.PinConfig
	);

	const signalPinCfg = getSocPinDetails(
		activePin?.pinId ?? ''
	)?.Signals?.find(
		signal =>
			signal.Name === activeSignal &&
			signal.Peripheral === activePeripheral
	)?.PinConfig;

	// Filter out controls that should not render for the current configuration
	const filteredControls = useMemo(() => {
		const filteredList: ControlItem[] = [];

		if (!Object.keys(pinConfigControls).length) {
			return filteredList;
		}

		// Add controls based on SoC signalPinCfg info
		if (signalPinCfg) {
			for (const controlId in signalPinCfg) {
				if (
					Object.prototype.hasOwnProperty.call(
						signalPinCfg,
						controlId
					)
				) {
					const control = pinConfigControls[controlId];
					// Render only enum options that contain programming steps
					const formattedControl: ControlCfg = control?.EnumValues
						?.length
						? {
								...control,
								EnumValues: control.EnumValues.filter(enumValue =>
									Object.keys(signalPinCfg[controlId]).includes(
										enumValue.Id
									)
								)
							}
						: control;

					// Only add control if it should be rendered based on its condition
					if (
						shouldRenderControl(
							formattedControl,
							userSelections,
							activeSignal ?? ''
						)
					) {
						filteredList.push({
							id: controlId,
							control: formattedControl
						});
					}
				}
			}
		}

		const pluginOptions = Object.values(pinConfigControls).filter(
			control => control?.PluginOption
		);

		// Check and add plugin controls
		for (const control of pluginOptions) {
			if (control?.PluginOption) {
				// Only add plugin control if it should be rendered based on its condition
				if (
					shouldRenderControl(
						control,
						userSelections,
						activeSignal ?? ''
					)
				) {
					filteredList.push({
						id: control.Id,
						control
					});
				}
			}
		}

		return filteredList;
	}, [pinConfigControls, signalPinCfg, userSelections, activeSignal]);

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

	const didDefaultValuesChange = Object.entries(
		userSelections ?? {}
	).some(([key, value]) => value !== resetValues?.[key]);

	const isInput = (controlId: string) =>
		['integer', 'text'].includes(pinConfigControls[controlId]?.Type);

	const handleReset = () => {
		if (!controls?.PinConfig.length) return;

		dispatch(
			setResetControlValues({
				Peripheral: activePeripheral,
				Name: activeSignal,
				pinId: activePin?.pinId,
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

				if (isInput(controlId)) {
					return (
						<PinconfigControlInput
							key={`${activeSignal}-${activePin?.pinId}-${controlId}`}
							controlCfg={controlCfg}
							controlValue={controlValue}
							defaultControlValue={defaultValue}
							pinId={activePin?.pinId}
							peripheral={activePeripheral}
							signal={activeSignal}
							projectId={projectId}
						/>
					);
				}

				return (
					<ControlDropdown
						key={`${activeSignal}-${activePin?.pinId}-${controlId}`}
						controlCfg={controlCfg}
						controlValue={controlValue}
						isDefaultValue={controlValue === defaultValue}
						pinId={activePin?.pinId}
						peripheral={activePeripheral}
						signal={activeSignal}
						projectId={projectId}
					/>
				);
			})
			.filter((control): control is JSX.Element => control !== null);
	};

	const activeProjectId = useGetAllocatedProjectId(
		activePeripheral ?? '',
		activeSignal ?? ''
	);

	// Render plugin controls as portal
	const renderPluginControls = () => {
		const portalTarget = document.getElementById(
			PIN_CONFIG_PLUGIN_OPTIONS_FORM_ID
		);

		if (!portalTarget) {
			return null;
		}

		return createPortal(
			<section className={styles.controlContainer}>
				{Object.keys(pinConfigControls).length === 0 ||
				pluginControls.length === 0 ? (
					<div className={styles.info}>
						<p>No plugin options available.</p>
					</div>
				) : (
					renderControls(pluginControls)
				)}

				<PluginInfo projectId={activeProjectId} />
			</section>,
			portalTarget
		);
	};

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
