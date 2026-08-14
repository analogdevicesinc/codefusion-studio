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

import { EventEmitter } from "node:events";
import { SerialPort } from "serialport";
import type { IProfilerDataSource } from "./data-source.js";

/**
 * Data source implementation for serial port connections.
 */
export class SerialDataSource implements IProfilerDataSource {
	private readonly serialPort: SerialPort;

	private readonly emitter = new EventEmitter();

	constructor(
		private readonly portPath: string,
		private readonly baudRate: number
	) {
		this.serialPort = new SerialPort({
			path: this.portPath,
			baudRate: this.baudRate,
			autoOpen: false
		});

		this.serialPort.on("data", (data: Buffer) => {
			this.emitter.emit("data", data);
		});

		this.serialPort.on("error", (error: Error) => {
			this.emitError(error);
		});
	}

	get isOpen(): boolean {
		return this.serialPort.isOpen;
	}

	onData(listener: (data: Buffer) => void): void {
		this.emitter.on("data", listener);
	}

	onError(listener: (error: Error) => void): void {
		this.emitter.on("error", listener);
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

	async dispose(): Promise<void> {
		try {
			await this.close();
		} catch (error) {
			console.debug(
				"Error closing serial port during dispose. Error:",
				error
			);
		} finally {
			this.emitter.removeAllListeners();
		}
	}

	/**
	 * Emits an error event, guarding against Node's default behaviour of
	 * throwing when an `"error"` event has no listeners.
	 * @param error - The error to emit.
	 */
	private emitError(error: Error): void {
		if (this.emitter.listenerCount("error") > 0) {
			this.emitter.emit("error", error);
		}
	}
}
