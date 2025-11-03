import {useMemo} from 'react';
import type {
	FormattedPeripheral,
	FormattedPeripheralSignal,
	Pin
} from '../../../common/types/soc';
import {getPinsByPeripheralSignalDictionary} from '../utils/soc-pins';

export const usePinsGroupByPeripheralSignalPair = (
	targetPins: Pin[],
	peripherals: Array<FormattedPeripheral<FormattedPeripheralSignal>>
) =>
	useMemo(() => {
		if (targetPins) {
			return getPinsByPeripheralSignalDictionary(
				targetPins,
				peripherals
			);
		}

		return {};
	}, [targetPins, peripherals]);
