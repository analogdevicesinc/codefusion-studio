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

import type { Device } from "usb";
import type { IProfilerDataSource } from "./data-source.js";
import { SerialDataSource } from "./serial-data-source.js";
import type { SerialLineOptions } from "./serial-port-settings.js";
import { UsbDataSource } from "./usb-data-source.js";

/**
 * Configuration for a serial port data source.
 */
export class SerialSourceConfig {
	declare private readonly __serialSourceConfigBrand: "SerialSourceConfig";

	/**
	 * @param portPath Serial port path (e.g., '/dev/ttyUSB0' or 'COM3')
	 * @param baudRate Baud rate for the serial connection
	 * @param lineOptions Optional data bits, parity and stop bits
	 */
	constructor(
		public readonly portPath: string,
		public readonly baudRate: number,
		public readonly lineOptions: SerialLineOptions = {}
	) {}
}

/**
 * Configuration for a USB data source.
 */
export class UsbSourceConfig {
	declare private readonly __usbSourceConfigBrand: "UsbSourceConfig";

	/**
	 * @param device The USB device to capture from. The device is expected to
	 * be closed. Its open/close lifecycle will be managed by the data source implementation.
	 */
	constructor(public readonly device: Device) {}
}

export type DataSourceConfig = SerialSourceConfig | UsbSourceConfig;

/**
 * Creates a data source instance based on the provided configuration.
 * @param config - Configuration specifying the data source type and parameters
 * @returns A new data source instance
 */
export function createDataSource(
	config: DataSourceConfig
): IProfilerDataSource {
	if (config instanceof SerialSourceConfig) {
		return new SerialDataSource(
			config.portPath,
			config.baudRate,
			config.lineOptions
		);
	} else if (config instanceof UsbSourceConfig) {
		return new UsbDataSource(config.device);
	}

	throw new Error(
		`Unknown data source type: ${JSON.stringify(config)}`
	);
}
