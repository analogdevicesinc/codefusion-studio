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
import {type ControlCfg} from '../../../../../common/types/soc';
import {
	categorizeControls,
	formatControlsForDynamicForm
} from '../../../utils/soc-controls';
import {useMemo} from 'react';
import {computePeripheralResetValues} from '../../../utils/soc-peripherals';

export const PERIPHERAL_PLUGIN_OPTIONS_FORM_ID =
	'peripheral-plugin-options-form';
type PeripheralConfigTaskProps = {
	readonly controlsPromise: Promise<Record<string, ControlCfg[]>>;
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
				acc[key] = formData[key] !== resetValues[key];

				return acc;
			},
			{}
		);

	const currentConfig = usePeripheralConfig(activePeripheral);

	const resetValues = useMemo(
		() =>
			isExternallyManaged
				? {}
				: computePeripheralResetValues(
						activePeripheral,
						controls[activePeripheral]
					),
		[activePeripheral, controls, isExternallyManaged]
	);

	// Used to dynamically highlight the fields that have diverged from the default values
	const modifiedFields = useMemo(
		() => getModifiedFields(currentConfig, resetValues),
		[currentConfig, resetValues]
	);

	const formattedData =
		Object.keys(currentConfig ?? {}).length === 0
			? {...resetValues}
			: {...currentConfig};

	const formattedControls = formatControlsForDynamicForm(
		controls[activePeripheral] ?? [],
		formattedData,
		modifiedFields
	);

	const [peripheralOptions, pluginOptions] = useMemo(
		() => categorizeControls(formattedControls),
		[formattedControls]
	);

	const unavailableSections = () => {
		const unavailable: Record<string, boolean> = {};

		unavailable.configuration = peripheralOptions.length === 0;
		unavailable.plugin = pluginOptions.length === 0;

		return unavailable;
	};

	return (
		<div data-test='config-sidebar:peripheral-config'>
			<ConfigPanel
				details={<PeripheralDetails />}
				variant={isExternallyManaged ? 'noChevron' : 'default'}
				managePinAssignments={<ManagePeripheralPinAssignments />}
				configuration={
					isExternallyManaged ? (
						<ConfigUnavailable message='This peripheral is allocated to a core that is externally managed' />
					) : (
						<PeripheralConfigForm
							formattedData={formattedData}
							formattedControls={formattedControls}
							peripheralControls={controls[activePeripheral] ?? []}
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
