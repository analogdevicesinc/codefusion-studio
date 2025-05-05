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
import {CfsSuspense, SlidingPanel} from 'cfs-react-library';
import {
	useActivePeripheral,
	useActiveSignal
} from '../../../state/slices/peripherals/peripherals.selector';
import {
	setActivePeripheral,
	setActiveSignal
} from '../../../state/slices/peripherals/peripherals.reducer';
import {useAppDispatch} from '../../../state/store';
import SignalConfigTask from './SignalConfigTask';
import PeripheralConfigTask from './PeripheralConfigTask';
import {
	getPeripheralSignals,
	getSocPeripheralDictionary
} from '../../../utils/soc-peripherals';
import {useMemo} from 'react';
import {getControlsForProjectIds} from '../../../utils/api';
import {CONTROL_SCOPES} from '../../../constants/scopes';

type ConfigSidebarProps = {
	readonly isMinimised: boolean;
};

function ConfigSidebar({isMinimised}: ConfigSidebarProps) {
	const dispatch = useAppDispatch();
	const [activePeripheral, projectId] =
		useActivePeripheral(true)?.split(':') ?? [];
	const activeSignal = useActiveSignal();
	const signalName = activeSignal?.split(' ')[1] ?? '';
	const peripheralName = activeSignal?.split(' ')[0] ?? '';
	// If both are active, signal takes precedence
	const activeConfig = activeSignal ?? activePeripheral;

	const description =
		activePeripheral && !signalName
			? getSocPeripheralDictionary()[activePeripheral ?? '']
					?.description
			: getPeripheralSignals(peripheralName ?? '')[signalName]
					?.description;

	const controlsPromise = useMemo(
		async () =>
			projectId
				? getControlsForProjectIds(
						[projectId],
						CONTROL_SCOPES.PERIPHERAL
					)
				: Promise.resolve({}),
		[projectId]
	);

	return (
		<SlidingPanel
			title={(activeConfig ?? '').toUpperCase()}
			description={description}
			isMinimised={isMinimised}
			closeSlider={() => {
				if (activeSignal) {
					dispatch(setActiveSignal(undefined));
				}

				if (activePeripheral) {
					dispatch(setActivePeripheral(undefined));
				}
			}}
		>
			{activeSignal ? (
				<SignalConfigTask />
			) : activePeripheral ? (
				<CfsSuspense>
					<PeripheralConfigTask controlsPromise={controlsPromise} />
				</CfsSuspense>
			) : null}
		</SlidingPanel>
	);
}

export default ConfigSidebar;
