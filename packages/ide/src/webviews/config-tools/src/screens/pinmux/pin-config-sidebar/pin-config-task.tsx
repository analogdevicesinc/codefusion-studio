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
import ConfigPanel from '../../../components/config-panel/ConfigPanel';
import {
	usePeripheralSignalAllocations,
	useGetAllocatedProjectId
} from '../../../state/slices/peripherals/peripherals.selector';
import PinconfigDisplay from './pinconfig-display/PinconfigDisplay';
import ConfigUnavailable from '../../../components/config-unavailable/config-unavailable';
import {useMemo} from 'react';
import {getControlsForProjectIds} from '../../../utils/api';
import {CfsSuspense} from 'cfs-react-library';
import {CONTROL_SCOPES} from '../../../constants/scopes';
import {getIsExternallyManagedProyect} from '../../../utils/config';

export const PIN_CONFIG_PLUGIN_OPTIONS_FORM_ID =
	'pin-config-plugin-options-form';

type PinConfigTaskProps = {
	readonly peripheral: string;
	readonly signal: string;
};

function PinConfigTask({peripheral, signal}: PinConfigTaskProps) {
	const projectsForSignal = usePeripheralSignalAllocations(
		peripheral,
		signal
	);

	const allocatedProjectId = useGetAllocatedProjectId(
		peripheral,
		signal
	);

	const isExternallyManagedProject = getIsExternallyManagedProyect(
		allocatedProjectId
	);

	const controlsPromise = useMemo(
		async () =>
			allocatedProjectId && !isExternallyManagedProject
				? getControlsForProjectIds(
						[allocatedProjectId],
						CONTROL_SCOPES.PIN_CONFIG
					)
				: Promise.resolve({}),
		[allocatedProjectId, isExternallyManagedProject]
	);

	return (
		<div data-test='config-sidebar:signal-config'>
			<ConfigPanel
				details={undefined}
				variant={
					projectsForSignal.length > 0 ? 'default' : 'noChevron'
				}
				configuration={
					projectsForSignal.length && !isExternallyManagedProject ? (
						<CfsSuspense>
							<PinconfigDisplay
								controlsPromise={controlsPromise}
								projectId={allocatedProjectId}
							/>
						</CfsSuspense>
					) : (
						<ConfigUnavailable
							message={
								isExternallyManagedProject
									? 'This signal is allocated to a project that is externally managed'
									: `Configuration unavailable until ${signal} is allocated to a core.`
							}
						/>
					)
				}
				managePinAssignments={undefined}
				pluginConfiguration={
					projectsForSignal.length > 0 &&
					!isExternallyManagedProject ? (
						<div id={PIN_CONFIG_PLUGIN_OPTIONS_FORM_ID} />
					) : null
				}
			/>
		</div>
	);
}

export default PinConfigTask;
