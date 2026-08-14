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

import {navigationItems} from '@common/constants/navigation';
import {
	setActiveScreen,
	setActiveSearchString
} from '../../../state/slices/app-context/appContext.reducer';
import {useAppDispatch} from '../../../state/store';
import ConfigPanel from '../../../components/config-panel/ConfigPanel';
import PeripheralDetails from './DetailsSection';
import ManagePeripheralPinAssignments from './ManagePeripheralPinAssignments';
import PeripheralConfigForm from './PeripheralConfigForm';
import {
	type TFormData,
	type TFormFieldValue,
	use
} from 'cfs-react-library';
import {
	useActivePeripheral,
	usePeripheralConfig
} from '../../../state/slices/peripherals/peripherals.selector';
import {getProjectInfoList} from '../../../utils/config';
import ConfigUnavailable from '../../../components/config-unavailable/config-unavailable';
import {setPinDetailsTargetPin} from '../../../state/slices/pins/pins.reducer';
import {type ControlCfg} from '@common/types/soc';
import {
	categorizeControls,
	formatControlsForDynamicForm
} from '../../../utils/soc-controls';
import {useEffect, useMemo} from 'react';
import {
	computePeripheralResetValues,
	getConfigFormatFromSocControls
} from '../../../utils/soc-peripherals';
import {useActivePeripheralHasPins} from '../../../hooks/useActivePeripheralHasPins';
import {areControlValuesEqual} from '../../../utils/control-defaults';
import {setPeripheralConfig} from '../../../state/slices/peripherals/peripherals.reducer';

export const PERIPHERAL_PLUGIN_OPTIONS_FORM_ID =
	'peripheral-plugin-options-form';

type PeripheralConfigTaskProps = {
	readonly controlsPromise: Promise<Record<string, ControlCfg[]>>;
};

const getActiveConfigValues = (
	config: Record<string, TFormFieldValue> | undefined,
	controls: ControlCfg[]
): Record<string, TFormFieldValue> => {
	const activeConfig: Record<string, TFormFieldValue> = {
		...(config ?? {})
	};

	for (const control of controls) {
		if (control.Type !== 'enum') continue;

		if (
			!Object.prototype.hasOwnProperty.call(activeConfig, control.Id)
		) {
			continue;
		}

		const currentValue =
			activeConfig[control.Id] === undefined
				? undefined
				: String(activeConfig[control.Id]);

		const currentEnumValue = control.EnumValues?.find(
			enumValue => enumValue.Id === currentValue
		);

		if (currentEnumValue && !currentEnumValue.Inactive) {
			continue;
		}

		activeConfig[control.Id] =
			control.EnumValues?.find(enumValue => !enumValue.Inactive)
				?.Id ??
			currentValue ??
			'';
	}

	return activeConfig;
};

