/**
 *
 * Copyright (c) 2024 Analog Devices, Inc.
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
import {useAppSelector} from '../../store';

export function usePeripherals() {
	return useAppSelector(
		state => state.peripheralsReducer.peripherals
	);
}

export function useActivePeripheral() {
	return useAppSelector(
		state => state.peripheralsReducer.activePeripheral
	);
}

export function useCurrentTarget(
	peripheralGroup: string,
	signalName: string
) {
	return useAppSelector(
		state =>
			state.peripheralsReducer.peripherals[peripheralGroup].signals
				.dict[signalName].currentTarget
	);
}

export function usePeripheralSignalCfg(
	peripheralName: string | undefined,
	signalName: string | undefined
) {
	return useAppSelector(
		state =>
			peripheralName &&
			signalName &&
			state.peripheralsReducer.peripherals[peripheralName].signals
				.dict[signalName].invalid
	);
}
