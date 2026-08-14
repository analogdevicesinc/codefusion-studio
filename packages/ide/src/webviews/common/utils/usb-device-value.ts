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

/**
 * Encodes a USB device's bus number and device address as a single
 * string, for use as a dropdown option value (and for comparing a
 * configured selection against a list of available devices).
 */
export function encodeUsbValue(
	busNumber: number,
	deviceAddress: number
): string {
	return `${busNumber}:${deviceAddress}`;
}

/**
 * Decodes a value produced by {@link encodeUsbValue} back into a bus
 * number/device address pair, or `undefined` if it isn't well-formed.
 */
export function decodeUsbValue(
	value: string
): {busNumber: number; deviceAddress: number} | undefined {
	const [busNumberPart, deviceAddressPart] = value.split(':');
	const busNumber = Number(busNumberPart);
	const deviceAddress = Number(deviceAddressPart);

	if (Number.isNaN(busNumber) || Number.isNaN(deviceAddress)) {
		return undefined;
	}

	return {busNumber, deviceAddress};
}

/**
 * Finds the label of the device matching `target` in `devices` (e.g.
 * to show the same label for a configured device as the selection
 * dropdown shows for it), comparing by the same encoding as
 * {@link encodeUsbValue} rather than by object identity.
 */
export function findUsbDeviceLabel(
	devices: ReadonlyArray<{
		busNumber: number;
		deviceAddress: number;
		label: string;
	}>,
	target: {busNumber: number; deviceAddress: number} | undefined
): string | undefined {
	if (!target) {
		return undefined;
	}

	const targetValue = encodeUsbValue(
		target.busNumber,
		target.deviceAddress
	);

	return devices.find(
		device =>
			encodeUsbValue(device.busNumber, device.deviceAddress) ===
			targetValue
	)?.label;
}
