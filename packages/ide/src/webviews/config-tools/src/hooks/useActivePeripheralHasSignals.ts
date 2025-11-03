import {useMemo} from 'react';
import {useActivePeripheral} from '../state/slices/peripherals/peripherals.selector';
import {getSocPeripheralDictionary} from '../utils/soc-peripherals';

/**
 * Custom hook to check if active peripheral has signals.
 * @param includeCoreInfo If true, the core info will be included in the active peripheral in the format <peripheral>:<core>.
 * @returns {boolean} Has signals.
 */
export function useActivePeripheralHasSignals(
	includeCoreInfo = false
) {
	const activePeripheral =
		useActivePeripheral(includeCoreInfo)?.split(':')[0] ?? '';

	const hasSignals = useMemo(() => {
		if (typeof activePeripheral !== 'string') return false;

		const peripheralDict = getSocPeripheralDictionary();
		const peripheral = peripheralDict[activePeripheral];

		if (!peripheral?.signals) return false;

		return Object.keys(peripheral.signals).length > 0;
	}, [activePeripheral]);

	return hasSignals;
}
