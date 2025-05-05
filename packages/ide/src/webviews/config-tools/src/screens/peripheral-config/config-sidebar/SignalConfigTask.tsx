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
import SignalDetails from './SignalDetailsSection';
import ManageSignalPinAssignments from './ManageSignalPinAssignments';
import {
	useActiveSignal,
	usePeripheralSignalAllocations
} from '../../../state/slices/peripherals/peripherals.selector';
import useIsPinAssignmentMissing from '../../../hooks/useIsPinAssignmentMissing';
import SignalConfig from './SignalConfig';
import {
	setActivePeripheral,
	setActiveSignal
} from '../../../state/slices/peripherals/peripherals.reducer';
import {getProjectInfoList} from '../../../utils/config';
import ConfigUnavailable from '../../../components/config-unavailable/config-unavailable';

function SignalConfigTask() {
	const dispatch = useAppDispatch();
	const [peripheral, signal] = useActiveSignal()?.split(' ') ?? [];
	const isPinAssignmentMissing = useIsPinAssignmentMissing(
		signal,
		peripheral
	);
	const projectsForSignal = usePeripheralSignalAllocations(
		peripheral,
		signal
	);
	const projectConfig = getProjectInfoList()?.find(p =>
		projectsForSignal.includes(p.ProjectId)
	);

	return (
		<div data-test='config-sidebar:signal-config'>
			<ConfigPanel
				details={<SignalDetails />}
				managePinAssignments={<ManageSignalPinAssignments />}
				configuration={
					projectConfig?.ExternallyManaged ? (
						<ConfigUnavailable message='This signal is allocated to a core that is externally managed' />
					) : (
						<SignalConfig
							isMissingPinAssignement={Boolean(
								isPinAssignmentMissing
							)}
							signal={signal}
						/>
					)
				}
				variant={isPinAssignmentMissing ? 'noChevron' : 'navigate'}
				onManagePinAssignmentsClick={() => {
					dispatch(
						setActiveSearchString({
							searchContext: 'pinconfig',
							value: `${signal} `
						})
					);
					dispatch(setActiveScreen(navigationItems.pinmux));
				}}
				onConfigurationClick={() => {
					dispatch(
						setActiveSearchString({
							searchContext: 'pinconfig',
							value: ''
						})
					);
					dispatch(setActivePeripheral(peripheral));
					dispatch(
						setActiveSignal({
							peripheral,
							signal,
							keepActivePeripheral: true
						})
					);
					dispatch(setActiveScreen(navigationItems.pinmux));
				}}
			/>
		</div>
	);
}

export default SignalConfigTask;
