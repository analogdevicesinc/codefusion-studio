/**
 *
 * Copyright (c) 2026 Analog Devices, Inc.
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
import {useActivePeripheral} from '../state/slices/peripherals/peripherals.selector';
import {getSocPeripheralDictionary} from '../utils/soc-peripherals';

/**
 * Custom hook to check if active peripheral has pins.
 * @param includeCoreInfo If true, the core info will be included in the active peripheral in the format <peripheral>:<core>.
 * @returns {boolean} Has pins.
 */
export function useActivePeripheralHasPins(includeCoreInfo = false) {
	const activePeripheral =
		useActivePeripheral(includeCoreInfo)?.split(':')[0] ?? '';

	const hasPins = useMemo(() => {
		if (typeof activePeripheral !== 'string') return false;

		const peripheralDict = getSocPeripheralDictionary();
		const peripheral = peripheralDict[activePeripheral];

		if (
			!peripheral?.signals ||
			!Object.keys(peripheral.signals).length
		)
			return false;

		return Object.keys(peripheral.signals).some(
			signal => peripheral.signals[signal].pins?.length > 0
		);
	}, [activePeripheral]);

	return hasPins;
}
