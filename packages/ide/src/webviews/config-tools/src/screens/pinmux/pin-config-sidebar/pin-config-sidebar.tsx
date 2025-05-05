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
import {SlidingPanel} from 'cfs-react-library';
import {
	useActivePeripheral,
	useActiveSignal
} from '../../../state/slices/peripherals/peripherals.selector';
import {
	setActivePeripheral,
	setActiveSignal
} from '../../../state/slices/peripherals/peripherals.reducer';
import {useAppDispatch} from '../../../state/store';

import PinConfigTask from './pin-config-task';
import {getPeripheralSignals} from '../../../utils/soc-peripherals';

type ConfigSidebarProps = {
	readonly isMinimised: boolean;
};

function ConfigSidebar({isMinimised}: ConfigSidebarProps) {
	const dispatch = useAppDispatch();
	const activePeripheral = useActivePeripheral();
	const activeSignal = useActiveSignal();
	const signalName = activeSignal?.split(' ')[1] ?? '';
	const socSignal = getPeripheralSignals(activePeripheral ?? '')[
		signalName
	];

	return (
		<SlidingPanel
			title={`${activeSignal ?? ''}`.toUpperCase()}
			description={socSignal?.description ?? ''}
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
			{activePeripheral && activeSignal && (
				<PinConfigTask
					signal={signalName}
					peripheral={activePeripheral ?? ''}
				/>
			)}
		</SlidingPanel>
	);
}

export default ConfigSidebar;
