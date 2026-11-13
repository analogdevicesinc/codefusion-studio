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

import { SerialPort } from "serialport";
import { ProfilerDataSourceBase } from "./data-source-base.js";
import type { SerialLineOptions } from "./serial-port-settings.js";

/**
 * Data source implementation for serial port connections.
 */
export class SerialDataSource extends ProfilerDataSourceBase {
	private readonly serialPort: SerialPort;

	/**
	 * @param portPath - Serial port path (e.g. '/dev/ttyUSB0' or 'COM3').
	 * @param baudRate - Baud rate for the serial connection.
	 * @param lineOptions - Optional data bits, parity and stop bits.
	 */
	constructor(
		private readonly portPath: string,
		private readonly baudRate: number,
		lineOptions: SerialLineOptions = {}
	) {
		super();

		this.serialPort = new SerialPort({
			path: this.portPath,
			baudRate: this.baudRate,
			...lineOptions,
			autoOpen: false
		});

		this.serialPort.on("data", (data: Buffer) => {
			this.emitData(data);
		});

		this.serialPort.on("error", (error: Error) => {
			this.emitError(error);
		});

		// serialport emits `close` with a `err.disconnected == true` object
		// to indicate that a disconnection happened.
		this.serialPort.on(
			"close",
			(error?: { disconnected?: boolean }) => {
				if (error?.disconnected) {
					this.emitDisconnect();
				}
			}
		);
	}

	get isOpen(): boolean {
		return this.serialPort.isOpen;
	}

	async open(): Promise<void> {
		if (this.isOpen) {
			throw new Error("Serial port is already open");
		}

		await new Promise<void>((resolve, reject) => {
			this.serialPort.open((error) => {
				if (error) {
					reject(error);
				} else {
					resolve();
				}
			});
		});
	}

	async close(): Promise<void> {
		if (!this.isOpen) {
			return;
		}

		await new Promise<void>((resolve) => {
			this.serialPort.close((error) => {
				if (error) {
					this.emitError(error);
				}
				resolve();
			});
		});
	}

	async write(data: Buffer | string): Promise<number> {
		if (!this.isOpen) {
			throw new Error("Serial port is not open");
		}

		const buffer =
			typeof data === "string" ? Buffer.from(data) : data;

		return new Promise((resolve, reject) => {
			this.serialPort.write(buffer, (error) => {
				if (error) {
					reject(error);
				} else {
					this.serialPort.drain((drainError) => {
						if (drainError) {
							reject(drainError);
						} else {
							resolve(buffer.length);
						}
					});
				}
			});
		});
	}
}
