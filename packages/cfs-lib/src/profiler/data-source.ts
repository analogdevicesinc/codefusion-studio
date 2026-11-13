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
 * Listener signatures for the events emitted by a profiler data source,
 * grouped under a single export.
 */
export namespace ProfilerListeners {
	/**
	 * Listener invoked when data is received from the source.
	 * @param data - The data received from the source.
	 */
	export type OnData = (data: Buffer) => void;

	/**
	 * Listener invoked when an error occurs.
	 * @param error - The error that occurred.
	 */
	export type OnError = (error: Error) => void;

	/**
	 * Listener invoked when the underlying device disconnects.
	 */
	export type OnDisconnect = () => void;
}

/**
 * Interface for data sources that can be used by the profiler.
 * Implementations provide a unified way to receive data from
 * different hardware interfaces (serial, USB, etc.).
 */
export interface IProfilerDataSource {
	/**
	 * Opens the data source connection.
	 * @throws Error if the connection cannot be established
	 */
	open(): Promise<void>;

	/**
	 * Closes the data source connection.
	 */
	close(): Promise<void>;

	/**
	 * Prepares an opened source to deliver a stream a consumer can decode
	 * from its first byte.
	 */
	prime(): Promise<void>;

	/**
	 * Writes data to the source (if supported).
	 * @param data - Data to write
	 * @returns Promise resolving to the number of bytes written
	 */
	write(data: Buffer | string): Promise<number>;

	/**
	 * Returns whether the data source is currently open.
	 */
	readonly isOpen: boolean;

	/**
	 * Registers a listener invoked when data is received from the source.
	 * @param listener - Callback receiving the received data.
	 */
	onData(listener: ProfilerListeners.OnData): void;

	/**
	 * Registers a listener invoked when an error occurs.
	 * @param listener - Callback receiving the error.
	 */
	onError(listener: ProfilerListeners.OnError): void;

	/**
	 * Registers a listener invoked when the underlying device disconnects.
	 * @param listener - Callback invoked on disconnection.
	 */
	onDisconnect(listener: ProfilerListeners.OnDisconnect): void;

	/**
	 * Releases the resources held by the data source.
	 */
	dispose(): Promise<void>;
}
