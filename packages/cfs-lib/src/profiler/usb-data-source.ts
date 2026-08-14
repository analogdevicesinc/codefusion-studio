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
import {
	InEndpoint,
	OutEndpoint,
	type Device,
	type Interface
} from "usb";
import type { IProfilerDataSource } from "./data-source.js";

// Releasing the interface waits for the in-flight transfer cancellation
// to complete before its callback fires. If the device was physically
// disconnected, the backend can fail to ever deliver that completion,
// so close() would hang forever without this bound.
const RELEASE_TIMEOUT_MS = 1000;

/**
 * Data source implementation for native USB connections.
 */
export class UsbDataSource implements IProfilerDataSource {
	private readonly emitter = new EventEmitter();

	private usbInterface: Interface | undefined;

	/**
	 * @param device The USB device to capture from. The device is expected to
	 * be closed. Its lifecycle will be managed by {@link open} and {@link close}.
	 */
	constructor(private device: Device) {}

	get isOpen(): boolean {
		// node-usb uses the presence of `interfaces` to signal that the
		// device is open.
		return this.device.interfaces !== undefined;
	}

	onData(listener: (data: Buffer) => void): void {
		this.emitter.on("data", listener);
	}

	onError(listener: (error: Error) => void): void {
		this.emitter.on("error", listener);
	}

	open(): Promise<void> {
		if (this.isOpen) {
			return Promise.reject(new Error("USB device is already open"));
		}

		this.device.open();

		try {
			// Assume the trace interface is interface 0.
			// Matches the `west zpl-usb-capture` implementation.
			const usbInterface = this.device.interfaces?.[0];
			if (!usbInterface) {
				throw new Error("USB device exposes no interfaces");
			}
			usbInterface.claim();
			this.usbInterface = usbInterface;

			const inEndpoint = usbInterface.endpoints.find(
				(endpoint): endpoint is InEndpoint =>
					endpoint instanceof InEndpoint
			);
			if (!inEndpoint) {
				throw new Error("USB device has no IN endpoint to read from");
			}

			inEndpoint.on("data", (data: Buffer) => {
				this.emitter.emit("data", data);
			});
			inEndpoint.on("error", (error: Error) => {
				this.emitError(error);
			});
			inEndpoint.startPoll();

			return Promise.resolve();
		} catch (error) {
			const failure =
				error instanceof Error ? error : new Error(String(error));

			// Clean-up the partially-initialized state before rejecting the promise.
			// If closing itself fails, ignore the error and reject with the original
			// failure.
			return this.close()
				.catch(() => undefined)
				.then(() => Promise.reject(failure));
		}
	}

	async close(): Promise<void> {
		if (!this.isOpen) {
			return;
		}

		const usbInterface = this.usbInterface;

		// Releasing with `closeEndpoints: true` stops the endpoint poll and
		// waits for pending transfers to cancel before releasing. Raced
		// against a timeout so a disconnected device that never delivers
		// that completion can't hang this indefinitely.
		if (usbInterface) {
			const releasing = new Promise<void>((resolve, reject) => {
				usbInterface.release(true, (error) => {
					if (error) {
						reject(error);
					} else {
						resolve();
					}
				});
			});

			// If the timeout below wins the race, `releasing` is left
			// pending and may still reject later - swallow that so it
			// doesn't surface as an unhandled rejection.
			releasing.catch(() => undefined);

			await Promise.race([
				releasing,
				new Promise<void>((resolve) => {
					setTimeout(resolve, RELEASE_TIMEOUT_MS);
				})
			]);

			this.usbInterface = undefined;
		}

		try {
			this.device.close();
		} catch {
			// The device may already be gone, or the release above timed
			// out without actually completing - nothing more to clean up.
		}
	}

	write(data: Buffer | string): Promise<number> {
		const usbInterface = this.usbInterface;
		if (!this.isOpen || !usbInterface) {
			return Promise.reject(new Error("USB device is not open"));
		}

		const outEndpoint = usbInterface.endpoints.find(
			(endpoint): endpoint is OutEndpoint =>
				endpoint instanceof OutEndpoint
		);
		if (!outEndpoint) {
			return Promise.reject(
				new Error("USB device has no OUT endpoint to write to")
			);
		}

		const buffer =
			typeof data === "string" ? Buffer.from(data) : data;

		return new Promise((resolve, reject) => {
			outEndpoint.transfer(buffer, (error) => {
				if (error) {
					reject(error);
				} else {
					resolve(buffer.length);
				}
			});
		});
	}

	async dispose(): Promise<void> {
		try {
			await this.close();
		} catch (error) {
			console.debug("Error during USB data source disposal:", error);
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