function PeripheralConfigTask({
	controlsPromise
}: PeripheralConfigTaskProps) {
	const dispatch = useAppDispatch();

	const [activePeripheral, projectId] =
		useActivePeripheral(true)?.split(':') ?? [];

	const projectConfig = getProjectInfoList()?.find(
		p => p.ProjectId === projectId
	);

	const isExternallyManaged = useMemo(
		() => Boolean(projectConfig?.ExternallyManaged),
		[projectConfig?.ExternallyManaged]
	);

	const controls = useMemo(
		() => (isExternallyManaged ? {} : use(controlsPromise)),
		[isExternallyManaged, controlsPromise]
	);

	const getModifiedFields = (
		formData: TFormData,
		resetValues: Record<string, TFormFieldValue>
	): Record<string, boolean> =>
		Object.keys(formData ?? {}).reduce<Record<string, boolean>>(
			(acc, key) => {
				acc[key] = !areControlValuesEqual(
					formData[key],
					resetValues[key]
				);

				return acc;
			},
			{}
		);

	const currentConfig = usePeripheralConfig(activePeripheral);

	const peripheralControls = useMemo(
		() => controls[activePeripheral] ?? [],
		[activePeripheral, controls]
	);

	const resetValues = useMemo(
		() =>
			isExternallyManaged
				? {}
				: computePeripheralResetValues(
						activePeripheral,
						peripheralControls
					),
		[activePeripheral, isExternallyManaged, peripheralControls]
	);

	const activeCurrentConfig = useMemo(
		() => getActiveConfigValues(currentConfig, peripheralControls),
		[currentConfig, peripheralControls]
	);

	// Used to dynamically highlight the fields that have diverged from the default values
	const modifiedFields = useMemo(
		() => getModifiedFields(activeCurrentConfig, resetValues),
		[activeCurrentConfig, resetValues]
	);

	const formattedData = {...resetValues, ...activeCurrentConfig};

	const formattedControls = formatControlsForDynamicForm(
		peripheralControls,
		{projectId, ...formattedData},
		modifiedFields
	);

	const [peripheralOptions, pluginOptions] = useMemo(
		() => categorizeControls(formattedControls),
		[formattedControls]
	);

	const showManagePinAssignments = useActivePeripheralHasPins(true);

	const unavailableSections = () => {
		const unavailable: Record<
			'pinAssignment' | 'configuration' | 'plugin',
			boolean
		> = {
			pinAssignment: false,
			configuration: false,
			plugin: false
		};

		unavailable.pinAssignment = !showManagePinAssignments;
		unavailable.configuration = peripheralOptions.length === 0;
		unavailable.plugin = pluginOptions.length === 0;

		return unavailable;
	};

	/**
	 * Syncs existing stored config values if they point to inactive enum options.
	 */
	useEffect(() => {
		if (isExternallyManaged) return;
		if (!activePeripheral) return;
		if (Object.keys(currentConfig ?? {}).length === 0) return;

		const didConfigChange = Object.keys({
			...currentConfig,
			...activeCurrentConfig
		}).some(
			key =>
				!areControlValuesEqual(
					currentConfig?.[key],
					activeCurrentConfig[key]
				)
		);

		if (!didConfigChange) return;

		const configFormat = getConfigFormatFromSocControls(
			peripheralControls
		);

		dispatch(
			setPeripheralConfig({
				config: activeCurrentConfig,
				peripheralId: activePeripheral,
				...(configFormat && {configFormat})
			})
		);
	}, [
		activeCurrentConfig,
		activePeripheral,
		currentConfig,
		dispatch,
		isExternallyManaged,
		peripheralControls
	]);

	return (
		<div data-test='config-sidebar:peripheral-config'>
			<ConfigPanel
				details={<PeripheralDetails />}
				variant={isExternallyManaged ? 'noChevron' : 'default'}
				managePinAssignments={
					showManagePinAssignments ? (
						<ManagePeripheralPinAssignments />
					) : undefined
				}
				configuration={
					isExternallyManaged ? (
						<ConfigUnavailable message='This peripheral is allocated to a core that is externally managed' />
					) : (
						<PeripheralConfigForm
							/* NOTE rerender is intentionally triggered to allow switching
							 * between peripherals without closing the sidebar first.
							 */
							key={`${activePeripheral}:${projectId}`}
							formattedData={formattedData}
							formattedControls={formattedControls}
							peripheralControls={peripheralControls}
							resetValues={resetValues}
							peripheralOptions={peripheralOptions}
							pluginOptions={pluginOptions}
							activePeripheral={activePeripheral}
							projectId={projectId}
						/>
					)
				}
				pluginConfiguration={
					!isExternallyManaged && (
						<div
							data-test='peripheral-config:plugin-section'
							id={PERIPHERAL_PLUGIN_OPTIONS_FORM_ID}
						/>
					)
				}
				isExternallyManaged={isExternallyManaged}
				unavailableSections={unavailableSections()}
				onManagePinAssignmentsClick={() => {
					dispatch(setPinDetailsTargetPin(undefined));
					dispatch(
						setActiveSearchString({
							searchContext: 'pinconfig',
							value: ''
						})
					);
					dispatch(setActiveScreen(navigationItems.pinmux));
				}}
			/>
		</div>
	);
}

export default PeripheralConfigTask;
