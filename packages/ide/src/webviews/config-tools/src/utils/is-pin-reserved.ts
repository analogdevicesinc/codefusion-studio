import {getSocPinDetails} from './soc-pins';

export function isPinReserved(pinId: string) {
	const pinDetails = getSocPinDetails(pinId);

	return pinDetails?.Signals?.every(signal => !signal.PinMuxConfig);
}
