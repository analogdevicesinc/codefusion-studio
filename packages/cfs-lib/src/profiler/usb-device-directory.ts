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

import { getDeviceList, usb, type Device } from "usb";

/**
 * A USB device enumerated on the host, with a human-readable label
 * suitable for display in a device picker.
 */
export interface UsbDeviceDescriptor {
	busNumber: number;
	deviceAddress: number;
	label: string;
}

/**
 * Encodes a number as a 4-digit hex string, padded with leading zeroes if necessary.
 * @param value - The number to encode.
 * @returns The encoded hex string.
 */
const hex = (value: number) => value.toString(16).padStart(4, "0");

/**
 * Formats a number as a 3-digit decimal string, padded with leading zeroes if necessary.
 * @param value - The number to format.
 * @returns The formatted decimal string.
 */
const decimal = (value: number) =>
	value.toString(10).padStart(3, "0");

/**
 * Lists the USB devices currently connected to the host.
 * @returns A descriptor for every enumerated device.
 */
export async function listUsbDevices(): Promise<
	UsbDeviceDescriptor[]
> {
	return Promise.all(getFilteredUsbDevices().map(describeUsbDevice));
}

/**
 * Resolves a previously-enumerated USB device back to a live `Device`
 * handle, e.g. to pass to `UsbSourceConfig`.
 * @param busNumber - Bus number of the target device.
 * @param deviceAddress - Device address of the target device.
 * @returns The matching, closed `Device`, or `undefined` if no
 * currently-connected device has this bus number and device address.
 */
export function findUsbDevice(
	busNumber: number,
	deviceAddress: number
): Device | undefined {
	return getFilteredUsbDevices().find(
		(device) =>
			device.busNumber === busNumber &&
			device.deviceAddress === deviceAddress
	);
}

/**
 * Subscribes to USB device disconnect events, e.g. to re-check a
 * configured source when the device it points at goes away.
 * @param listener - Called with the device that was disconnected.
 * @returns A function that removes the listener.
 */
export function onUsbDeviceDetached(
	listener: (device: Device) => void
): () => void {
	usb.on("detach", listener);

	return () => {
		usb.off("detach", listener);
	};
}

/**
 * Lists the USB devices currently connected to the host, filtered to
 * only those that match the project specific vendor/product ID.
 * @returns An array of `Device` objects matching the vendor/product ID filter.
 */
function getFilteredUsbDevices(): Device[] {
	return getDeviceList().filter(
		(device) =>
			hex(device.deviceDescriptor.idVendor) === "0456" &&
			hex(device.deviceDescriptor.idProduct) === "aa55"
	);
}

/**
 * Builds a descriptor for a single device.
 * @param device - The device to describe.
 */
async function describeUsbDevice(
	device: Device
): Promise<UsbDeviceDescriptor> {
	const { busNumber, deviceAddress } = device;

	return {
		busNumber,
		deviceAddress,
		label: await formatUsbDeviceLabel(device)
	};
}

/**
 * Formats a device's identity as "<device.productName> - Bus xxx, Device xxx",
 * e.g. "My Device - Bus 001, Device 012". If device.productName is unavailable, the label falls back to "Bus xxx, Device xxx".
 * @param device - The device to describe.
 */
async function formatUsbDeviceLabel(device: Device): Promise<string> {
	const busAndDevice =
		`Bus ${decimal(device.busNumber)}, ` +
		`Device ${decimal(device.deviceAddress)}`;

	const productName = await readProductName(device);

	return productName
		? `${productName} - ${busAndDevice}`
		: busAndDevice;
}

/**
 * Reads a device's product name string descriptor. The `usb` package
 * has no static field for this — it's only available by briefly
 * opening the device and issuing a control transfer, which can fail
 * or be unsupported on some hardware, so callers must be prepared to
 * fall back when this returns `undefined`.
 * @param device - The device to read the product name from.
 * @returns The product name, or `undefined` if the device has none,
 * or it could not be read.
 */
async function readProductName(
	device: Device
): Promise<string | undefined> {
	const { iProduct } = device.deviceDescriptor;

	if (iProduct === 0) {
		return undefined;
	}

	let opened = false;

	try {
		device.open();
		opened = true;

		return await new Promise<string | undefined>((resolve) => {
			device.getStringDescriptor(iProduct, (error, value) => {
				resolve(error ? undefined : value);
			});
		});
	} catch {
		return undefined;
	} finally {
		if (opened) {
			try {
				device.close();
			} catch {
				// Device may already be unusable (e.g. disconnected
				// mid-read) — nothing more to clean up.
			}
		}
	}
}
