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

import {
	InEndpoint,
	OutEndpoint,
	usb,
	type Device,
	type Interface
} from "usb";
import { ProfilerDataSourceBase } from "./data-source-base.js";
import {
	CTF_TRACE_START_TAG,
	DISABLE_COMMAND,
	ENABLE_COMMAND
} from "./tracing-protocol.js";

// Releasing the interface waits for the in-flight transfer cancellation
// to complete before its callback fires. If the device was physically
// disconnected, the backend can fail to ever deliver that completion,
// so close() would hang forever without this bound.
const RELEASE_TIMEOUT_MS = 1000;

// How long to keep discarding the stream after the stop command while
// priming.
const PRIME_DRAIN_MS = 1000;

/**
 * Data source implementation for native USB connections.
 */
export class UsbDataSource extends ProfilerDataSourceBase {
	private usbInterface: Interface | undefined;

	/** While true, device data is discarded rather than emitted. */
	private priming = false;

	/**
	 * Handler for node-usb hotplug `detach` events. Emits a disconnect when
	 * the detached device is the one this source is bound to. Devices are
	 * matched by bus number and address rather than reference, since the
	 * `Device` delivered with a `detach` event is not guaranteed to be the
	 * same instance passed to the constructor.
	 */
	private readonly onDetach = (device: Device): void => {
		if (
			device.busNumber === this.device.busNumber &&
			device.deviceAddress === this.device.deviceAddress
		) {
			this.emitDisconnect();
		}
	};

	/**
	 * @param device The USB device to capture from. The device is expected to
	 * be closed. Its lifecycle will be managed by {@link open} and {@link close}.
	 */
	constructor(private device: Device) {
		super();
	}

	get isOpen(): boolean {
		// node-usb uses the presence of `interfaces` to signal that the
		// device is open.
		return this.device.interfaces !== undefined;
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
				// Drop data before the start tag.
				if (!this.priming) {
					this.emitData(data);
				}
			});
			inEndpoint.on("error", (error: Error) => {
				this.emitError(error);
			});
			inEndpoint.startPoll();

			usb.on("detach", this.onDetach);

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

		usb.removeListener("detach", this.onDetach);

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

	/**
	 * Restarts the device stream on a packet boundary and emits the CTF
	 * start tag ahead of it.
	 */
	override async prime(): Promise<void> {
		this.priming = true;
		try {
			await this.write(DISABLE_COMMAND);
			await new Promise((resolve) =>
				setTimeout(resolve, PRIME_DRAIN_MS)
			);

			this.emitData(CTF_TRACE_START_TAG);
		} finally {
			this.priming = false;
		}

		await this.write(ENABLE_COMMAND);
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
}
